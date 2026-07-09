'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

type WorkshopSession = {
  id: string
  employeeCode?: string | null
  name: string
  designation?: string | null
  department?: string | null
  mobile?: string | null
}

type WorkshopMechanic = {
  id: string
  employee_id: string | null
  mechanic_name: string
  mobile: string | null
  role: string | null
}

type JobCard = {
  id: string
  job_no: string | null
  vehicle_no_snapshot: string | null
  trailer_no_snapshot: string | null
  driver_name_snapshot: string | null
  driver_mobile_snapshot: string | null
  job_type: string
  priority: string
  status: string
  dispatch_status?: string | null
  accepted_at?: string | null
  accepted_by?: string | null
  assigned_mechanic_id: string | null
  assigned_mechanic_name: string | null
  complaint_description: string | null
  breakdown_gps_map_link: string | null
  breakdown_latitude: number | null
  breakdown_longitude: number | null
  journey_started_at: string | null
  journey_started_lat: number | null
  journey_started_lng: number | null
  arrived_at: string | null
  arrived_lat: number | null
  arrived_lng: number | null
  repair_started_at: string | null
  repair_completed_at: string | null
  mechanic_completion_notes: string | null
  mechanic_voice_note_url?: string | null
  mechanic_voice_note_uploaded_at?: string | null
  mechanic_voice_note_uploaded_by?: string | null
  last_mechanic_lat?: number | null
  last_mechanic_lng?: number | null
  last_mechanic_gps_link?: string | null
  last_mechanic_gps_at?: string | null
  mobile_last_action?: string | null
  mobile_last_action_at?: string | null
  opened_at: string
}

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

function gpsMapLink(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return null
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS not supported on this device.'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    })
  })
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

async function uploadFileToStorage({
  file,
  folder,
}: {
  file: File | Blob
  folder: string
}) {
  const extension =
    file instanceof File
      ? file.name.split('.').pop() || 'jpg'
      : 'webm'

  const path = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`

  const uploadRes = await supabase.storage
    .from('trip-documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadRes.error) {
    throw new Error(uploadRes.error.message)
  }

  return supabase.storage.from('trip-documents').getPublicUrl(path).data
    .publicUrl
}

export default function WorkshopMobilePage() {
  const [staff, setStaff] = useState<WorkshopSession | null>(null)
  const [mechanic, setMechanic] = useState<WorkshopMechanic | null>(null)
  const [jobs, setJobs] = useState<JobCard[]>([])
  const [selected, setSelected] = useState<JobCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [photos, setPhotos] = useState<RepairPhoto[]>([])
  const [photoWorking, setPhotoWorking] = useState(false)
  const [photoRemarks, setPhotoRemarks] = useState('')
  const [photoStage, setPhotoStage] = useState<RepairPhotoStage>('Before')
  const [recording, setRecording] = useState(false)
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [voicePreviewUrl, setVoicePreviewUrl] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const savedStaff = localStorage.getItem('pgt_workshop_staff')

    if (!savedStaff) {
      window.location.href = '/workshop-login'
      return
    }

    const parsed = JSON.parse(savedStaff) as WorkshopSession
    setStaff(parsed)
    loadMechanicAndJobs(parsed)
  }, [])

  async function loadMechanicAndJobs(session: WorkshopSession) {
    setLoading(true)

    const { data, error } = await supabase
      .from('workshop_mechanics')
      .select('id, employee_id, mechanic_name, mobile, role')
      .eq('employee_id', session.id)
      .maybeSingle()

    if (error) {
      setLoading(false)
      alert(error.message)
      return
    }

    if (!data) {
      setLoading(false)
      alert(
        'Workshop staff is not linked with workshop_mechanics. Please sync employee to workshop staff master.'
      )
      return
    }

    const linkedMechanic = data as WorkshopMechanic
    setMechanic(linkedMechanic)
    await loadJobs(linkedMechanic.id)
  }

  async function loadJobs(mechanicId = mechanic?.id) {
    if (!mechanicId) return

    setLoading(true)

    const { data, error } = await supabase
      .from('workshop_job_cards')
      .select(`
        id,
        job_no,
        vehicle_no_snapshot,
        trailer_no_snapshot,
        driver_name_snapshot,
        driver_mobile_snapshot,
        job_type,
        priority,
        status,
        dispatch_status,
        accepted_at,
        accepted_by,
        assigned_mechanic_id,
        assigned_mechanic_name,
        complaint_description,
        breakdown_gps_map_link,
        breakdown_latitude,
        breakdown_longitude,
        journey_started_at,
        journey_started_lat,
        journey_started_lng,
        arrived_at,
        arrived_lat,
        arrived_lng,
        repair_started_at,
        repair_completed_at,
        mechanic_completion_notes,
        mechanic_voice_note_url,
        mechanic_voice_note_uploaded_at,
        mechanic_voice_note_uploaded_by,
        last_mechanic_lat,
        last_mechanic_lng,
        last_mechanic_gps_link,
        last_mechanic_gps_at,
        mobile_last_action,
        mobile_last_action_at,
        opened_at
      `)
      .eq('assigned_mechanic_id', mechanicId)
      .in('status', ['Assigned', 'In Progress', 'Parts Required', 'Completed'])
      .order('opened_at', { ascending: false })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setJobs((data || []) as JobCard[])
  }

  async function loadRepairPhotos(jobId: string) {
    const { data, error } = await supabase
      .from('workshop_repair_photos')
      .select('*')
      .eq('job_card_id', jobId)
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setPhotos((data || []) as RepairPhoto[])
  }

  function logout() {
    localStorage.removeItem('pgt_workshop_staff')
    window.location.href = '/workshop-login'
  }

  async function openJob(job: JobCard) {
    setSelected(job)
    setCompletionNotes(job.mechanic_completion_notes || '')
    setVoiceBlob(null)
    setVoicePreviewUrl('')
    await loadRepairPhotos(job.id)
  }

  async function createSupervisorNotification(job: JobCard, title: string, message: string) {
    await supabase.from('workshop_notifications').insert([
      {
        job_card_id: job.id,
        notification_to: 'Workshop Supervisor',
        notification_type: 'Workshop Job Update',
        title,
        message,
      },
    ])
  }

  async function acceptJob(job: JobCard) {
    if (!staff || !mechanic) return

    setWorking(true)

    const updateData = {
      dispatch_status: 'Accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: staff.id,
      mobile_last_action: 'Accepted',
      mobile_last_action_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('workshop_job_cards')
      .update(updateData)
      .eq('id', job.id)

    if (updateError) {
      setWorking(false)
      alert(updateError.message)
      return
    }

    const { error: logError } = await supabase
      .from('workshop_job_location_logs')
      .insert([
        {
          job_card_id: job.id,
          mechanic_id: mechanic.id,
          event_type: 'Location Update',
          remarks: 'Job accepted by workshop staff.',
        },
      ])

    setWorking(false)

    if (logError) {
      alert(logError.message)
      return
    }

    await createSupervisorNotification(
      job,
      'Job Accepted',
      `${staff.name} accepted job ${job.job_no || ''} for vehicle ${job.vehicle_no_snapshot || ''}.`
    )

    await loadJobs(mechanic.id)
    setSelected({ ...job, ...updateData })
  }

  async function saveLocationEvent(
    job: JobCard,
    eventType:
      | 'Journey Started'
      | 'Location Update'
      | 'Arrived'
      | 'Repair Started'
      | 'Repair Completed',
    patch: Record<string, any>
  ) {
    if (!staff || !mechanic) return

    setWorking(true)

    try {
      const position = await getCurrentPosition()
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      const link = gpsMapLink(latitude, longitude)

      const updateData = {
        ...patch,
        last_mechanic_lat: latitude,
        last_mechanic_lng: longitude,
        last_mechanic_gps_link: link,
        last_mechanic_gps_at: new Date().toISOString(),
        mobile_last_action: eventType,
        mobile_last_action_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('workshop_job_cards')
        .update(updateData)
        .eq('id', job.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      const { error: logError } = await supabase
        .from('workshop_job_location_logs')
        .insert([
          {
            job_card_id: job.id,
            mechanic_id: mechanic.id,
            event_type: eventType,
            latitude,
            longitude,
            gps_map_link: link,
            remarks: completionNotes.trim() || null,
          },
        ])

      if (logError) {
        throw new Error(logError.message)
      }

      await loadJobs(mechanic.id)

      setSelected({
        ...job,
        ...updateData,
      })
    } catch (error: any) {
      alert(error.message || 'GPS update failed')
    } finally {
      setWorking(false)
    }
  }

  async function startJourney(job: JobCard) {
    const position = await getCurrentPosition().catch((error) => {
      alert(error.message || 'GPS failed')
      return null
    })

    if (!position || !mechanic) return

    setWorking(true)

    const latitude = position.coords.latitude
    const longitude = position.coords.longitude
    const link = gpsMapLink(latitude, longitude)

    const updateData = {
      status: 'In Progress',
      dispatch_status: 'Travelling',
      journey_started_at: new Date().toISOString(),
      journey_started_lat: latitude,
      journey_started_lng: longitude,
      last_mechanic_lat: latitude,
      last_mechanic_lng: longitude,
      last_mechanic_gps_link: link,
      last_mechanic_gps_at: new Date().toISOString(),
      mobile_last_action: 'Journey Started',
      mobile_last_action_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('workshop_job_cards')
      .update(updateData)
      .eq('id', job.id)

    if (updateError) {
      setWorking(false)
      alert(updateError.message)
      return
    }

    const { error: logError } = await supabase
      .from('workshop_job_location_logs')
      .insert([
        {
          job_card_id: job.id,
          mechanic_id: mechanic.id,
          event_type: 'Journey Started',
          latitude,
          longitude,
          gps_map_link: link,
          remarks: 'Journey started by workshop staff.',
        },
      ])

    setWorking(false)

    if (logError) {
      alert(logError.message)
      return
    }

    await loadJobs(mechanic.id)
    setSelected({ ...job, ...updateData })
  }

  async function markArrived(job: JobCard) {
    const position = await getCurrentPosition().catch((error) => {
      alert(error.message || 'GPS failed')
      return null
    })

    if (!position || !mechanic) return

    setWorking(true)

    const latitude = position.coords.latitude
    const longitude = position.coords.longitude
    const link = gpsMapLink(latitude, longitude)

    const updateData = {
      dispatch_status: 'Arrived',
      arrived_at: new Date().toISOString(),
      arrived_lat: latitude,
      arrived_lng: longitude,
      last_mechanic_lat: latitude,
      last_mechanic_lng: longitude,
      last_mechanic_gps_link: link,
      last_mechanic_gps_at: new Date().toISOString(),
      mobile_last_action: 'Arrived',
      mobile_last_action_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('workshop_job_cards')
      .update(updateData)
      .eq('id', job.id)

    if (updateError) {
      setWorking(false)
      alert(updateError.message)
      return
    }

    const { error: logError } = await supabase
      .from('workshop_job_location_logs')
      .insert([
        {
          job_card_id: job.id,
          mechanic_id: mechanic.id,
          event_type: 'Arrived',
          latitude,
          longitude,
          gps_map_link: link,
          remarks: 'Arrived at breakdown location.',
        },
      ])

    setWorking(false)

    if (logError) {
      alert(logError.message)
      return
    }

    await loadJobs(mechanic.id)
    setSelected({ ...job, ...updateData })
  }

  async function startRepair(job: JobCard) {
    await saveLocationEvent(job, 'Repair Started', {
      repair_started_at: new Date().toISOString(),
      status: 'In Progress',
      dispatch_status: 'Repair Started',
    })
  }

  async function waitingParts(job: JobCard) {
    if (!mechanic) return

    setWorking(true)

    const updateData = {
      status: 'Parts Required',
      dispatch_status: 'Waiting Parts',
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('workshop_job_cards')
      .update(updateData)
      .eq('id', job.id)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    await loadJobs(mechanic.id)
    setSelected({ ...job, ...updateData })
  }

  async function uploadRepairPhoto(file: File, stage: RepairPhotoStage) {
    if (!selected || !staff) return

    const currentStageCount = photos.filter(
      (photo) => photo.photo_stage === stage
    ).length

    if ((stage === 'Before' || stage === 'After') && currentStageCount >= 3) {
      alert(`${stage} photos maximum 3 allowed.`)
      return
    }

    setPhotoWorking(true)

    try {
      const photoUrl = await uploadFileToStorage({
        file,
        folder: `workshop-repair-photos/${selected.id}/${stage.toLowerCase()}`,
      })

      const { error } = await supabase.from('workshop_repair_photos').insert([
        {
          job_card_id: selected.id,
          photo_stage: stage,
          photo_url: photoUrl,
          remarks: photoRemarks.trim() || null,
          uploaded_by: staff.name || 'Workshop Staff',
        },
      ])

      if (error) {
        throw new Error(error.message)
      }

      setPhotoRemarks('')
      await loadRepairPhotos(selected.id)
    } catch (error: any) {
      alert(error.message || 'Photo upload failed')
    } finally {
      setPhotoWorking(false)
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)

      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setVoiceBlob(blob)
        setVoicePreviewUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      alert('Microphone permission is required to record voice note.')
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) return
    mediaRecorderRef.current.stop()
    setRecording(false)
  }

  async function uploadVoiceReport(job: JobCard) {
    if (!voiceBlob || !staff) return job.mechanic_voice_note_url || null

    const voiceUrl = await uploadFileToStorage({
      file: voiceBlob,
      folder: `workshop-voice-reports/${job.id}`,
    })

    const { error } = await supabase
      .from('workshop_job_cards')
      .update({
        mechanic_voice_note_url: voiceUrl,
        mechanic_voice_note_uploaded_at: new Date().toISOString(),
        mechanic_voice_note_uploaded_by: staff.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    if (error) {
      throw new Error(error.message)
    }

    return voiceUrl
  }

  async function completeRepair(job: JobCard) {
    const beforeCount = photos.filter((photo) => photo.photo_stage === 'Before')
      .length
    const afterCount = photos.filter((photo) => photo.photo_stage === 'After')
      .length
    const hasNotes = Boolean(completionNotes.trim())
    const hasVoice = Boolean(voiceBlob || job.mechanic_voice_note_url)

    if (beforeCount < 1) {
      alert('At least 1 Before Repair photo is required.')
      return
    }

    if (afterCount < 1) {
      alert('At least 1 After Repair photo is required.')
      return
    }

    if (!hasNotes && !hasVoice) {
      alert('Please write notes or record a voice report before completing job.')
      return
    }

    setWorking(true)

    try {
      const voiceUrl = await uploadVoiceReport(job)

      await saveLocationEvent(
        {
          ...job,
          mechanic_voice_note_url: voiceUrl,
        },
        'Repair Completed',
        {
          repair_completed_at: new Date().toISOString(),
          status: 'Completed',
          dispatch_status: 'Completed',
          supervisor_status: 'Under Review',
          submitted_to_supervisor_at: new Date().toISOString(),
          mechanic_completion_notes: completionNotes.trim() || null,
          mechanic_voice_note_url: voiceUrl,
        }
      )

      await createSupervisorNotification(
        job,
        'Job Submitted to Supervisor',
        `${staff?.name || 'Workshop staff'} submitted job ${job.job_no || ''} for supervisor review.`
      )
    } catch (error: any) {
      alert(error.message || 'Complete repair failed')
    } finally {
      setWorking(false)
    }
  }

  function nextActionLabel(job: JobCard) {
    const dispatchStatus = job.dispatch_status || 'Pending'

    if (dispatchStatus === 'Pending') return 'Accept Job'
    if (dispatchStatus === 'Accepted') return 'Start Journey'
    if (dispatchStatus === 'Travelling') return 'Mark Arrived'
    if (dispatchStatus === 'Arrived') return 'Start Repair'
    if (dispatchStatus === 'Repair Started') return 'Submit to Supervisor'
    if (dispatchStatus === 'Waiting Parts') return 'Waiting Parts'
    return 'Work Update'
  }

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      assigned: jobs.filter((job) => job.status === 'Assigned').length,
      inProgress: jobs.filter((job) => job.status === 'In Progress').length,
      completed: jobs.filter((job) => job.status === 'Completed').length,
    }
  }, [jobs])

  const photoCounts = useMemo(() => {
    return {
      Before: photos.filter((photo) => photo.photo_stage === 'Before').length,
      During: photos.filter((photo) => photo.photo_stage === 'During').length,
      After: photos.filter((photo) => photo.photo_stage === 'After').length,
    }
  }, [photos])

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <section className="mx-auto max-w-md">
        <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">
                PGT Workshop App
              </p>

              <h1 className="mt-2 text-2xl font-black">
                {staff?.name || 'Workshop Staff'}
              </h1>

              <p className="mt-1 text-sm text-slate-300">
                {staff?.designation || staff?.department || 'Workshop'} • Assigned repair jobs
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-2xl bg-red-600 px-4 py-2 text-xs font-black text-white"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          <Kpi title="Total" value={stats.total} />
          <Kpi title="Assigned" value={stats.assigned} />
          <Kpi title="Working" value={stats.inProgress} />
          <Kpi title="Done" value={stats.completed} />
        </div>

        <button
          onClick={() => loadJobs()}
          className="mt-4 h-12 w-full rounded-2xl bg-slate-900 font-black text-white"
        >
          Refresh Jobs
        </button>

        <section className="mt-4 space-y-4">
          {loading ? (
            <div className="rounded-3xl bg-white p-6 text-center font-bold text-slate-500 shadow-lg">
              Loading assigned jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 text-center font-bold text-slate-500 shadow-lg">
              No assigned jobs found.
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="rounded-3xl bg-white p-5 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      {job.job_no || 'Workshop Job'}
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-slate-900">
                      {job.vehicle_no_snapshot || '-'}
                    </h2>

                    <p className="text-sm font-semibold text-slate-500">
                      Trailer {job.trailer_no_snapshot || '-'} • {job.job_type}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
                      {job.priority}
                    </span>
                    <p className="mt-2 text-xs font-black text-slate-500">
                      {job.dispatch_status || 'Pending'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Breakdown Complaint
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {job.complaint_description || '-'}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Info title="Status" value={job.status} />
                  <Info title="Driver" value={job.driver_name_snapshot || '-'} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {job.breakdown_gps_map_link ? (
                    <a
                      href={job.breakdown_gps_map_link}
                      target="_blank"
                      className="rounded-2xl bg-blue-900 px-4 py-3 text-center text-sm font-black text-white"
                    >
                      Open Location
                    </a>
                  ) : (
                    <button className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-400">
                      No GPS
                    </button>
                  )}

                  <button
                    onClick={() => openJob(job)}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white"
                  >
                    {nextActionLabel(job)}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {selected && (
          <section className="fixed inset-0 z-50 overflow-auto bg-slate-950/70 p-4">
            <div className="mx-auto max-w-md rounded-3xl bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.20em] text-orange-600">
                    Work Update
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    {selected.vehicle_no_snapshot || '-'}
                  </h2>
                  <p className="text-sm font-semibold text-slate-500">
                    {selected.job_no || '-'}
                  </p>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <Info title="Status" value={selected.status} />
                <Info title="Dispatch" value={selected.dispatch_status || 'Pending'} />
                <Info title="Supervisor" value={(selected as any).supervisor_status || 'Pending'} />
                {(selected as any).returned_reason ? (
                  <Info title="Return Reason" value={(selected as any).returned_reason} />
                ) : null}
                <Info title="Accepted" value={formatDateTime(selected.accepted_at || null)} />
                <Info
                  title="Journey Started"
                  value={formatDateTime(selected.journey_started_at)}
                />
                <Info title="Arrived" value={formatDateTime(selected.arrived_at)} />
                <Info
                  title="Repair Started"
                  value={formatDateTime(selected.repair_started_at)}
                />
                <Info
                  title="Repair Completed"
                  value={formatDateTime(selected.repair_completed_at)}
                />
              </div>

              {selected.breakdown_gps_map_link ? (
                <a
                  href={selected.breakdown_gps_map_link}
                  target="_blank"
                  className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-blue-900 font-black text-white"
                >
                  Open Breakdown Location
                </a>
              ) : null}

              <section className="mt-4 rounded-3xl border border-slate-200 p-4">
                <h3 className="text-lg font-black text-slate-900">
                  Current Job Progress
                </h3>

                <div className="mt-3 grid gap-2">
                  {[
                    'Pending',
                    'Accepted',
                    'Travelling',
                    'Arrived',
                    'Repair Started',
                    'Completed',
                  ].map((step) => {
                    const current = selected.dispatch_status || 'Pending'
                    const active = current === step

                    return (
                      <div
                        key={step}
                        className={`rounded-2xl px-4 py-3 text-sm font-black ${
                          active
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {active ? '● ' : '○ '}
                        {step}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Last Action
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {selected.mobile_last_action || '-'}
                  </p>
                  <p className="text-xs font-semibold text-slate-400">
                    {formatDateTime(selected.mobile_last_action_at || null)}
                  </p>
                </div>

                {selected.last_mechanic_gps_link ? (
                  <a
                    href={selected.last_mechanic_gps_link}
                    target="_blank"
                    className="mt-3 flex h-11 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white"
                  >
                    Open My Last GPS
                  </a>
                ) : null}
              </section>

              {(selected.dispatch_status === 'Arrived' ||
                selected.dispatch_status === 'Repair Started' ||
                selected.dispatch_status === 'Waiting Parts' ||
                selected.dispatch_status === 'Completed') && (
                <section className="mt-5 rounded-3xl border border-slate-200 p-4">
                  <h3 className="text-lg font-black text-slate-900">
                    Repair Photos
                  </h3>

                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Before: min 1 / max 3 • After: min 1 / max 3 • During optional
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <PhotoCounter title="Before" value={photoCounts.Before} />
                    <PhotoCounter title="During" value={photoCounts.During} />
                    <PhotoCounter title="After" value={photoCounts.After} />
                  </div>

                  <select
                    value={photoStage}
                    onChange={(event) =>
                      setPhotoStage(event.target.value as RepairPhotoStage)
                    }
                    className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-blue-500"
                  >
                    <option value="Before">Before Repair</option>
                    <option value="During">During Repair</option>
                    <option value="After">After Repair</option>
                  </select>

                  <input
                    value={photoRemarks}
                    onChange={(event) => setPhotoRemarks(event.target.value)}
                    placeholder="Photo remarks"
                    className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-blue-500"
                  />

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="flex h-12 cursor-pointer items-center justify-center rounded-2xl bg-blue-700 text-sm font-black text-white">
                      📷 Take Photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            uploadRepairPhoto(file, photoStage)
                            event.target.value = ''
                          }
                        }}
                        disabled={photoWorking}
                        className="hidden"
                      />
                    </label>

                    <label className="flex h-12 cursor-pointer items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                      🖼 Gallery
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            uploadRepairPhoto(file, photoStage)
                            event.target.value = ''
                          }
                        }}
                        disabled={photoWorking}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {photos.slice(0, 6).map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.photo_url}
                        target="_blank"
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                      >
                        <img
                          src={photo.photo_url}
                          alt={`${photo.photo_stage} repair`}
                          className="h-36 w-full object-cover"
                        />
                        <div className="p-3">
                          <p className="text-xs font-black text-slate-500">
                            {photo.photo_stage} •{' '}
                            {new Date(photo.created_at).toLocaleString()}
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-700">
                            {photo.remarks || '-'}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              <section className="mt-5 rounded-3xl border border-slate-200 p-4">
                <h3 className="text-lg font-black text-slate-900">
                  Completion Report
                </h3>

                <textarea
                  value={completionNotes}
                  onChange={(event) => setCompletionNotes(event.target.value)}
                  rows={4}
                  placeholder="Work notes / completion remarks..."
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-orange-500"
                />

                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Voice Report
                  </p>

                  {voicePreviewUrl ? (
                    <audio controls src={voicePreviewUrl} className="mt-2 w-full" />
                  ) : selected.mechanic_voice_note_url ? (
                    <audio
                      controls
                      src={selected.mechanic_voice_note_url}
                      className="mt-2 w-full"
                    />
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      No voice report recorded yet.
                    </p>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {!recording ? (
                      <button
                        onClick={startRecording}
                        className="h-11 rounded-2xl bg-red-600 font-black text-white"
                      >
                        🎤 Start
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="h-11 rounded-2xl bg-slate-900 font-black text-white"
                      >
                        ⏹ Stop
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setVoiceBlob(null)
                        setVoicePreviewUrl('')
                      }}
                      className="h-11 rounded-2xl bg-slate-200 font-black text-slate-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </section>

              <div className="mt-4 grid gap-3">
                {(!selected.dispatch_status || selected.dispatch_status === 'Pending') && (
                  <button
                    onClick={() => acceptJob(selected)}
                    disabled={working}
                    className="h-12 rounded-2xl bg-emerald-600 font-black text-white disabled:opacity-60"
                  >
                    Accept Job
                  </button>
                )}

                {selected.dispatch_status === 'Accepted' && (
                  <button
                    onClick={() => startJourney(selected)}
                    disabled={working}
                    className="h-12 rounded-2xl bg-blue-700 font-black text-white disabled:opacity-60"
                  >
                    Start Journey
                  </button>
                )}

                {selected.dispatch_status === 'Travelling' && (
                  <button
                    onClick={() => markArrived(selected)}
                    disabled={working}
                    className="h-12 rounded-2xl bg-purple-700 font-black text-white disabled:opacity-60"
                  >
                    Mark Arrived
                  </button>
                )}

                {selected.dispatch_status === 'Arrived' && (
                  <button
                    onClick={() => startRepair(selected)}
                    disabled={working}
                    className="h-12 rounded-2xl bg-orange-600 font-black text-white disabled:opacity-60"
                  >
                    Start Repair
                  </button>
                )}

                {selected.dispatch_status === 'Repair Started' && (
                  <>
                    <button
                      onClick={() => waitingParts(selected)}
                      disabled={working}
                      className="h-12 rounded-2xl bg-amber-600 font-black text-white disabled:opacity-60"
                    >
                      Waiting Parts
                    </button>

                    <button
                      onClick={() => completeRepair(selected)}
                      disabled={working}
                      className="h-12 rounded-2xl bg-emerald-600 font-black text-white disabled:opacity-60"
                    >
                      Submit to Supervisor
                    </button>
                  </>
                )}

                {selected.dispatch_status === 'Waiting Parts' && (
                  <button
                    onClick={() => completeRepair(selected)}
                    disabled={working}
                    className="h-12 rounded-2xl bg-emerald-600 font-black text-white disabled:opacity-60"
                  >
                    Submit to Supervisor
                  </button>
                )}

                {selected.dispatch_status === 'Completed' && (
                  <div className="rounded-2xl bg-emerald-50 p-4 text-center font-black text-emerald-700">
                    Job submitted. Waiting for supervisor review.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow">
      <p className="text-[10px] font-black uppercase text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  )
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase text-slate-400">{title}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  )
}


function PhotoCounter({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-[10px] font-black uppercase text-slate-400">{title}</p>
      <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
    </div>
  )
}
