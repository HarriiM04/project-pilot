import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 10

/**
 * GET /api/proposals/[id]/pdf
 * Redirects to a short-lived presigned URL for the proposal's PDF
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Look up the proposal to ensure it exists and the user has access
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id, project_id')
      .or(`id.eq.${id},project_id.eq.${id}`)
      .single()

    if (fetchError || !proposal) {
      return new NextResponse('Proposal not found', { status: 404 })
    }

    // Since we know the path is deterministic from project_id:
    const projectId = proposal.project_id || id
    const storagePath = `proposals/${projectId}/proposal.pdf`

    // Determine bucket based on the path or fallback (proposals vs discovery-uploads)
    // If we used fallback, we'd need to know. For simplicity, we can check path prefix
    // storeProposalPdf uses 'proposals/${projectId}/...'
    // Actually storeProposalPdf just uploads to 'proposals' bucket and returns path 'proposals/${projectId}/...'
    // Wait, Supabase storage path returned from upload doesn't contain the bucket name.
    // It returns 'proposals/[projectId]/proposal.pdf'.
    // Oh, my `storeProposalPdf` used `storagePath = proposals/${projectId}/${fileName}`!
    // And it uploaded to bucket `proposals`. So the path is `proposals/projectId/proposal.pdf`.
    
    // We can try to generate a signed URL from both possible buckets, or just parse it.
    // If the bucket was 'proposals', we use that.
    
    // Download the PDF from Supabase to serve directly
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('proposals')
      .download(storagePath)

    if (downloadError) {
      // Try fallback bucket just in case
      const fallback = await supabase.storage
        .from('discovery-uploads')
        .download(storagePath)
        
      if (fallback.error) {
        console.error('[PROPOSAL PDF] Failed to download PDF:', fallback.error)
        return new NextResponse('Failed to download secure PDF link', { status: 500 })
      }
      
      return new NextResponse(fallback.data, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Project-Proposal.pdf"`,
        }
      })
    }

    return new NextResponse(fileData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Project-Proposal.pdf"`,
      }
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[PROPOSAL PDF] Server error:', msg)
    return new NextResponse(msg, { status: 500 })
  }
}
