'use client'

import { ArrowUp, Bot, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileUploadButton } from '@/components/file-upload-button'
import { useDiscovery } from '@/lib/discovery-store'
import { cn } from '@/lib/utils'

export function DiscoveryChat() {
  const { messages, discovery, isStreaming, sendMessage } = useDiscovery()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    if (!input.trim() || isStreaming) return
    void sendMessage(input)
    setInput('')
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <section className="flex h-full flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="flex items-center gap-1.5">
          <Bot className="size-4 text-foreground" />
          <h2 className="text-sm font-semibold">AI Discovery Chat</h2>
        </div>

        {/* Live Completeness & Language Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] font-medium text-secondary-foreground">
            🌐 {discovery.domain && discovery.domain !== 'General Software' ? discovery.domain : 'Multilingual Auto'}
          </span>
          <span className={cn(
            "rounded-full px-2 py-0.5 font-mono text-[10px] font-medium",
            (discovery.overallCompletion || 0) >= 85
              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
              : "bg-primary/10 text-primary border border-primary/20"
          )}>
            Progress: {discovery.overallCompletion || 0}%
          </span>
        </div>

        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-muted-foreground">
          <span
            className={cn(
              'size-1.5 rounded-full',
              isStreaming ? 'bg-chart-1 animate-pulse' : 'bg-chart-1',
            )}
          />
          {isStreaming ? 'THINKING' : 'ONLINE'}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {messages.map((m, index) => (
          <div
            key={m.id}
            className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}
          >
            <div
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium',
                m.role === 'assistant'
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-primary text-primary-foreground',
              )}
            >
              {m.role === 'assistant' ? <Sparkles className="size-3.5" /> : 'AR'}
            </div>
            <div
              className={cn(
                'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                m.role === 'assistant'
                  ? 'rounded-tl-sm bg-card text-card-foreground ring-1 ring-border'
                  : 'rounded-tr-sm bg-primary text-primary-foreground',
              )}
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

              {/* Options rendered with the question on the latest assistant turn only */}
              {m.role === 'assistant' && index === messages.length - 1 && !isStreaming && m.options && m.options.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                  {m.options.map((option, optIdx) => (
                    <button
                      key={optIdx}
                      onClick={() => sendMessage(option)}
                      disabled={isStreaming}
                      className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <FileUploadButton />
          </div>
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Describe your software idea or ask a question..."
              className="max-h-32 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button
              size="icon-sm"
              onClick={submit}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
            >
              <ArrowUp />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] tracking-wide text-muted-foreground">
          AI Pre-Sales Assistant · Auto-generates specifications in real-time
        </p>
      </div>
    </section>
  )
}
