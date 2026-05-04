import { NextRequest, NextResponse } from 'next/server'
import { embedText } from '@/lib/embeddings'
import { index } from '@/lib/pinecone'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json()
    if (!question) return NextResponse.json({ error: 'No question provided' }, { status: 400 })

    // Embed the question
    const questionEmbedding = await embedText(question)

    // Retrieve top 5 relevant chunks from Pinecone
    const results = await index.query({
      vector: questionEmbedding,
      topK: 5,
      includeMetadata: true,
    })

    if (!results.matches.length) {
      return NextResponse.json({ answer: 'No relevant content found in your documents.', sources: [] })
    }

    // Build context from retrieved chunks
    const context = results.matches
      .map((m, i) => `[Source ${i + 1} — ${m.metadata?.docName}]\n${m.metadata?.text}`)
      .join('\n\n')

    const sources = results.matches.map(m => ({
      docName: m.metadata?.docName,
      score: m.score,
      preview: (m.metadata?.text as string)?.slice(0, 150) + '...',
    }))

    // Ask Claude with the retrieved context
    const message = await anthropic.messages.create({
      // With this:
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a helpful assistant for game developers. Answer the question based ONLY on the provided context from the game's documents. Always mention which source your answer comes from.

Context:
${context}

Question: ${question}`,
        },
      ],
    })

    const answer = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ answer, sources })
  } catch (err) {
    console.error('Query error:', err)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }
}