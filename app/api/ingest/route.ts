import { NextRequest, NextResponse } from 'next/server'
import { extractText } from '@/lib/extract'
import { chunkText } from '@/lib/chunker'
import { embedBatch } from '@/lib/embeddings'
import { index } from '@/lib/pinecone'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await extractText(buffer, file.name)
    const chunks = chunkText(text, file.name)

    // Embed in batches of 50
    const batchSize = 50
    const vectors = []

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const embeddings = await embedBatch(batch.map(c => c.text))

      for (let j = 0; j < batch.length; j++) {
        vectors.push({
          id: `${file.name}-chunk-${i + j}`,
          values: embeddings[j],
          metadata: {
            text: batch[j].text,
            docName: file.name,
            chunkIndex: i + j,
          },
        })
      }
    }

    // Upsert to Pinecone in batches of 100
    for (let i = 0; i < vectors.length; i += 100) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await index.upsert(vectors.slice(i, i + 100) as any)
    }

    return NextResponse.json({
      success: true,
      docName: file.name,
      chunks: chunks.length,
    })
  } catch (err) {
    console.error('Ingest error:', err)
    return NextResponse.json({ error: 'Ingest failed' }, { status: 500 })
  }
}