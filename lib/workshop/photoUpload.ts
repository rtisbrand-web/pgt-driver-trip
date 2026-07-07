import { supabase } from '../supabase'

export async function uploadWorkshopRepairPhoto({
  file,
  jobCardId,
  stage,
}: {
  file: File
  jobCardId: string
  stage: 'Before' | 'During' | 'After'
}) {
  const safeStage = stage.toLowerCase()
  const extension = file.name.split('.').pop() || 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
  const path = `workshop-repair-photos/${jobCardId}/${safeStage}/${fileName}`

  const uploadRes = await supabase.storage
    .from('trip-documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadRes.error) {
    throw new Error(uploadRes.error.message)
  }

  const publicUrl = supabase.storage
    .from('trip-documents')
    .getPublicUrl(path).data.publicUrl

  return publicUrl
}
