'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type SupervisorSession = {
  id: string
  name: string
  designation?: string | null
  department?: string | null
  mobile?: string | null
}

type Mechanic = {
  id: string
  employee_id: string | null
  mechanic_name: string
  mobile: string | null
  role: string | null
  is_active: boolean
}

type Breakdown = {
  id: string
  created_at: string
  driver_id: string | null
  vehicle_id: string | null
  trailer_id: string | null
  breakdown_type: string | null
  priority: string | null
  status: string | null
  description: string | null
  gps_map_link: string | null
  driver_name_snapshot?: string | null
  driver_mobile_snapshot?: string | null
  vehicle_no_snapshot?: string | null
  trailer_no_snapshot?: string | null
}

type Job = {
  id: string
  job_no: string | null
  breakdown_id: string | null
  vehicle_no_snapshot: string | null
  trailer_no_snapshot: string | null
  driver_name_snapshot: string | null
  driver_mobile_snapshot: string | null
  job_type: string
  priority: string
  status: string
  dispatch_status?: string | null
  supervisor_status?: string | null
  supervisor_name?: string | null
  supervisor_notes?: string | null
  supervisor_reviewed_at?: string | null
  returned_reason?: string | null
  submitted_to_supervisor_at?: string | null
  assigned_mechanic_id: string | null
  assigned_mechanic_name: string | null
  assigned_staff_mobile?: string | null
  complaint_description: string | null
  mechanic_completion_notes?: string | null
  mechanic_voice_note_url?: string | null
  breakdown_gps_map_link?: string | null
  total_cost: number | null
  opened_at: string
  accepted_at?: string | null
  journey_started_at?: string | null
  arrived_at?: string | null
  repair_started_at?: string | null
  repair_completed_at?: string | null
  closed_at?: string | null
}

type RepairPhoto = {
  id: string
  job_card_id: string
  photo_stage: 'Before' | 'During' | 'After'
  photo_url: string
  remarks: string | null
  uploaded_by: string | null
  created_at: string
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function money(value: number | null | undefined) {
  return `AED ${Number(value || 0).toFixed(2)}`
}

function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return '-'
  const diff = Math.max(0, new Date(end).getTime() - new Date(start).getTime())
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

export default function WorkshopSupervisorPage() {
  const [supervisor, setSupervisor] = useState<SupervisorSession | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([])
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [selected, setSelected] = useState<Job | null>(null)
  const [photos, setPhotos] = useState<RepairPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)

  const [dateFrom, setDateFrom] = useState(todayDate())
  const [dateTo, setDateTo] = useState(todayDate())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedMechanicId, setSelectedMechanicId] = useState('')
  const [supervisorNotes, setSupervisorNotes] = useState('')
  const [returnReason, setReturnReason] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('pgt_workshop_supervisor')

    if (!saved) {
      window.location.href = '/workshop-supervisor-login'
      return
    }

    const session = JSON.parse(saved)
    setSupervisor(session)
    loadData()
  }, [])

  async function loadData(fromDate = dateFrom, toDate = dateTo) {
    setLoading(true)

    let jobsQuery = supabase
      .from('workshop_job_cards_view')
      .select('*')
      .order('opened_at', { ascending: false })

    if (fromDate) jobsQuery = jobsQuery.gte('opened_at', `${fromDate}T00:00:00`)
    if (toDate) jobsQuery = jobsQuery.lte('opened_at', `${toDate}T23:59:59`)
    if (statusFilter) jobsQuery = jobsQuery.eq('supervisor_status', statusFilter)

    const [jobsRes, mechanicsRes, breakdownsRes] = await Promise.all([
      jobsQuery,
      supabase
        .from('workshop_mechanics')
        .select('*')
        .eq('is_active', true)
        .order('mechanic_name'),
      supabase
        .from('driver_breakdowns')
        .select(`
          id,
          created_at,
          driver_id,
          vehicle_id,
          trailer_id,
          breakdown_type,
          priority,
          status,
          description,
          gps_map_link,
          driver_name_snapshot,
          driver_mobile_snapshot,
          vehicle_no_snapshot,
          trailer_no_snapshot
        `)
        .in('status', ['Open', 'Assigned', 'In Progress', 'Workshop'])
        .order('created_at', { ascending: false }),
    ])

    setLoading(false)

    if (jobsRes.error) {
      alert(jobsRes.error.message)
      return
    }

    setJobs((jobsRes.data || []) as Job[])
    setMechanics((mechanicsRes.data || []) as Mechanic[])
    setBreakdowns((breakdownsRes.data || []) as Breakdown[])
  }

  async function createJobFromBreakdown(breakdownId: string) {
    setWorking(true)

    const { data, error } = await supabase.rpc(
      'create_workshop_job_from_breakdown',
      { p_breakdown_id: breakdownId }
    )

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    alert(`Workshop job created: ${data}`)
    await loadData()
  }

  async function openJob(job: Job) {
    setSelected(job)
    setSelectedMechanicId(job.assigned_mechanic_id || '')
    setSupervisorNotes(job.supervisor_notes || '')
    setReturnReason(job.returned_reason || '')

    const { data, error } = await supabase
      .from('workshop_repair_photos')
      .select('*')
      .eq('job_card_id', job.id)
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setPhotos((data || []) as RepairPhoto[])
  }

  async function refreshSelected(jobId: string) {
    const { data, error } = await supabase
      .from('workshop_job_cards_view')
      .select('*')
      .eq('id', jobId)
      .single()

    if (!error && data) {
      const updated = data as Job
      setSelected(updated)
      setJobs((prev) => prev.map((job) => (job.id === updated.id ? updated : job)))
    }
  }

  async function assignMechanic() {
    if (!selected) return

    const mechanic = mechanics.find((item) => item.id === selectedMechanicId)

    if (!mechanic) {
      alert('Please select workshop team member.')
      return
    }

    setWorking(true)

    const { error } = await supabase
      .from('workshop_job_cards')
      .update({
        assigned_mechanic_id: mechanic.id,
        assigned_mechanic_name: mechanic.mechanic_name,
        assigned_staff_mobile: mechanic.mobile,
        status: 'Assigned',
        dispatch_status: 'Pending',
        supervisor_status: 'Pending',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    await loadData()
    await refreshSelected(selected.id)
    alert('Job assigned to workshop team.')
    setSelected({
      ...selected,
      assigned_mechanic_id: mechanic.id,
      assigned_mechanic_name: mechanic.mechanic_name,
      assigned_staff_mobile: mechanic.mobile,
      status: 'Assigned',
      dispatch_status: 'Pending',
      supervisor_status: 'Pending',
    })
  }

  async function approveJob() {
    if (!selected || !supervisor) return

    if ((selected.dispatch_status || '') !== 'Completed') {
      alert('Mechanic must submit the job before approval.')
      return
    }

    setWorking(true)

    const { error } = await supabase
      .from('workshop_job_cards')
      .update({
        supervisor_status: 'Approved',
        supervisor_name: supervisor.name,
        supervisor_notes: supervisorNotes.trim() || null,
        supervisor_reviewed_at: new Date().toISOString(),
        dispatch_status: 'Completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    await loadData()
    await refreshSelected(selected.id)
    alert('Job approved by workshop supervisor.')
    setSelected({
      ...selected,
      supervisor_status: 'Approved',
      supervisor_name: supervisor.name,
      supervisor_notes: supervisorNotes.trim() || null,
      supervisor_reviewed_at: new Date().toISOString(),
      dispatch_status: 'Completed',
    })
  }

  async function returnJob() {
    if (!selected || !supervisor) return

    if (!returnReason.trim()) {
      alert('Return reason is required.')
      return
    }

    setWorking(true)

    const { error } = await supabase
      .from('workshop_job_cards')
      .update({
        supervisor_status: 'Returned',
        supervisor_name: supervisor.name,
        returned_reason: returnReason.trim(),
        supervisor_notes: supervisorNotes.trim() || null,
        supervisor_reviewed_at: new Date().toISOString(),
        dispatch_status: 'Repair Started',
        status: 'In Progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    await loadData()
    await refreshSelected(selected.id)
    alert('Job returned to workshop team.')
    setSelected({
      ...selected,
      supervisor_status: 'Returned',
      supervisor_name: supervisor.name,
      returned_reason: returnReason.trim(),
      supervisor_notes: supervisorNotes.trim() || null,
      supervisor_reviewed_at: new Date().toISOString(),
      dispatch_status: 'Repair Started',
      status: 'In Progress',
    })
  }

  async function closeJob() {
    if (!selected || !supervisor) return

    if (selected.supervisor_status !== 'Approved') {
      alert('Please approve job before closing.')
      return
    }

    setWorking(true)

    const { error } = await supabase
      .from('workshop_job_cards')
      .update({
        supervisor_status: 'Closed',
        supervisor_name: supervisor.name,
        supervisor_notes: supervisorNotes.trim() || null,
        status: 'Closed',
        dispatch_status: 'Closed',
        closed_at: new Date().toISOString(),
        vehicle_released_at: new Date().toISOString(),
        vehicle_released_by: supervisor.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    await loadData()
    await refreshSelected(selected.id)
    alert('Job closed and vehicle released.')
    setSelected({
      ...selected,
      supervisor_status: 'Closed',
      supervisor_name: supervisor.name,
      supervisor_notes: supervisorNotes.trim() || null,
      status: 'Closed',
      dispatch_status: 'Closed',
      closed_at: new Date().toISOString(),
    })
  }

  function logout() {
    localStorage.removeItem('pgt_workshop_supervisor')
    window.location.href = '/workshop-supervisor-login'
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const text = [
        job.job_no || '',
        job.vehicle_no_snapshot || '',
        job.trailer_no_snapshot || '',
        job.driver_name_snapshot || '',
        job.assigned_mechanic_name || '',
        job.status || '',
        job.dispatch_status || '',
        job.supervisor_status || '',
      ]
        .join(' ')
        .toLowerCase()

      return text.includes(search.toLowerCase())
    })
  }, [jobs, search])

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      pending: jobs.filter(
        (job) =>
          !job.supervisor_status ||
          job.supervisor_status === 'Pending' ||
          job.supervisor_status === 'Under Review'
      ).length,
      returned: jobs.filter((job) => job.supervisor_status === 'Returned')
        .length,
      approved: jobs.filter((job) => job.supervisor_status === 'Approved')
        .length,
      closed: jobs.filter((job) => job.supervisor_status === 'Closed').length,
      breakdowns: breakdowns.length,
    }
  }, [jobs, breakdowns])

  const photoCounts = useMemo(() => {
    return {
      before: photos.filter((photo) => photo.photo_stage === 'Before').length,
      during: photos.filter((photo) => photo.photo_stage === 'During').length,
      after: photos.filter((photo) => photo.photo_stage === 'After').length,
    }
  }, [photos])

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">
                Workshop Supervisor V2
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Supervisor Control Center
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                {supervisor?.name || 'Supervisor'} • Assign, review, return,
                approve and close workshop jobs.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => loadData()}
                className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
              >
                Refresh
              </button>

              <button
                onClick={logout}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-6">
          <Kpi title="Jobs" value={stats.total} />
          <Kpi title="Pending" value={stats.pending} yellow />
          <Kpi title="Returned" value={stats.returned} red />
          <Kpi title="Approved" value={stats.approved} green />
          <Kpi title="Closed" value={stats.closed} green />
          <Kpi title="Breakdowns" value={stats.breakdowns} red />
        </div>

        <div className="mt-5 rounded-3xl bg-white p-5 shadow-lg">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
            >
              <option value="">All Supervisor Status</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Returned">Returned</option>
              <option value="Approved">Approved</option>
              <option value="Closed">Closed</option>
            </select>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vehicle, job, mechanic..."
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
            />

            <button
              onClick={() => loadData(dateFrom, dateTo)}
              className="h-12 rounded-2xl bg-slate-950 px-5 font-black text-white"
            >
              Apply
            </button>
          </div>
        </div>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-lg lg:col-span-2">
            <h2 className="text-2xl font-black text-slate-900">
              Workshop Jobs
            </h2>

            <div className="mt-4 overflow-x-auto">
              {loading ? (
                <div className="rounded-2xl bg-slate-50 p-8 text-center font-bold text-slate-500">
                  Loading jobs...
                </div>
              ) : (
                <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-xs uppercase text-slate-600">
                      <th className="border p-3">Job</th>
                      <th className="border p-3">Vehicle</th>
                      <th className="border p-3">Mechanic</th>
                      <th className="border p-3">Dispatch</th>
                      <th className="border p-3">Supervisor</th>
                      <th className="border p-3">Duration</th>
                      <th className="border p-3">Cost</th>
                      <th className="border p-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredJobs.map((job) => (
                      <tr key={job.id}>
                        <td className="border p-3 font-black text-slate-900">
                          {job.job_no || '-'}
                          <p className="text-xs font-semibold text-slate-400">
                            {formatDateTime(job.opened_at)}
                          </p>
                        </td>

                        <td className="border p-3 font-black text-slate-900">
                          {job.vehicle_no_snapshot || '-'}
                          <p className="text-xs font-semibold text-slate-400">
                            Trailer: {job.trailer_no_snapshot || '-'}
                          </p>
                        </td>

                        <td className="border p-3 font-semibold text-slate-700">
                          {job.assigned_mechanic_name || '-'}
                        </td>

                        <td className="border p-3">
                          <StatusBadge value={job.dispatch_status || 'Pending'} />
                        </td>

                        <td className="border p-3">
                          <StatusBadge value={job.supervisor_status || 'Pending'} />
                        </td>

                        <td className="border p-3 font-black">
                          {minutesBetween(job.opened_at, job.repair_completed_at || job.closed_at)}
                        </td>

                        <td className="border p-3 font-black">
                          {money(job.total_cost)}
                        </td>

                        <td className="border p-3">
                          <button
                            onClick={() => openJob(job)}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-lg">
            <h2 className="text-2xl font-black text-slate-900">
              Breakdown Alerts
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Create workshop job cards from driver breakdown alerts.
            </p>

            <div className="mt-4 space-y-3">
              {breakdowns.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-black text-slate-900">
                    {item.vehicle_no_snapshot || item.vehicle_id || '-'}
                  </p>

                  <p className="text-sm font-semibold text-slate-500">
                    {item.breakdown_type || 'Breakdown'} •{' '}
                    {item.priority || 'Medium'}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {formatDateTime(item.created_at)}
                  </p>

                  <button
                    onClick={() => createJobFromBreakdown(item.id)}
                    disabled={working}
                    className="mt-3 h-10 w-full rounded-xl bg-orange-600 text-xs font-black text-white disabled:opacity-60"
                  >
                    Create Job Card
                  </button>
                </div>
              ))}

              {breakdowns.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
                  No open breakdown alerts.
                </div>
              )}
            </div>
          </div>
        </section>

        {selected && (
          <section className="fixed inset-0 z-50 overflow-auto bg-slate-950/70 p-4">
            <div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-600">
                    Supervisor Review
                  </p>

                  <h2 className="mt-2 text-3xl font-black text-slate-900">
                    {selected.job_no || 'Workshop Job'}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Vehicle {selected.vehicle_no_snapshot || '-'} • Mechanic{' '}
                    {selected.assigned_mechanic_name || '-'}
                  </p>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="rounded-2xl bg-slate-900 px-5 py-3 font-black text-white"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-5">
                <InfoBox title="Vehicle" value={selected.vehicle_no_snapshot || '-'} />
                <InfoBox title="Trailer" value={selected.trailer_no_snapshot || '-'} />
                <InfoBox title="Dispatch" value={selected.dispatch_status || 'Pending'} />
                <InfoBox title="Supervisor" value={selected.supervisor_status || 'Pending'} />
                <InfoBox title="Total Cost" value={money(selected.total_cost)} />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-5">
                <InfoBox title="Accepted" value={formatDateTime(selected.accepted_at)} />
                <InfoBox title="Journey" value={formatDateTime(selected.journey_started_at)} />
                <InfoBox title="Arrived" value={formatDateTime(selected.arrived_at)} />
                <InfoBox title="Repair Start" value={formatDateTime(selected.repair_started_at)} />
                <InfoBox title="Completed" value={formatDateTime(selected.repair_completed_at)} />
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                <h3 className="text-lg font-black text-slate-900">
                  Assign Workshop Team
                </h3>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <select
                    value={selectedMechanicId}
                    onChange={(event) => setSelectedMechanicId(event.target.value)}
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500 md:col-span-2"
                  >
                    <option value="">Select workshop team</option>
                    {mechanics.map((mechanic) => (
                      <option key={mechanic.id} value={mechanic.id}>
                        {mechanic.mechanic_name} - {mechanic.role || 'Workshop'}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={assignMechanic}
                    disabled={working}
                    className="h-12 rounded-2xl bg-orange-600 px-5 font-black text-white disabled:opacity-60"
                  >
                    Assign
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                <h3 className="text-lg font-black text-slate-900">
                  Complaint / Work Report
                </h3>

                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-600">
                  {selected.complaint_description || '-'}
                </p>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Mechanic Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-bold text-slate-700">
                    {selected.mechanic_completion_notes || '-'}
                  </p>
                </div>

                {selected.mechanic_voice_note_url ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Mechanic Voice Report
                    </p>
                    <audio controls src={selected.mechanic_voice_note_url} className="mt-2 w-full" />
                  </div>
                ) : null}
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-slate-900">
                    Repair Photos
                  </h3>

                  <div className="flex gap-2 text-xs font-black">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                      Before {photoCounts.before}
                    </span>
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                      During {photoCounts.during}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                      After {photoCounts.after}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {photos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photo.photo_url}
                      target="_blank"
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                    >
                      <img
                        src={photo.photo_url}
                        alt={`${photo.photo_stage} repair`}
                        className="h-44 w-full object-cover"
                      />

                      <div className="p-3">
                        <p className="text-xs font-black text-slate-500">
                          {photo.photo_stage} • {formatDateTime(photo.created_at)}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {photo.remarks || '-'}
                        </p>
                      </div>
                    </a>
                  ))}

                  {photos.length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-6 text-sm font-bold text-slate-500">
                      No photos uploaded yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                <h3 className="text-lg font-black text-slate-900">
                  Supervisor Decision
                </h3>

                <textarea
                  value={supervisorNotes}
                  onChange={(event) => setSupervisorNotes(event.target.value)}
                  rows={3}
                  placeholder="Supervisor notes..."
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-orange-500"
                />

                <textarea
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  rows={3}
                  placeholder="Return reason if job is incomplete..."
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-red-500"
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={approveJob}
                    disabled={working}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    Approve Job
                  </button>

                  <button
                    onClick={returnJob}
                    disabled={working}
                    className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    Return to Team
                  </button>

                  <button
                    onClick={closeJob}
                    disabled={working}
                    className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    Close / Release Vehicle
                  </button>

                  {selected.breakdown_gps_map_link ? (
                    <a
                      href={selected.breakdown_gps_map_link}
                      target="_blank"
                      className="rounded-2xl bg-blue-900 px-5 py-3 text-sm font-black text-white"
                    >
                      Open Breakdown GPS
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

function Kpi({
  title,
  value,
  green,
  red,
  yellow,
}: {
  title: string
  value: number
  green?: boolean
  red?: boolean
  yellow?: boolean
}) {
  return (
    <div className="rounded-3xl bg-white p-4 text-center shadow-lg">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <p
        className={`mt-2 text-3xl font-black ${
          green
            ? 'text-emerald-600'
            : red
              ? 'text-red-600'
              : yellow
                ? 'text-amber-600'
                : 'text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const lower = value.toLowerCase()

  const classes =
    lower === 'closed' || lower === 'approved' || lower === 'completed'
      ? 'bg-emerald-100 text-emerald-700'
      : lower === 'returned'
        ? 'bg-red-100 text-red-700'
        : lower === 'travelling' || lower === 'repair started'
          ? 'bg-blue-100 text-blue-700'
          : lower === 'waiting parts'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-slate-100 text-slate-700'

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}>
      {value}
    </span>
  )
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <p className="mt-2 truncate text-lg font-black text-slate-900">
        {value}
      </p>
    </div>
  )
}
