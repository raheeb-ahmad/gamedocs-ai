'use client'

import { useState, useRef, useEffect } from 'react'

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

const SUGGESTIONS = [
  'What is the core game loop?',
  'Who is the main character?',
  'What are the key mechanics?',
  'What is the win condition?',
]

export default function Home() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [uploading, setUploading] = useState(false)
  const [querying, setQuerying] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([])
  const [dots, setDots] = useState('.')
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, querying])

  useEffect(() => {
    if (!querying) return
    const interval = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 400)
    return () => clearInterval(interval)
  }, [querying])

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
        setUploadStatus(`✓ ${data.chunks} chunks indexed`)
        setUploadedDocs(prev => [...prev, file.name])
      } else {
        setUploadStatus(`✗ ${data.error}`)
      }
    } catch {
      setUploadStatus('✗ Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleQuery() {
    if (!question.trim() || querying) return
    const userMessage: Message = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])
    setQuestion('')
    setQuerying(true)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-password': password },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || data.error,
        sources: data.sources,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '✗ Query failed' }])
    } finally {
      setQuerying(false)
    }
  }

  // PASSWORD SCREEN
  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Courier New", monospace',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,255,100,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,100,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div style={{
          position: 'relative',
          border: '1px solid rgba(0,255,100,0.3)',
          padding: '48px',
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(0,255,100,0.02)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ color: 'rgba(0,255,100,0.5)', fontSize: '11px', marginBottom: '24px', letterSpacing: '3px' }}>
            GAMEDOCS.AI // v1.0.0
          </div>
          <h1 style={{
            color: '#fff',
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '8px',
            letterSpacing: '-0.5px',
            fontFamily: 'Georgia, serif',
          }}>
            Your Game&apos;s Brain.
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '13px',
            marginBottom: '32px',
            lineHeight: 1.6,
          }}>
            Ask anything about your GDD, changelogs, and design notes.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="password"
              placeholder="enter access code_"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(0,255,100,0.4)',
                color: '#00ff64',
                padding: '12px 0',
                fontFamily: '"Courier New", monospace',
                fontSize: '14px',
                outline: 'none',
                letterSpacing: '2px',
              }}
            />
            {authError && (
              <div style={{ color: '#ff4444', fontSize: '11px', letterSpacing: '2px' }}>
                ✗ ACCESS DENIED
              </div>
            )}
            <button
              onClick={handleAuth}
              style={{
                background: '#00ff64',
                color: '#0a0a0a',
                border: 'none',
                padding: '12px',
                fontFamily: '"Courier New", monospace',
                fontWeight: '700',
                fontSize: '13px',
                letterSpacing: '3px',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              INITIALIZE →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // MAIN APP
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Courier New", monospace',
      position: 'relative',
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,255,100,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,100,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* HEADER */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#00ff64', fontSize: '11px', letterSpacing: '3px' }}>●</span>
              <span style={{ color: '#fff', fontWeight: '700', fontSize: '15px', fontFamily: 'Georgia, serif' }}>
                GameDocs AI
              </span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '2px', marginTop: '2px' }}>
              ASK YOUR GAME&apos;S BRAIN
            </div>
          </div>

          {uploadedDocs.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {uploadedDocs.map((doc, i) => (
                <span key={i} style={{
                  background: 'rgba(0,255,100,0.08)',
                  border: '1px solid rgba(0,255,100,0.2)',
                  color: '#00ff64',
                  fontSize: '10px',
                  padding: '3px 8px',
                  letterSpacing: '1px',
                  maxWidth: '160px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {doc}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {uploadStatus && (
            <span style={{
              fontSize: '11px',
              color: uploadStatus.startsWith('✓') ? '#00ff64' : '#ff4444',
              letterSpacing: '1px',
            }}>
              {uploadStatus}
            </span>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              background: uploading ? 'transparent' : '#00ff64',
              color: uploading ? '#00ff64' : '#0a0a0a',
              border: '1px solid #00ff64',
              padding: '8px 16px',
              fontFamily: '"Courier New", monospace',
              fontWeight: '700',
              fontSize: '11px',
              letterSpacing: '2px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? 'INDEXING...' : '+ UPLOAD DOC'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.md,.txt" onChange={handleUpload} style={{ display: 'none' }} />
        </div>
      </header>

      {/* CHAT AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', maxWidth: '800px', width: '100%', margin: '0 auto' }}>

        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '80px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
            <h2 style={{
              color: '#fff',
              fontSize: '22px',
              fontFamily: 'Georgia, serif',
              fontWeight: '400',
              marginBottom: '8px',
            }}>
              Upload a doc. Ask anything.
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '13px',
              marginBottom: '40px',
              lineHeight: 1.7,
            }}>
              Your GDD, changelogs, and design notes — all queryable.<br />
              Answers grounded in your actual documents.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '360px', margin: '0 auto' }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setQuestion(s)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    padding: '10px 16px',
                    fontFamily: '"Courier New", monospace',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    letterSpacing: '0.5px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,255,100,0.3)'
                    e.currentTarget.style.color = '#00ff64'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                  }}
                >
                  → {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>
                {msg.role === 'user' ? 'YOU' : 'GAMEDOCS'}
              </div>

              <div style={{
                maxWidth: '680px',
                padding: '16px 20px',
                background: msg.role === 'user' ? 'rgba(0,255,100,0.06)' : 'rgba(255,255,255,0.03)',
                border: msg.role === 'user' ? '1px solid rgba(0,255,100,0.2)' : '1px solid rgba(255,255,255,0.06)',
                color: msg.role === 'user' ? '#00ff64' : '#ffffff',
                fontSize: '14px',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
                letterSpacing: msg.role === 'user' ? '0.5px' : '0',
                fontFamily: msg.role === 'assistant' ? 'Georgia, serif' : '"Courier New", monospace',
              }}>
                {msg.content}
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '680px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>SOURCES</div>
                  {msg.sources.map((src, j) => (
                    <div key={j} style={{
                      border: '1px solid rgba(255,255,255,0.05)',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.02)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#00ff64', fontSize: '11px', letterSpacing: '1px' }}>{src.docName}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                          {Math.round((src.score || 0) * 100)}% match
                        </span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', lineHeight: 1.5 }}>
                        {src.preview}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {querying && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>GAMEDOCS</div>
              <div style={{
                padding: '16px 20px',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.03)',
                color: '#00ff64',
                fontSize: '13px',
                letterSpacing: '2px',
              }}>
                SEARCHING{dots}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* INPUT */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px',
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: 'rgba(0,255,100,0.5)', fontSize: '14px' }}>›</span>
          <input
            type="text"
            placeholder="ask your game's brain..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuery()}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              color: '#ffffff',
              fontFamily: '"Courier New", monospace',
              fontSize: '14px',
              padding: '8px 0',
              outline: 'none',
              letterSpacing: '0.5px',
            }}
          />
          <button
            onClick={handleQuery}
            disabled={querying || !question.trim()}
            style={{
              background: querying || !question.trim() ? 'transparent' : '#00ff64',
              color: querying || !question.trim() ? 'rgba(255,255,255,0.3)' : '#0a0a0a',
              border: '1px solid',
              borderColor: querying || !question.trim() ? 'rgba(255,255,255,0.1)' : '#00ff64',
              padding: '8px 20px',
              fontFamily: '"Courier New", monospace',
              fontWeight: '700',
              fontSize: '11px',
              letterSpacing: '2px',
              cursor: querying || !question.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            RUN →
          </button>
        </div>
      </div>
    </div>
  )
}