'use client'

import { useState, useRef } from 'react'
import { Paperclip, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDiscovery } from '@/lib/discovery-store'

export function FileUploadButton() {
  const { projectId, sendMessage, isStreaming } = useDiscovery()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadStatus(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Upload failed (${res.status})`)
      }

      const data = await res.json()
      setUploadStatus({
        type: 'success',
        message: `${file.name} (${data.extractedWords} words extracted)`,
      })

      // Send a brief notification to the chat so Pilot immediately processes the new file
      await sendMessage(
        `[Attached Document: ${file.name}]. Please review the newly uploaded file text in your context and let me know your thoughts or any missing gaps.`
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not upload file'
      setUploadStatus({ type: 'error', message: msg })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx,.csv"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading || isStreaming}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || isStreaming}
        className="h-8 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        title="Attach existing specs, notes, or PDF document"
      >
        {isUploading ? (
          <>
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Extracting PDF...</span>
          </>
        ) : (
          <>
            <Paperclip className="size-3.5" />
            <span>Attach Spec / PDF</span>
          </>
        )}
      </Button>

      {uploadStatus && (
        <span className="flex items-center gap-1 font-mono text-[10px] tracking-wide">
          {uploadStatus.type === 'success' ? (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="size-3 shrink-0" />
              {uploadStatus.message}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="size-3 shrink-0" />
              {uploadStatus.message}
            </span>
          )}
        </span>
      )}
    </div>
  )
}
