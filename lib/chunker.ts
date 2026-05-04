export interface TextChunk {
  text: string
  index: number
  docName: string
}

export function chunkText(text: string, docName: string, chunkSize = 500, overlap = 50): TextChunk[] {
  const words = text.split(/\s+/)
  const chunks: TextChunk[] = []
  let i = 0

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    if (chunk.trim().length > 0) {
      chunks.push({
        text: chunk,
        index: chunks.length,
        docName,
      })
    }
    i += chunkSize - overlap
  }

  return chunks
}