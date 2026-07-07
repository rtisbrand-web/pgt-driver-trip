'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { uploadWorkshopRepairPhoto } from '../../../lib/workshop/photoUpload'

type RepairPhotoStage = 'Before' | 'During' | 'After'

type RepairPhoto = {
  id: string
  job_card_id: string
  photo_stage: RepairPhotoStage
  photo_url: string
  remarks: string | null
  uploaded_by: string | null
  created_at: string
}

const STAGES: RepairPhotoStage[] = ['Before', 'During', 'After']

export default function RepairPhotoSection({
  jobCardId,
  uploadedBy,
}: {
  jobCardId: string
  uploadedBy: string
}) {
  const [photos, setPhotos] = useState<RepairPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [stage, setStage] = useState<RepairPhotoStage>('Before')
  const [file, setFile] = useState<File | null>(null)
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    loadPhotos()
  }, [jobCardId])

  async function loadPhotos() {
    setLoading(true)

    const { data, error } = await supabase
      .from('workshop_repair_photos')
      .select('*')
      .eq('job_card_id', jobCardId)
      .order('created_at', { ascending: false })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setPhotos((data || []) as RepairPhoto[])
  }

  async function uploadPhoto() {
    if (!file) {
      alert('Please select a photo.')
      return
    }

    setWorking(true)

    try {
      const photoUrl = await uploadWorkshopRepairPhoto({
        file,
        jobCardId,
        stage,
      })

      const { error } = await supabase.from('workshop_repair_photos').insert([
        {
          job_card_id: jobCardId,
          photo_stage: stage,
          photo_url: photoUrl,
          remarks: remarks.trim() || null,
          uploaded_by: uploadedBy || 'Admin',
        },
      ])

      if (error) {
        throw new Error(error.message)
      }

      setFile(null)
      setRemarks('')
      await loadPhotos()
    } catch (error: any) {
      alert(error.message || 'Photo upload failed')
    } finally {
      setWorking(false)
    }
  }

  async function deletePhoto(photoId: string) {
    if (!confirm('Delete this repair photo?')) {
      return
    }

    setWorking(true)

    const { error } = await supabase
      .from('workshop_repair_photos')
      .delete()
      .eq('id', photoId)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    await loadPhotos()
  }

  const grouped = useMemo(() => {
    return {
      Before: photos.filter((photo) => photo.photo_stage === 'Before'),
      During: photos.filter((photo) => photo.photo_stage === 'During'),
      After: photos.filter((photo) => photo.photo_stage === 'After'),
    }
  }, [photos])

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900">
            Repair Photos
          </h3>
          <p className="text-sm font-semibold text-slate-500">
            Upload before, during and after repair photos for workshop evidence.
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right">
          <p className="text-xs font-bold uppercase text-blue-500">
            Total Photos
          </p>
          <p className="text-xl font-black text-blue-700">{photos.length}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <select
          value={stage}
          onChange={(event) => setStage(event.target.value as RepairPhotoStage)}
          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-blue-500"
        >
          {STAGES.map((item) => (
            <option key={item} value={item}>
              {item} Repair
            </option>
          ))}
        </select>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 md:col-span-2"
        />

        <input
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          placeholder="Photo remarks"
          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-blue-500"
        />

        <button
          onClick={uploadPhoto}
          disabled={working}
          className="h-12 rounded-2xl bg-blue-700 px-5 font-black text-white disabled:opacity-60"
        >
          Upload
        </button>
      </div>

      {file ? (
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Selected: {file.name}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center font-bold text-slate-500">
          Loading repair photos...
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {STAGES.map((item) => (
            <div key={item} className="rounded-3xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg font-black text-slate-900">
                  {item} Repair
                </h4>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                  {grouped[item].length}
                </span>
              </div>

              <div className="grid gap-3">
                {grouped[item].map((photo) => (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <a href={photo.photo_url} target="_blank">
                      <img
                        src={photo.photo_url}
                        alt={`${photo.photo_stage} repair photo`}
                        className="h-44 w-full object-cover"
                      />
                    </a>

                    <div className="p-3">
                      <p className="text-xs font-semibold text-slate-400">
                        {new Date(photo.created_at).toLocaleString()}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {photo.remarks || '-'}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-400">
                          By: {photo.uploaded_by || '-'}
                        </span>

                        <button
                          onClick={() => deletePhoto(photo.id)}
                          disabled={working}
                          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {grouped[item].length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400">
                    No {item.toLowerCase()} photos yet.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
