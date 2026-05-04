'use client'

import { useState, useRef } from 'react'

const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || ''

interface Source {
  docName: string
  score: number
  preview: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

export default function Home() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [uploading, setUploading] = useState(false)
  const [querying, setQuerying] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  function handleAuth() {
    if (password === process.env.NEXT_PUBLIC_DEMO_PASSWORD) {
      setAuthed(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'x-demo-password': password },
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setUploadStatus(`✅ "${data.docName}" ingested — ${data.chunks} chunks stored`)
      } else {
        setUploadStatus(`❌ Error: ${data.error}`)
      }
    } catch {
      setUploadStatus('❌ Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleQuery() {
    if (!question.trim()) return

    const userMessage: Message = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])
    setQuestion('')
    setQuerying(true)

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-password': password,
        },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer || data.error,
        sources: data.sources,
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Query failed' }])
    } finally {
      setQuerying(false)
    }
  }

  // Password screen
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-4">
          <h1 className="text-white text-2xl font-bold text-center">🎮 GameDocs AI</h1>
          <p className="text-gray-400 text-sm text-center">Enter demo password to continue</p>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            className="bg-gray-800 text-white rounded-lg px-4 py-2 outline-none border border-gray-700 focus:border-indigo-500"
          />
          {authError && <p className="text-red-400 text-sm text-center">Wrong password</p>}
          <button
            onClick={handleAuth}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 font-semibold transition"
          >
            Enter
          </button>
        </div>
      </div>
    )
  }

  // Main app
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">🎮 GameDocs AI</h1>
          <p className="text-gray-400 text-xs">Ask your game&apos;s brain, not Google</p>
        </div>

        {/* Upload */}
        <div className="flex items-center gap-3">
          {uploadStatus && (
            <span className="text-xs text-gray-300 max-w-xs truncate">{uploadStatus}</span>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg px-4 py-2 font-medium transition"
          >
            {uploading ? 'Uploading...' : '+ Upload Doc'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.md,.txt"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 max-w-3xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center mt-20">
            <span className="text-5xl">🧠</span>
            <h2 className="text-xl font-semibold">Ask anything about your game</h2>
            <p className="text-gray-400 text-sm max-w-sm">
              Upload your GDD, changelogs, or design notes — then ask questions and get answers grounded in your actual documents.
            </p>
            <div className="flex flex-col gap-2 mt-4 w-full max-w-sm">
              {[
                'What is the core game loop?',
                'What did we decide about the economy system?',
                'What are the player progression milestones?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2 text-left transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`rounded-2xl px-4 py-3 max-w-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              {msg.content}
            </div>

            {/* Sources */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="flex flex-col gap-1 max-w-2xl w-full">
                <p className="text-xs text-gray-500 px-1">Sources</p>
                {msg.sources.map((src, j) => (
                  <div key={j} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400">
                    <span className="text-indigo-400 font-medium">{src.docName}</span>
                    <span className="ml-2 text-gray-600">score: {src.score?.toFixed(2)}</span>
                    <p className="mt-1 text-gray-500 line-clamp-2">{src.preview}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {querying && (
          <div className="flex items-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3 text-sm text-gray-400 animate-pulse">
              Searching your docs...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            placeholder="Ask about your game..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !querying && handleQuery()}
            className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-indigo-500 text-sm"
          />
          <button
            onClick={handleQuery}
            disabled={querying || !question.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-5 py-3 font-medium text-sm transition"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  )
}