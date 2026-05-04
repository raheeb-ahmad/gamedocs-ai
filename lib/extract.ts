import mammoth from 'mammoth'

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (ext === 'pdf') {
    const { extractText: extractPdfText } = await import('unpdf')
    const uint8Array = new Uint8Array(buffer)
    const { text } = await extractPdfText(uint8Array, { mergePages: true })
    return text
  }

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  if (ext === 'md' || ext === 'txt') {
    return buffer.toString('utf-8')
  }

  throw new Error(`Unsupported file type: ${ext}`)
}