'use client'

import { ArrowUp, Bot, Sparkles, Loader2, Paperclip, Mic, X } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useDiscovery } from '@/lib/discovery-store'
import { cn, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ── Upload icon button — always shows, chips appear above textarea ──────────
function UploadIconButton({
  onStage,
  isUploading,
}: {
  onStage: (f: File) => void
  isUploading: boolean
}) {
  const { isStreaming } = useDiscovery()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx,.csv,.xls,.xlsx,.ppt,.pptx,.html,.htm,.xml,.json,.jpg,.jpeg,.png,.gif,.webp,.svg"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onStage(f)
          if (fileRef.current) fileRef.current.value = ''
        }}
        className="hidden"
        disabled={isUploading || isStreaming}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={isUploading || isStreaming}
        title="Attach Spec / PDF"
        className="flex size-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:border-ring/40 hover:text-ring hover:bg-ring/5 disabled:opacity-40 cursor-pointer"
      >
        <Paperclip className="size-4" />
      </button>
    </>
  )
}

// ── Voice input button ────────────────────────────────────────────────────────
function VoiceButton({
  onTranscript, listening, setListening,
}: {
  onTranscript: (t: string) => void
  listening: boolean
  setListening: (v: boolean) => void
}) {
  const recRef = useRef<SpeechRecognition | null>(null)

  const startVoice = useCallback(() => {
    const SR = (window as typeof window & {
      SpeechRecognition?: typeof SpeechRecognition
      webkitSpeechRecognition?: typeof SpeechRecognition
    }).SpeechRecognition || (window as typeof window & {
      webkitSpeechRecognition?: typeof SpeechRecognition
    }).webkitSpeechRecognition
    if (!SR) return

    if (listening) { recRef.current?.stop(); setListening(false); return }

    const rec = new SR()
    recRef.current = rec
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[e.results.length - 1][0].transcript
      onTranscript(t)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    setListening(true)
    rec.start()
  }, [listening, onTranscript, setListening])

  return (
    <button
      type="button"
      onClick={startVoice}
      title={listening ? 'Stop recording' : 'Voice input'}
      className={cn(
        'relative flex size-9 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95',
        listening
          ? 'text-white shadow-lg'
          : 'border border-border text-muted-foreground hover:border-ring/40 hover:text-ring hover:bg-ring/5'
      )}
      style={listening ? {
        background: 'linear-gradient(135deg, #2d6ef5, #6b5ce7)',
        boxShadow: '0 4px 16px rgba(45,110,245,0.45)',
      } : {}}
    >
      {listening && (
        <>
          <span className="absolute inset-0 rounded-xl animate-ping opacity-30"
            style={{ background: 'linear-gradient(135deg, #2d6ef5, #6b5ce7)' }} />
          <span className="absolute -inset-1.5 rounded-2xl animate-ping opacity-15"
            style={{ background: 'linear-gradient(135deg, #2d6ef5, #6b5ce7)', animationDelay: '0.35s' }} />
        </>
      )}
      <Mic className="relative size-4" />
    </button>
  )
}

// ── Main Chat ──────────────────────────────────────────────────────────────────
export function DiscoveryChat() {
  const { messages, discovery, isStreaming, sendMessage, projectId } = useDiscovery()
  const [input, setInput] = useState('')
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userInitials, setUserInitials] = useState('ME')
  const [listening, setListening] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name  = (user.user_metadata?.full_name as string) ?? user.email ?? ''
        const email = user.email ?? ''
        setUserInitials(getInitials(name, email))
        
        supabase.from('profiles').select('is_admin').eq('id', user.id).single()
          .then(({ data }) => setIsAdmin(!!data?.is_admin))

        if (projectId) {
          supabase.from('projects').select('user_id').eq('id', projectId).single()
            .then(({ data }) => {
              if (data && data.user_id !== user.id) setIsReadOnly(true)
            })
        }
      }
    })
  }, [projectId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const submit = async () => {
    const hasText = input.trim()
    const hasFiles = stagedFiles.length > 0
    if ((!hasText && !hasFiles) || isStreaming) return

    if (hasFiles) {
      setIsUploading(true)
      const uploadedNames: string[] = []
      const failedNames: string[] = []

      for (const file of stagedFiles) {
        try {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('projectId', projectId)
          const res = await fetch('/api/upload', { method: 'POST', body: fd })
          if (!res.ok) throw new Error()
          uploadedNames.push(file.name)
        } catch {
          failedNames.push(file.name)
        }
      }

      const fileParts = uploadedNames.map(
        name => `[Attached Document: ${name}]. Please review the newly uploaded file text in your context and let me know your thoughts or any missing gaps.`
      )
      const combined = [hasText ? input.trim() : '', ...fileParts].filter(Boolean).join('\n\n')
      if (combined) await sendMessage(combined)
      if (failedNames.length) await sendMessage(`Failed to upload: ${failedNames.join(', ')}. Please try again.`)

      setStagedFiles([])
      setInput('')
      setIsUploading(false)
    } else if (hasText) {
      void sendMessage(input.trim())
      setInput('')
    }
  }

  const removeFile = (idx: number) => setStagedFiles(prev => prev.filter((_, i) => i !== idx))

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() }
  }

  const progress = discovery.overallCompletion || 0
  const canSubmit = (!!input.trim() || stagedFiles.length > 0) && !isStreaming && !isReadOnly && !isUploading

  return (
    <section className="flex h-full flex-col">

      {/* ── Header ── */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/60 px-4 backdrop-blur-sm dark:bg-background/80">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #2d6ef5, #6b5ce7)' }}>
            <Bot className="size-3.5 text-white" />
          </div>
          <h2 className="text-sm font-semibold">AI Discovery</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('trigger-summary-regen'))}
              disabled={isStreaming}
              className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/95 text-white disabled:opacity-60 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] mr-1"
            >
              <Sparkles className="size-3" />
              <span>Get Summary</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1">
            <div className="size-1.5 rounded-full" style={{ background: progress >= 85 ? '#22c55e' : '#2d6ef5' }} />
            <span className="font-mono text-[10px] font-semibold">{progress}%</span>
          </div>
          <span className={cn(
            'flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium',
            isStreaming ? 'border-ring/30 bg-ring/10 text-ring' : 'border-green-500/30 bg-green-500/10 text-green-500'
          )}>
            <span className={cn('size-1.5 rounded-full animate-pulse', isStreaming ? 'bg-ring' : 'bg-green-500')} />
            {isStreaming ? 'THINKING' : 'ONLINE'}
          </span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="chat-scroll flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.map((m, index) => (
          <div key={m.id} className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
            {m.role === 'assistant' ? (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg mt-1"
                style={{ background: 'linear-gradient(135deg, #2d6ef5, #6b5ce7)' }}>
                <Sparkles className="size-3.5 text-white" />
              </div>
            ) : (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg mt-1 font-mono text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1a2340, #2d6ef5)' }}>
                {userInitials}
              </div>
            )}
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
              m.role === 'assistant'
                ? 'rounded-tl-sm bg-muted/60 text-foreground ring-1 ring-border/60 backdrop-blur-sm'
                : 'rounded-tr-sm text-white',
            )}
              style={m.role === 'user' ? { background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 100%)' } : {}}
            >
              {m.content ? (
                <p className="whitespace-pre-wrap text-pretty">{m.content}</p>
              ) : (
                <span className="inline-flex gap-1 py-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </span>
              )}
              {m.role === 'assistant' && index === messages.length - 1 && !isStreaming && m.options && m.options.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                  {m.options.map((option, optIdx) => (
                    <button key={optIdx} onClick={() => sendMessage(option)} disabled={isStreaming}
                      className="rounded-full border border-ring/30 bg-ring/5 px-3 py-1.5 text-xs font-medium text-ring transition-all hover:bg-ring hover:text-white disabled:opacity-50 cursor-pointer">
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex items-center gap-2 pl-9">
            <Loader2 className="size-3.5 animate-spin text-ring" />
            <span className="text-xs text-muted-foreground">Pilot is thinking…</span>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-border/60 px-4 py-3">
        <div
          className={cn(
            'rounded-2xl border bg-background/80 backdrop-blur-sm transition-all duration-300',
            listening
              ? 'border-ring/50 ring-2 ring-ring/20'
              : 'focus-within:ring-2 focus-within:ring-ring/30 focus-within:border-ring/50 border-border'
          )}
          style={listening ? { boxShadow: '0 0 0 4px rgba(45,110,245,0.08), 0 4px 24px rgba(45,110,245,0.12)' } : {}}
        >
          {/* Recording bar */}
          {listening && (
            <div className="flex items-center gap-3 border-b border-ring/20 px-4 py-2.5 rounded-t-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(45,110,245,0.06) 0%, rgba(107,92,231,0.06) 100%)' }}>
              <div className="flex items-end gap-[2px] h-5">
                {[0.35, 0.65, 1, 0.75, 0.5, 0.9, 0.6, 0.4, 0.8, 0.55].map((h, i) => (
                  <div key={i} className="w-[3px] rounded-full" style={{
                    height: `${h * 100}%`,
                    background: 'linear-gradient(180deg, #2d6ef5, #6b5ce7)',
                    animation: 'soundBar 0.55s ease-in-out infinite alternate',
                    animationDelay: `${i * 0.07}s`,
                    transformOrigin: 'bottom',
                  }} />
                ))}
              </div>
              <span className="text-xs font-semibold tracking-wide"
                style={{ background: 'linear-gradient(135deg, #2d6ef5, #6b5ce7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Listening…
              </span>
              <div className="ml-auto flex items-center gap-1.5 rounded-full border border-ring/30 bg-background/80 px-2.5 py-0.5">
                <span className="size-1.5 rounded-full bg-ring animate-pulse" />
                <span className="font-mono text-[10px] font-bold text-ring tracking-widest">REC</span>
              </div>
            </div>
          )}

          {/* File chips above textarea */}
          {stagedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
              {stagedFiles.map((file, idx) => {
                const isImage = file.type.startsWith('image/')
                const previewUrl = isImage ? URL.createObjectURL(file) : null

                return isImage && previewUrl ? (
                  /* Image — thumbnail only, no filename, × overlaid */
                  <div key={idx} className="relative group size-12 shrink-0">
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="size-12 rounded-xl object-cover border border-ring/20 shadow-sm"
                      onLoad={() => URL.revokeObjectURL(previewUrl)}
                    />
                    {!isUploading && (
                      <button
                        onClick={() => removeFile(idx)}
                        type="button"
                        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="size-2.5" />
                      </button>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                        <Loader2 className="size-4 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Doc — chip with icon + filename */
                  <div key={idx}
                    className="flex items-center gap-1.5 rounded-xl border border-ring/30 px-2 py-1.5 text-ring shadow-sm"
                    style={{ background: 'linear-gradient(135deg, rgba(45,110,245,0.08), rgba(107,92,231,0.08))' }}
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: 'linear-gradient(135deg, #2d6ef5, #6b5ce7)' }}>
                      <Paperclip className="size-3 text-white" />
                    </div>
                    <span className="max-w-[120px] truncate font-mono text-[11px] font-semibold">{file.name}</span>
                    {isUploading
                      ? <Loader2 className="size-3 shrink-0 animate-spin" />
                      : (
                        <button onClick={() => removeFile(idx)} type="button"
                          className="shrink-0 rounded-full p-0.5 opacity-50 hover:opacity-100 hover:bg-ring/10 cursor-pointer transition-all">
                          <X className="size-3" />
                        </button>
                      )
                    }
                  </div>
                )
              })}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
            }}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={isReadOnly}
            placeholder={listening ? '' : isReadOnly ? 'Admin mode — read only view' : 'Describe your project idea…'}
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            style={{ minHeight: '44px', maxHeight: '128px' }}
          />

          {/* Bottom row */}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <UploadIconButton
                  onStage={f => setStagedFiles(prev => [...prev, f])}
                  isUploading={isUploading}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <VoiceButton
                  listening={listening}
                  setListening={setListening}
                  onTranscript={t => setInput(prev => prev ? prev + ' ' + t : t)}
                />
              )}
              <button
                onClick={() => void submit()}
                disabled={!canSubmit}
                aria-label="Send message"
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl transition-all cursor-pointer',
                  'disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95'
                )}
                style={canSubmit ? {
                  background: 'linear-gradient(135deg, #2d6ef5, #6b5ce7)',
                  boxShadow: '0 2px 12px rgba(45,110,245,0.4)',
                } : { background: 'var(--muted)' }}
              >
                {isUploading
                  ? <Loader2 className="size-4 animate-spin text-white" />
                  : <ArrowUp className={cn('size-4', canSubmit ? 'text-white' : 'text-muted-foreground')} />
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
