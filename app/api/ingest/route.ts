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

    console.log('File received:', file.name, 'size:', file.size)

    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await extractText(buffer, file.name)

    console.log('Extracted text length:', text.length)
    console.log('Text preview:', text.slice(0, 200))

    const chunks = chunkText(text, file.name)

    console.log('Total chunks:', chunks.length)

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No text could be extracted from this file' }, { status: 400 })
    }

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

    console.log('Total vectors:', vectors.length)

    // Replace with this:
    await index.upsert({
      records: vectors.map(v => ({
        id: v.id,
        values: v.values,
        metadata: v.metadata,
      }))
    } as any)

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