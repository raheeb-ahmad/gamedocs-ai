export async function embedText(text: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
      }),
    }
  )
  const data = await response.json()
  if (!response.ok) throw new Error(JSON.stringify(data))
  return data.embedding.values
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(texts.map(t => embedText(t)))
  return embeddings
}