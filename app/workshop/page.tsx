'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import RepairPhotoSection from './components/RepairPhotoSection'

type AdminSession = {
  name: string
  mobile: string
}

type Mechanic = {
  id: string
  mechanic_name: string
  mobile: string | null
  role: string | null
  is_active: boolean
}

type JobCard = {
  id: string
  job_no: string | null
  breakdown_id: string | null
  vehicle_id: string | null
  trailer_id: string | null
  driver_id: string | null
  vehicle_no_snapshot: string | null
  trailer_no_snapshot: string | null
  driver_name_snapshot: string | null
  driver_mobile_snapshot: string | null
  job_type: string
  priority: string
  status: string
  dispatch_status?: string | null
  accepted_at?: string | null
  journey_started_at?: string | null
  arrived_at?: string | null
  repair_started_at?: string | null
  repair_completed_at?: string | null
  assigned_mechanic_id: string | null
  assigned_mechanic_name: string | null
  mechanic_name?: string | null
  mechanic_mobile?: string | null
  complaint_description: string | null
  diagnosis_notes: string | null
  work_done_notes: string | null
  admin_notes: string | null
  labour_cost: number | null
  parts_cost: number | null
  other_cost: number | null
  total_cost: number | null
  breakdown_gps_map_link?: string | null
  breakdown_latitude?: number | null
  breakdown_longitude?: number | null
  assigned_staff_mobile?: string | null
  location_sent_status?: string | null
  location_sent_at?: string | null
  opened_at: string
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  closed_at: string | null
  created_by: string | null
  closed_by: string | null
  created_at: string
  updated_at: string
}

type BreakdownRecord = {
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

type PartUsed = {
  id: string
  job_card_id: string
  part_name: string
  part_no: string | null
  qty: number
  unit_cost: number
  total_cost: number
  supplier_name: string | null
  old_part_location: string | null
  remarks: string | null
  created_at: string
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

function money(value: number | null | undefined) {
  return `AED ${Number(value || 0).toFixed(2)}`
}

function normalizeStatus(status: string | null | undefined) {
  return status || 'Open'
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export default function WorkshopPage() {
  const [admin, setAdmin] = useState<AdminSession | null>(null)
  const [jobs, setJobs] = useState<JobCard[]>([])
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [breakdowns, setBreakdowns] = useState<BreakdownRecord[]>([])
  const [selected, setSelected] = useState<JobCard | null>(null)
  const [parts, setParts] = useState<PartUsed[]>([])

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [partsLoading, setPartsLoading] = useState(false)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [search, setSearch] = useState('')

  const [selectedMechanicId, setSelectedMechanicId] = useState('')
  const [assignedStaffMobile, setAssignedStaffMobile] = useState('')
  const [diagnosisNotes, setDiagnosisNotes] = useState('')
  const [workDoneNotes, setWorkDoneNotes] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [labourCost, setLabourCost] = useState('0')
  const [otherCost, setOtherCost] = useState('0')

  const [partName, setPartName] = useState('')
  const [partNo, setPartNo] = useState('')
  const [partQty, setPartQty] = useState('1')
  const [partUnitCost, setPartUnitCost] = useState('0')
  const [partSupplier, setPartSupplier] = useState('')
  const [partOldLocation, setPartOldLocation] = useState('')
  const [partRemarks, setPartRemarks] = useState('')

  useEffect(() => {
    const savedAdmin = localStorage.getItem('pgt_admin')

    if (!savedAdmin) {
      window.location.href = '/'
      return
    }

    setAdmin(JSON.parse(savedAdmin))
    setDateFrom(todayDate())
    setDateTo(todayDate())
    loadData(todayDate(), todayDate())
  }, [])

  async function loadData(fromDate = dateFrom, toDate = dateTo) {
    setLoading(true)

    let jobsQuery = supabase
      .from('workshop_job_cards_view')
      .select('*')
      .order('opened_at', { ascending: false })

    if (fromDate) {
      jobsQuery = jobsQuery.gte('opened_at', `${fromDate}T00:00:00`)
    }

    if (toDate) {
      jobsQuery = jobsQuery.lte('opened_at', `${toDate}T23:59:59`)
    }

    if (statusFilter) {
      jobsQuery = jobsQuery.eq('status', statusFilter)
    }

    if (priorityFilter) {
      jobsQuery = jobsQuery.eq('priority', priorityFilter)
    }

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

    if (mechanicsRes.error) {
      alert(mechanicsRes.error.message)
      return
    }

    setJobs((jobsRes.data || []) as JobCard[])
    setMechanics((mechanicsRes.data || []) as Mechanic[])

    if (!breakdownsRes.error) {
      setBreakdowns((breakdownsRes.data || []) as BreakdownRecord[])
    }
  }

  async function refreshSelectedJob(jobId: string) {
    const { data, error } = await supabase
      .from('workshop_job_cards_view')
      .select('*')
      .eq('id', jobId)
      .single()

    if (!error && data) {
      const updatedJob = data as JobCard

      setSelected(updatedJob)
      setJobs((prev) =>
        prev.map((job) => (job.id === updatedJob.id ? updatedJob : job))
      )
    }
  }

  async function loadParts(jobId: string) {
    setPartsLoading(true)

    const { data, error } = await supabase
      .from('workshop_parts_used')
      .select('*')
      .eq('job_card_id', jobId)
      .order('created_at', { ascending: false })

    setPartsLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setParts((data || []) as PartUsed[])
  }

  async function createJobFromBreakdown(breakdownId: string) {
    setWorking(true)

    const { data, error } = await supabase.rpc(
      'create_workshop_job_from_breakdown',
      {
        p_breakdown_id: breakdownId,
      }
    )

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    alert(`Workshop job created: ${data}`)
    await loadData()
  }

  async function openJob(job: JobCard) {
    setSelected(job)
    setSelectedMechanicId(job.assigned_mechanic_id || '')
    setAssignedStaffMobile(job.assigned_staff_mobile || job.mechanic_mobile || '')
    setDiagnosisNotes(job.diagnosis_notes || '')
    setWorkDoneNotes(job.work_done_notes || '')
    setAdminNotes(job.admin_notes || '')
    setLabourCost(String(job.labour_cost || 0))
    setOtherCost(String(job.other_cost || 0))
    await loadParts(job.id)
  }

  async function updateJobStatus(job: JobCard, status: string) {
    setWorking(true)

    const patch: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'Assigned') {
      patch.assigned_at = new Date().toISOString()
    }

    if (status === 'In Progress') {
      patch.started_at = new Date().toISOString()
    }

    if (status === 'Completed') {
      patch.completed_at = new Date().toISOString()
    }

    if (status === 'Closed') {
      patch.closed_at = new Date().toISOString()
      patch.closed_by = admin?.name || 'Admin'
    }

    const { error } = await supabase
      .from('workshop_job_cards')
      .update(patch)
      .eq('id', job.id)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    await refreshSelectedJob(job.id)
    await loadData()
  }

  async function saveJobUpdate() {
    if (!selected) return

    const mechanic = mechanics.find((item) => item.id === selectedMechanicId)

    setWorking(true)

    const { error } = await supabase
      .from('workshop_job_cards')
      .update({
        assigned_mechanic_id: selectedMechanicId || null,
        assigned_mechanic_name: mechanic?.mechanic_name || null,
        assigned_staff_mobile:
          assignedStaffMobile.trim() || mechanic?.mobile || null,
        diagnosis_notes: diagnosisNotes.trim() || null,
        work_done_notes: workDoneNotes.trim() || null,
        admin_notes: adminNotes.trim() || null,
        labour_cost: Number(labourCost || 0),
        other_cost: Number(otherCost || 0),
        status: selectedMechanicId ? 'Assigned' : selected.status,
        assigned_at: selectedMechanicId
          ? selected.assigned_at || new Date().toISOString()
          : selected.assigned_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('Workshop job updated.')
    await refreshSelectedJob(selected.id)
    await loadData()
  }

  async function addPart() {
    if (!selected) return

    if (!partName.trim()) {
      alert('Part name is required.')
      return
    }

    setWorking(true)

    const { error } = await supabase.from('workshop_parts_used').insert([
      {
        job_card_id: selected.id,
        part_name: partName.trim(),
        part_no: partNo.trim() || null,
        qty: Number(partQty || 1),
        unit_cost: Number(partUnitCost || 0),
        supplier_name: partSupplier.trim() || null,
        old_part_location: partOldLocation.trim() || null,
        remarks: partRemarks.trim() || null,
      },
    ])

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    setPartName('')
    setPartNo('')
    setPartQty('1')
    setPartUnitCost('0')
    setPartSupplier('')
    setPartOldLocation('')
    setPartRemarks('')

    await loadParts(selected.id)
    await refreshSelectedJob(selected.id)
    await loadData()
  }

  async function deletePart(partId: string) {
    if (!selected) return

    if (!confirm('Delete this part entry?')) {
      return
    }

    setWorking(true)

    const { error } = await supabase
      .from('workshop_parts_used')
      .delete()
      .eq('id', partId)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    await loadParts(selected.id)
    await refreshSelectedJob(selected.id)
    await loadData()
  }

  async function sendLocationWhatsApp() {
    if (!selected) return

    const mobile = assignedStaffMobile.trim() || selected.assigned_staff_mobile || ''

    if (!mobile) {
      alert('Please enter assigned staff mobile number first.')
      return
    }

    if (!selected.breakdown_gps_map_link) {
      alert('No breakdown GPS location found for this job card.')
      return
    }

    const cleanMobile = mobile.replace(/[^0-9]/g, '')

    const message = [
      'PGT Workshop Job Assigned',
      '',
      `Job No: ${selected.job_no || '-'}`,
      `Vehicle: ${selected.vehicle_no_snapshot || '-'}`,
      `Trailer: ${selected.trailer_no_snapshot || '-'}`,
      `Driver: ${selected.driver_name_snapshot || '-'}`,
      `Job Type: ${selected.job_type || '-'}`,
      `Priority: ${selected.priority || '-'}`,
      '',
      'Breakdown Location:',
      selected.breakdown_gps_map_link,
      '',
      'Please proceed to the vehicle location and update the job status after reaching.',
    ].join('\n')

    setWorking(true)

    const { error } = await supabase
      .from('workshop_job_cards')
      .update({
        assigned_staff_mobile: mobile,
        location_sent_status: 'Sent',
        location_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    await refreshSelectedJob(selected.id)
    await loadData()

    window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(message)}`, '_blank')
  }

  function goDashboard() {
    window.location.href = '/dashboard'
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const searchableText = [
        job.job_no || '',
        job.vehicle_no_snapshot || '',
        job.trailer_no_snapshot || '',
        job.driver_name_snapshot || '',
        job.driver_mobile_snapshot || '',
        job.job_type || '',
        job.priority || '',
        job.status || '',
        job.assigned_mechanic_name || job.mechanic_name || '',
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(search.toLowerCase())
    })
  }, [jobs, search])

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      open: jobs.filter((job) => job.status === 'Open').length,
      assigned: jobs.filter((job) => job.status === 'Assigned').length,
      inProgress: jobs.filter((job) => job.status === 'In Progress').length,
      partsRequired: jobs.filter((job) => job.status === 'Parts Required').length,
      completed: jobs.filter((job) => job.status === 'Completed').length,
      closed: jobs.filter((job) => job.status === 'Closed').length,
      totalCost: jobs.reduce((sum, job) => sum + Number(job.total_cost || 0), 0),
    }
  }, [jobs])

  const selectedPartsTotal = useMemo(() => {
    return parts.reduce((sum, part) => sum + Number(part.total_cost || 0), 0)
  }, [parts])

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">
                Workshop Management
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Workshop Control Center
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                Welcome, {admin?.name || 'Admin'} • Job cards, mechanics,
                repair costs and vehicle maintenance history
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
                onClick={goDashboard}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white"
              >
                Dashboard
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-4 lg:grid-cols-8">
          <KpiCard title="Total" value={stats.total} />
          <KpiCard title="Open" value={stats.open} red />
          <KpiCard title="Assigned" value={stats.assigned} yellow />
          <KpiCard title="In Progress" value={stats.inProgress} blue />
          <KpiCard title="Parts Req." value={stats.partsRequired} yellow />
          <KpiCard title="Completed" value={stats.completed} green />
          <KpiCard title="Closed" value={stats.closed} green />
          <KpiCard title="Cost" value={Number(stats.totalCost.toFixed(0))} />
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-lg">
          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
              >
                <option value="">All</option>
                <option value="Open">Open</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Parts Required">Parts Required</option>
                <option value="Completed">Completed</option>
                <option value="Closed">Closed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
              >
                <option value="">All</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => loadData(dateFrom, dateTo)}
                className="h-12 w-full rounded-2xl bg-slate-950 px-5 font-black text-white"
              >
                Apply
              </button>
            </div>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search job, vehicle, driver, mechanic..."
            className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
          />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-lg lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-2xl font-black text-slate-900">
                Workshop Job Cards
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Showing {filteredJobs.length} job cards
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center font-bold text-slate-500">
                Loading workshop jobs...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-xs uppercase text-slate-600">
                      <th className="border p-3">Job No</th>
                      <th className="border p-3">Vehicle</th>
                      <th className="border p-3">Driver</th>
                      <th className="border p-3">Type</th>
                      <th className="border p-3">Priority</th>
                      <th className="border p-3">Status</th>
                      <th className="border p-3">Dispatch</th>
                      <th className="border p-3">Mechanic</th>
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
                            {new Date(job.opened_at).toLocaleString()}
                          </p>
                        </td>

                        <td className="border p-3 font-black text-slate-900">
                          {job.vehicle_no_snapshot || '-'}
                          <p className="text-xs font-semibold text-slate-400">
                            Trailer: {job.trailer_no_snapshot || '-'}
                          </p>
                        </td>

                        <td className="border p-3 font-semibold text-slate-700">
                          {job.driver_name_snapshot || '-'}
                          <p className="text-xs text-slate-400">
                            {job.driver_mobile_snapshot || '-'}
                          </p>
                        </td>

                        <td className="border p-3 font-semibold text-slate-700">
                          {job.job_type}
                        </td>

                        <td className="border p-3">
                          <PriorityBadge priority={job.priority} />
                        </td>

                        <td className="border p-3">
                          <StatusBadge status={job.status} />
                        </td>

                        <td className="border p-3">
                          <DispatchBadge status={job.dispatch_status || 'Pending'} />
                        </td>

                        <td className="border p-3 font-semibold text-slate-700">
                          {job.assigned_mechanic_name ||
                            job.mechanic_name ||
                            '-'}
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

                {filteredJobs.length === 0 && (
                  <div className="rounded-2xl bg-slate-50 p-8 text-center font-bold text-slate-500">
                    No workshop job cards found.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-lg">
            <h2 className="text-2xl font-black text-slate-900">
              Breakdown Queue
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Create workshop jobs from breakdown alerts.
            </p>

            <div className="mt-4 space-y-3">
              {breakdowns.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">
                        {item.vehicle_no_snapshot || item.vehicle_id || '-'}
                      </p>
                      <p className="text-sm font-semibold text-slate-500">
                        {item.breakdown_type || 'Breakdown'} •{' '}
                        {item.priority || 'Medium'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => createJobFromBreakdown(item.id)}
                      disabled={working}
                      className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                    >
                      Create Job
                    </button>
                  </div>
                </div>
              ))}

              {breakdowns.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
                  No open breakdowns.
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
                    Workshop Job Card
                  </p>

                  <h2 className="mt-2 text-3xl font-black text-slate-900">
                    {selected.job_no || 'Job Card'}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Vehicle {selected.vehicle_no_snapshot || '-'} •{' '}
                    {new Date(selected.opened_at).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="rounded-2xl bg-slate-900 px-5 py-3 font-black text-white"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <InfoBox title="Vehicle" value={selected.vehicle_no_snapshot || '-'} />
                <InfoBox title="Trailer" value={selected.trailer_no_snapshot || '-'} />
                <InfoBox title="Driver" value={selected.driver_name_snapshot || '-'} />
                <InfoBox title="Status" value={selected.status} />
                <InfoBox title="Dispatch" value={selected.dispatch_status || 'Pending'} />
                <InfoBox title="Job Type" value={selected.job_type} />
                <InfoBox title="Priority" value={selected.priority} />
                <InfoBox title="Mechanic" value={selected.assigned_mechanic_name || selected.mechanic_name || '-'} />
                <InfoBox title="Total Cost" value={money(selected.total_cost)} />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <InfoBox title="Labour" value={money(selected.labour_cost)} />
                <InfoBox title="Parts" value={money(selected.parts_cost)} />
                <InfoBox title="Other" value={money(selected.other_cost)} />
                <InfoBox title="Parts Lines" value={String(parts.length)} />
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                <h3 className="text-lg font-black text-slate-900">
                  Complaint / Breakdown Description
                </h3>

                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-600">
                  {selected.complaint_description || '-'}
                </p>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                <h3 className="text-lg font-black text-slate-900">
                  Dispatch Timeline
                </h3>

                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <InfoBox title="Accepted" value={formatDateTime(selected.accepted_at || null)} />
                  <InfoBox title="Journey" value={formatDateTime(selected.journey_started_at || null)} />
                  <InfoBox title="Arrived" value={formatDateTime(selected.arrived_at || null)} />
                  <InfoBox title="Repair Start" value={formatDateTime(selected.repair_started_at || null)} />
                  <InfoBox title="Completed" value={formatDateTime(selected.repair_completed_at || null)} />
                </div>
              </div>


              <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Breakdown Location for Workshop Team
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Send exact breakdown GPS location to assigned workshop staff.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right">
                    <p className="text-xs font-bold uppercase text-blue-500">
                      Location Status
                    </p>
                    <p className="text-lg font-black text-blue-700">
                      {selected.location_sent_status || 'Not Sent'}
                    </p>
                    {selected.location_sent_at ? (
                      <p className="text-xs font-semibold text-blue-400">
                        {new Date(selected.location_sent_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Assigned Staff Mobile
                    </label>
                    <input
                      value={assignedStaffMobile}
                      onChange={(event) => setAssignedStaffMobile(event.target.value)}
                      placeholder="9715XXXXXXXX"
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">
                      GPS Location
                    </label>
                    {selected.breakdown_gps_map_link ? (
                      <a
                        href={selected.breakdown_gps_map_link}
                        target="_blank"
                        className="mt-2 flex h-12 items-center justify-center rounded-2xl bg-blue-900 px-4 text-sm font-black text-white"
                      >
                        Open Google Maps
                      </a>
                    ) : (
                      <div className="mt-2 flex h-12 items-center rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-400">
                        No GPS captured
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">
                      WhatsApp
                    </label>
                    <button
                      onClick={sendLocationWhatsApp}
                      disabled={working || !selected.breakdown_gps_map_link}
                      className="mt-2 h-12 w-full rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-60"
                    >
                      Send Location
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">
                    Assigned Mechanic
                  </label>
                  <select
                    value={selectedMechanicId}
                    onChange={(event) => setSelectedMechanicId(event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
                  >
                    <option value="">Not assigned</option>
                    {mechanics.map((mechanic) => (
                      <option key={mechanic.id} value={mechanic.id}>
                        {mechanic.mechanic_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">
                    Status
                  </label>
                  <select
                    value={selected.status}
                    onChange={(event) => updateJobStatus(selected, event.target.value)}
                    disabled={working}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500 disabled:opacity-60"
                  >
                    <option value="Open">Open</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Parts Required">Parts Required</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">
                    Labour Cost
                  </label>
                  <input
                    type="number"
                    value={labourCost}
                    onChange={(event) => setLabourCost(event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">
                    Other Cost
                  </label>
                  <input
                    type="number"
                    value={otherCost}
                    onChange={(event) => setOtherCost(event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">
                    Diagnosis Notes
                  </label>
                  <textarea
                    value={diagnosisNotes}
                    onChange={(event) => setDiagnosisNotes(event.target.value)}
                    rows={5}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">
                    Work Done Notes
                  </label>
                  <textarea
                    value={workDoneNotes}
                    onChange={(event) => setWorkDoneNotes(event.target.value)}
                    rows={5}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    rows={5}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <section className="mt-6 rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      Parts Used
                    </h3>
                    <p className="text-sm font-semibold text-slate-500">
                      Add spare parts used in this repair. Parts cost updates
                      automatically.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-orange-50 px-4 py-3 text-right">
                    <p className="text-xs font-bold uppercase text-orange-500">
                      Parts Total
                    </p>
                    <p className="text-xl font-black text-orange-700">
                      {money(selectedPartsTotal)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <input
                    value={partName}
                    onChange={(event) => setPartName(event.target.value)}
                    placeholder="Part Name"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
                  />

                  <input
                    value={partNo}
                    onChange={(event) => setPartNo(event.target.value)}
                    placeholder="Part No / Serial"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
                  />

                  <input
                    type="number"
                    value={partQty}
                    onChange={(event) => setPartQty(event.target.value)}
                    placeholder="Qty"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
                  />

                  <input
                    type="number"
                    value={partUnitCost}
                    onChange={(event) => setPartUnitCost(event.target.value)}
                    placeholder="Unit Cost"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
                  />

                  <input
                    value={partSupplier}
                    onChange={(event) => setPartSupplier(event.target.value)}
                    placeholder="Supplier"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
                  />

                  <input
                    value={partOldLocation}
                    onChange={(event) => setPartOldLocation(event.target.value)}
                    placeholder="Old Part Location"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
                  />

                  <input
                    value={partRemarks}
                    onChange={(event) => setPartRemarks(event.target.value)}
                    placeholder="Remarks"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-orange-500"
                  />

                  <button
                    onClick={addPart}
                    disabled={working}
                    className="h-12 rounded-2xl bg-orange-600 px-5 font-black text-white disabled:opacity-60"
                  >
                    Add Part
                  </button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  {partsLoading ? (
                    <div className="rounded-2xl bg-slate-50 p-5 text-center font-bold text-slate-500">
                      Loading parts...
                    </div>
                  ) : (
                    <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-xs uppercase text-slate-600">
                          <th className="border p-3">Part</th>
                          <th className="border p-3">Part No</th>
                          <th className="border p-3">Qty</th>
                          <th className="border p-3">Unit Cost</th>
                          <th className="border p-3">Total</th>
                          <th className="border p-3">Supplier</th>
                          <th className="border p-3">Old Part Location</th>
                          <th className="border p-3">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {parts.map((part) => (
                          <tr key={part.id}>
                            <td className="border p-3 font-black text-slate-900">
                              {part.part_name}
                              {part.remarks ? (
                                <p className="text-xs font-semibold text-slate-400">
                                  {part.remarks}
                                </p>
                              ) : null}
                            </td>
                            <td className="border p-3 font-semibold text-slate-700">
                              {part.part_no || '-'}
                            </td>
                            <td className="border p-3 font-semibold text-slate-700">
                              {part.qty}
                            </td>
                            <td className="border p-3 font-semibold text-slate-700">
                              {money(part.unit_cost)}
                            </td>
                            <td className="border p-3 font-black">
                              {money(part.total_cost)}
                            </td>
                            <td className="border p-3 font-semibold text-slate-700">
                              {part.supplier_name || '-'}
                            </td>
                            <td className="border p-3 font-semibold text-slate-700">
                              {part.old_part_location || '-'}
                            </td>
                            <td className="border p-3">
                              <button
                                onClick={() => deletePart(part.id)}
                                disabled={working}
                                className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {!partsLoading && parts.length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
                      No parts added yet.
                    </div>
                  )}
                </div>
              </section>

              <RepairPhotoSection
                jobCardId={selected.id}
                uploadedBy={admin?.name || 'Admin'}
              />

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={saveJobUpdate}
                  disabled={working}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  Save Job
                </button>

                <button
                  onClick={() => updateJobStatus(selected, 'In Progress')}
                  disabled={working}
                  className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  Start Work
                </button>

                <button
                  onClick={() => updateJobStatus(selected, 'Parts Required')}
                  disabled={working}
                  className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  Parts Required
                </button>

                <button
                  onClick={() => updateJobStatus(selected, 'Completed')}
                  disabled={working}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  Complete
                </button>

                <button
                  onClick={() => updateJobStatus(selected, 'Closed')}
                  disabled={working}
                  className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  Close Job
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

function KpiCard({
  title,
  value,
  green,
  red,
  yellow,
  blue,
}: {
  title: string
  value: number
  green?: boolean
  red?: boolean
  yellow?: boolean
  blue?: boolean
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-lg">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        {title}
      </p>

      <h3
        className={`mt-2 text-3xl font-black ${
          green
            ? 'text-emerald-600'
            : red
              ? 'text-red-600'
              : yellow
                ? 'text-amber-600'
                : blue
                  ? 'text-blue-600'
                  : 'text-slate-900'
        }`}
      >
        {value}
      </h3>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const lower = priority.toLowerCase()

  const classes =
    lower === 'critical'
      ? 'bg-red-100 text-red-700'
      : lower === 'high'
        ? 'bg-orange-100 text-orange-700'
        : lower === 'medium'
          ? 'bg-amber-100 text-amber-700'
          : lower === 'low'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-700'

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const lower = normalizeStatus(status).toLowerCase()

  const classes =
    lower === 'closed' || lower === 'completed'
      ? 'bg-emerald-100 text-emerald-700'
      : lower === 'assigned' || lower === 'in progress' || lower === 'workshop'
        ? 'bg-blue-100 text-blue-700'
        : lower === 'parts required'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-red-100 text-red-700'

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}>
      {status}
    </span>
  )
}

function DispatchBadge({ status }: { status: string }) {
  const lower = status.toLowerCase()

  const classes =
    lower === 'completed' || lower === 'closed'
      ? 'bg-emerald-100 text-emerald-700'
      : lower === 'travelling'
        ? 'bg-blue-100 text-blue-700'
        : lower === 'arrived' || lower === 'repair started'
          ? 'bg-purple-100 text-purple-700'
          : lower === 'waiting parts'
            ? 'bg-amber-100 text-amber-700'
            : lower === 'accepted'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-slate-100 text-slate-700'

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}>
      {status}
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
