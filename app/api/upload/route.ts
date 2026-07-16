import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null

    if (!file || !projectId) {
      return new Response('Missing file or projectId parameter', { status: 400 })
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id, uploaded_docs')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return new Response('Forbidden — project not found', { status: 403 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    let extractedText = ''

    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        if (typeof global !== 'undefined' && typeof (global as any).DOMMatrix === 'undefined') {
          ;(global as any).DOMMatrix = class DOMMatrix {}
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse')
        const parsed = await pdfParse(buffer, { max: 0 })
        extractedText = parsed?.text || ''
      } catch (err: unknown) {
        console.warn('Primary pdf-parse failed, attempting fallback stream extraction:', err)
        try {
          // Fallback: Extract ASCII / UTF8 text strings and TJ/Tj operators directly from raw PDF streams
          const rawStr = buffer.toString('binary')
          const matches = rawStr.match(/\(([^\)\\]+(?:\\.[^\)\\]*)*)\)|\[(.*?)\]\s*TJ/g) || []
          const rawWords: string[] = []
          for (const m of matches) {
            const cleaned = m
              .replace(/^[\[\(]/, '')
              .replace(/[\]\)]\s*TJ?$/, '')
              .replace(/\\([nrtbf\(\)\\])/g, '$1')
              .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
              .trim()
            if (cleaned.length > 2 && /[a-zA-Z0-9]/.test(cleaned)) {
              rawWords.push(cleaned)
            }
          }
          extractedText = rawWords.join(' ')
        } catch {
          const msg = err instanceof Error ? err.message : 'Unknown PDF error'
          return new Response(`Could not parse text from PDF file (${msg}). Please try attaching a .txt or .docx file if the issue persists.`, { status: 422 })
        }
      }
    } else {
      // Treat as plain text / markdown / csv
      extractedText = buffer.toString('utf-8')
    }

    // Clean up excessive whitespace and cap snippet to 15,000 chars (~3,500 tokens)
    let cleanedSnippet = extractedText
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000)

    if (!cleanedSnippet && file.name.toLowerCase().endsWith('.pdf')) {
      // If pdfParse returned empty string without throwing, try direct regex extraction
      const rawStr = buffer.toString('binary')
      const matches = rawStr.match(/\(([^\)\\]+(?:\\.[^\)\\]*)*)\)|\[(.*?)\]\s*TJ/g) || []
      const rawWords: string[] = []
      for (const m of matches) {
        const cleaned = m
          .replace(/^[\[\(]/, '')
          .replace(/[\]\)]\s*TJ?$/, '')
          .replace(/\\([nrtbf\(\)\\])/g, '$1')
          .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
          .trim()
        if (cleaned.length > 2 && /[a-zA-Z0-9]/.test(cleaned)) {
          rawWords.push(cleaned)
        }
      }
      cleanedSnippet = rawWords.join(' ').replace(/\s+/g, ' ').trim().slice(0, 15000)
    }

    if (!cleanedSnippet) {
      return new Response('No readable text could be extracted from this document (the PDF may be scanned or image-only).', { status: 422 })
    }

    // Attempt Supabase storage upload if bucket exists (non-blocking fallback)
    let storagePath = `local-db/${Date.now()}-${file.name}`
    try {
      const uploadRes = await supabase.storage
        .from('discovery-uploads')
        .upload(`${user.id}/${projectId}/${Date.now()}-${file.name}`, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        })
      if (uploadRes.data?.path) {
        storagePath = uploadRes.data.path
      }
    } catch {
      // Bucket may not exist; continue saving snippet to DB safely
    }

    const newDocEntry = {
      filename: file.name,
      storage_path: storagePath,
      extracted_text_snippet: cleanedSnippet,
      uploaded_at: Date.now(),
    }

    const existingDocs = Array.isArray(project.uploaded_docs) ? project.uploaded_docs : []
    const updatedDocs = [...existingDocs, newDocEntry]

    await supabase
      .from('projects')
      .update({ uploaded_docs: updatedDocs })
      .eq('id', projectId)

    return new Response(
      JSON.stringify({
        success: true,
        filename: file.name,
        extractedWords: cleanedSnippet.split(/\s+/).length,
        uploadedDocs: updatedDocs,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload extraction failed'
    return new Response(msg, { status: 500 })
  }
}
