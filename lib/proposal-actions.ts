import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Stores the generated Proposal PDF buffer in Supabase Storage.
 * Retries with a fallback bucket if the primary one doesn't exist.
 */
export async function storeProposalPdf(
  supabase: SupabaseClient,
  pdfBuffer: Buffer,
  projectId: string,
  userId: string
): Promise<{ path: string; bucket: string }> {
  const fileName = `proposal.pdf`
  const storagePath = `proposals/${projectId}/${fileName}`

  let bucketName = 'proposals'

  // Attempt to upload to the 'proposals' bucket.
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) {
    console.warn(`[storeProposalPdf] Failed upload to 'proposals' bucket (${error.message}). Falling back to 'discovery-uploads'.`)
    bucketName = 'discovery-uploads'
    
    const fallbackResult = await supabase.storage
      .from(bucketName)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })
      
    if (fallbackResult.error) {
       throw new Error(`Failed to upload PDF to fallback bucket: ${fallbackResult.error.message}`)
    }
    
    return { path: fallbackResult.data.path, bucket: bucketName }
  }

  return { path: data.path, bucket: bucketName }
}

/**
 * Builds a dynamic WhatsApp deep link with a pre-filled, URL-encoded message.
 */
export function buildWhatsAppLink(
  clientName: string,
  projectName: string,
  agencyName: string
): string {
  const message = `Hello, I'm ${clientName} regarding the "${projectName}" project proposal.

We'd like to schedule a kickoff call to discuss the project and next steps.

Please let us know a convenient time.

Thank you
${agencyName}`
  
  return `https://wa.me/919265037415?text=${encodeURIComponent(message)}`
}
