'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type AdminSession = {
  name: string
  mobile: string
}

type Driver = {
  id?: string
  driver_id?: string
  uuid?: string
  driver_name?: string | null
  name?: string | null
  mobile?: string | null
  mobile_number?: string | null
  phone?: string | null
}

type Vehicle = {
  id?: string
  vehicle_id?: string
  uuid?: string
  vehicle_number?: string | null
  vehicle_no?: string | null
  plate_no?: string | null
  registration_no?: string | null
}

type Trailer = {
  id?: string
  trailer_id?: string
  uuid?: string
  trailer_number?: string | null
  trailer_no?: string | null
  plate_no?: string | null
}

type BreakdownRecord = {
  id: string
  created_at: string
  driver_id: string | null
  vehicle_id: string | null
  trailer_id: string | null
  driver_name_snapshot?: string | null
  driver_mobile_snapshot?: string | null
  vehicle_no_snapshot?: string | null
  trailer_no_snapshot?: string | null
  breakdown_type: string | null
  priority: string | null
  status: string | null
  description: string | null
  gps_latitude: number | null
  gps_longitude: number | null
  gps_map_link: string | null
  photo1_url: string | null
  photo2_url: string | null
  photo3_url: string | null
  photo4_url?: string | null
  photo5_url?: string | null
  photo_urls?: string[] | null
  voice_note_url?: string | null
  ack_by?: string | null
  ack_at?: string | null
  closed_by?: string | null
  closed_at?: string | null
  admin_notes?: string | null
  report_no?: string | null
}

type BreakdownViewRecord = BreakdownRecord & {
  driver_name_display: string
  driver_mobile_display: string
  vehicle_no_display: string
  trailer_no_display: string
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

function normalizeStatus(status: string | null | undefined) {
  return (status || 'Open').trim()
}

function getDriverName(driver: Driver | undefined, item: BreakdownRecord) {
  return (
    item.driver_name_snapshot ||
    driver?.driver_name ||
    driver?.name ||
    '-'
  )
}

function getDriverMobile(driver: Driver | undefined, item: BreakdownRecord) {
  return (
    item.driver_mobile_snapshot ||
    driver?.mobile ||
    driver?.mobile_number ||
    driver?.phone ||
    '-'
  )
}

function getVehicleNumber(vehicle: Vehicle | undefined, item: BreakdownRecord) {
  return (
    item.vehicle_no_snapshot ||
    vehicle?.vehicle_number ||
    vehicle?.vehicle_no ||
    vehicle?.plate_no ||
    vehicle?.registration_no ||
    '-'
  )
}

function getTrailerNumber(trailer: Trailer | undefined, item: BreakdownRecord) {
  return (
    item.trailer_no_snapshot ||
    trailer?.trailer_number ||
    trailer?.trailer_no ||
    trailer?.plate_no ||
    '-'
  )
}

function getDriverKey(driver: Driver) {
  return driver.id || driver.driver_id || driver.uuid || ''
}

function getVehicleKey(vehicle: Vehicle) {
  return vehicle.id || vehicle.vehicle_id || vehicle.uuid || ''
}

function getTrailerKey(trailer: Trailer) {
  return trailer.id || trailer.trailer_id || trailer.uuid || ''
}

function getPhotos(item: BreakdownRecord) {
  return [
    item.photo1_url,
    item.photo2_url,
    item.photo3_url,
    item.photo4_url,
    item.photo5_url,
    ...(Array.isArray(item.photo_urls) ? item.photo_urls : []),
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index) as string[]
}

export default function AdminBreakdownsPage() {
  const [admin, setAdmin] = useState<AdminSession | null>(null)
  const [records, setRecords] = useState<BreakdownViewRecord[]>([])
  const [selected, setSelected] = useState<BreakdownViewRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)

  const [dateFrom, setDateFrom] = useState(todayDate())
  const [dateTo, setDateTo] = useState(todayDate())
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [search, setSearch] = useState('')

  const [adminNotes, setAdminNotes] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  useEffect(() => {
    const savedAdmin = localStorage.getItem('pgt_admin')

    if (!savedAdmin) {
      window.location.href = '/'
      return
    }

    setAdmin(JSON.parse(savedAdmin))
    loadBreakdowns()
  }, [])

  async function loadBreakdowns() {
    setLoading(true)

    let breakdownQuery = supabase
      .from('driver_breakdowns')
      .select(`
        id,
        created_at,
        driver_id,
        vehicle_id,
        trailer_id,
        driver_name_snapshot,
        driver_mobile_snapshot,
        vehicle_no_snapshot,
        trailer_no_snapshot,
        breakdown_type,
        priority,
        status,
        description,
        gps_latitude,
        gps_longitude,
        gps_map_link,
        photo1_url,
        photo2_url,
        photo3_url,
        photo4_url,
        photo5_url,
        photo_urls,
        voice_note_url,
        ack_by,
        ack_at,
        closed_by,
        closed_at,
        admin_notes,
        report_no
      `)
      .order('created_at', { ascending: false })

    if (dateFrom) {
      breakdownQuery = breakdownQuery.gte('created_at', `${dateFrom}T00:00:00`)
    }

    if (dateTo) {
      breakdownQuery = breakdownQuery.lte('created_at', `${dateTo}T23:59:59`)
    }

    if (statusFilter) {
      breakdownQuery = breakdownQuery.eq('status', statusFilter)
    }

    if (priorityFilter) {
      breakdownQuery = breakdownQuery.eq('priority', priorityFilter)
    }

    const [breakdownRes, driversRes, vehiclesRes, trailersRes] = await Promise.all([
      breakdownQuery,
      supabase.from('drivers').select('*'),
      supabase.from('vehicles').select('*'),
      supabase.from('trailers').select('*'),
    ])

    setLoading(false)

    if (breakdownRes.error) {
      alert(breakdownRes.error.message)
      return
    }

    const drivers = (driversRes.data || []) as Driver[]
    const vehicles = (vehiclesRes.data || []) as Vehicle[]
    const trailers = (trailersRes.data || []) as Trailer[]

    const driverMap = new Map(
      drivers
        .map((driver) => [getDriverKey(driver), driver] as const)
        .filter(([key]) => Boolean(key))
    )

    const vehicleMap = new Map(
      vehicles
        .map((vehicle) => [getVehicleKey(vehicle), vehicle] as const)
        .filter(([key]) => Boolean(key))
    )

    const trailerMap = new Map(
      trailers
        .map((trailer) => [getTrailerKey(trailer), trailer] as const)
        .filter(([key]) => Boolean(key))
    )

    const merged = ((breakdownRes.data || []) as BreakdownRecord[]).map((item) => {
      const driver = item.driver_id ? driverMap.get(item.driver_id) : undefined
      const vehicle = item.vehicle_id ? vehicleMap.get(item.vehicle_id) : undefined
      const trailer = item.trailer_id ? trailerMap.get(item.trailer_id) : undefined

      return {
        ...item,
        driver_name_display: getDriverName(driver, item),
        driver_mobile_display: getDriverMobile(driver, item),
        vehicle_no_display: getVehicleNumber(vehicle, item),
        trailer_no_display: getTrailerNumber(trailer, item),
      }
    })

    setRecords(merged)
  }

  async function updateBreakdownStatus(id: string, status: string) {
    setWorking(true)

    const patch: Record<string, string | null> = { status }

    if (status === 'Closed' || status === 'Completed') {
      patch.closed_by = admin?.name || 'Admin'
      patch.closed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('driver_breakdowns')
      .update(patch)
      .eq('id', id)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    await loadBreakdowns()

    if (selected?.id === id) {
      setSelected({
        ...selected,
        status,
        closed_by: patch.closed_by || selected.closed_by,
        closed_at: patch.closed_at || selected.closed_at,
      })
    }
  }

  async function saveAdminUpdate() {
    if (!selected) return

    setWorking(true)

    const { error } = await supabase
      .from('driver_breakdowns')
      .update({
        admin_notes: adminNotes.trim() || null,
        ack_by: assignedTo.trim() || admin?.name || null,
        ack_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    setWorking(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('Breakdown update saved.')
    await loadBreakdowns()

    setSelected({
      ...selected,
      admin_notes: adminNotes.trim() || null,
      ack_by: assignedTo.trim() || admin?.name || null,
      ack_at: new Date().toISOString(),
    })
  }

  function openDetails(item: BreakdownViewRecord) {
    setSelected(item)
    setAdminNotes(item.admin_notes || '')
    setAssignedTo(item.ack_by || '')
  }

  function goDashboard() {
    window.location.href = '/dashboard'
  }

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const searchableText = [
        item.vehicle_no_display,
        item.trailer_no_display,
        item.driver_name_display,
        item.driver_mobile_display,
        item.breakdown_type || '',
        item.priority || '',
        item.status || '',
        item.description || '',
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(search.toLowerCase())
    })
  }, [records, search])

  const stats = useMemo(() => {
    const open = records.filter((item) =>
      ['open', 'new', 'pending'].includes(normalizeStatus(item.status).toLowerCase())
    ).length

    const assigned = records.filter((item) =>
      ['assigned', 'in progress', 'workshop'].includes(
        normalizeStatus(item.status).toLowerCase()
      )
    ).length

    const closed = records.filter((item) =>
      ['closed', 'completed', 'resolved'].includes(
        normalizeStatus(item.status).toLowerCase()
      )
    ).length

    const critical = records.filter(
      (item) => (item.priority || '').toLowerCase() === 'critical'
    ).length

    return {
      total: records.length,
      open,
      assigned,
      closed,
      critical,
    }
  }, [records])

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-300">
                Admin Monitoring
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Breakdown Control Center
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                Welcome, {admin?.name || 'Admin'} • Breakdown alerts, GPS,
                photos and workshop follow-up
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={loadBreakdowns}
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

        <section className="mt-5 grid gap-4 md:grid-cols-5">
          <KpiCard title="Total Alerts" value={stats.total} />
          <KpiCard title="Open" value={stats.open} red />
          <KpiCard title="Assigned" value={stats.assigned} yellow />
          <KpiCard title="Closed" value={stats.closed} green />
          <KpiCard title="Critical" value={stats.critical} red />
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
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-red-500"
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
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-red-500"
              >
                <option value="">All</option>
                <option value="Open">Open</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Workshop">Workshop</option>
                <option value="Completed">Completed</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-red-500"
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
                onClick={loadBreakdowns}
                className="h-12 w-full rounded-2xl bg-slate-950 px-5 font-black text-white"
              >
                Apply
              </button>
            </div>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vehicle, driver, type, mobile..."
            className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-red-500"
          />
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-lg">
          <div className="mb-4">
            <h2 className="text-2xl font-black text-slate-900">
              Breakdown Alerts
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Showing {filteredRecords.length} records
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center font-bold text-slate-500">
              Loading breakdown alerts...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-xs uppercase text-slate-600">
                    <th className="border p-3">Time</th>
                    <th className="border p-3">Vehicle</th>
                    <th className="border p-3">Trailer</th>
                    <th className="border p-3">Driver</th>
                    <th className="border p-3">Type</th>
                    <th className="border p-3">Priority</th>
                    <th className="border p-3">Status</th>
                    <th className="border p-3">GPS</th>
                    <th className="border p-3">Photos</th>
                    <th className="border p-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecords.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-3 font-semibold text-slate-700">
                        {new Date(item.created_at).toLocaleString()}
                      </td>

                      <td className="border p-3 font-black text-slate-900">
                        {item.vehicle_no_display}
                      </td>

                      <td className="border p-3 font-semibold text-slate-700">
                        {item.trailer_no_display}
                      </td>

                      <td className="border p-3 font-semibold text-slate-700">
                        {item.driver_name_display}
                        <p className="text-xs text-slate-400">
                          {item.driver_mobile_display}
                        </p>
                      </td>

                      <td className="border p-3 font-semibold text-slate-700">
                        {item.breakdown_type || '-'}
                      </td>

                      <td className="border p-3">
                        <PriorityBadge priority={item.priority || '-'} />
                      </td>

                      <td className="border p-3">
                        <StatusBadge status={normalizeStatus(item.status)} />
                      </td>

                      <td className="border p-3">
                        {item.gps_map_link ? (
                          <a
                            href={item.gps_map_link}
                            target="_blank"
                            className="font-black text-blue-700 underline"
                          >
                            GPS
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="border p-3 font-black">
                        {getPhotos(item).length}
                      </td>

                      <td className="border p-3">
                        <button
                          onClick={() => openDetails(item)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRecords.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-8 text-center font-bold text-slate-500">
                  No breakdown alerts found.
                </div>
              )}
            </div>
          )}
        </section>

        {selected && (
          <section className="fixed inset-0 z-50 overflow-auto bg-slate-950/70 p-4">
            <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-600">
                    Breakdown Report
                  </p>

                  <h2 className="mt-2 text-3xl font-black text-slate-900">
                    {selected.vehicle_no_display}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {new Date(selected.created_at).toLocaleString()}
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
                <InfoBox title="Vehicle" value={selected.vehicle_no_display} />
                <InfoBox title="Trailer" value={selected.trailer_no_display} />
                <InfoBox title="Driver" value={selected.driver_name_display} />
                <InfoBox title="Mobile" value={selected.driver_mobile_display} />
                <InfoBox title="Type" value={selected.breakdown_type || '-'} />
                <InfoBox title="Priority" value={selected.priority || '-'} />
                <InfoBox title="Status" value={normalizeStatus(selected.status)} />
                <InfoBox
                  title="Photos"
                  value={String(getPhotos(selected).length)}
                />
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                <h3 className="text-lg font-black text-slate-900">
                  Description
                </h3>

                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-600">
                  {selected.description || '-'}
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 p-5">
                  <h3 className="text-lg font-black text-slate-900">
                    GPS Location
                  </h3>

                  {selected.gps_map_link ? (
                    <a
                      href={selected.gps_map_link}
                      target="_blank"
                      className="mt-3 inline-flex rounded-2xl bg-blue-900 px-5 py-3 text-sm font-black text-white"
                    >
                      Open Google Maps
                    </a>
                  ) : (
                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      No GPS location captured.
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 p-5">
                  <h3 className="text-lg font-black text-slate-900">
                    Voice Note
                  </h3>

                  {selected.voice_note_url ? (
                    <audio
                      controls
                      src={selected.voice_note_url}
                      className="mt-3 w-full"
                    />
                  ) : (
                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      No voice note attached.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                <h3 className="text-lg font-black text-slate-900">
                  Photos
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {getPhotos(selected).map((photoUrl, index) => (
                    <a
                      key={photoUrl}
                      href={photoUrl}
                      target="_blank"
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                    >
                      <img
                        src={photoUrl}
                        alt={`Breakdown photo ${index + 1}`}
                        className="h-48 w-full object-cover"
                      />
                      <p className="p-3 text-sm font-black text-slate-700">
                        Photo {index + 1}
                      </p>
                    </a>
                  ))}

                  {getPhotos(selected).length === 0 && (
                    <p className="text-sm font-semibold text-slate-500">
                      No photos attached.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                <h3 className="text-lg font-black text-slate-900">
                  Admin Follow-up
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Assigned To / Mechanic
                    </label>
                    <input
                      value={assignedTo}
                      onChange={(event) => setAssignedTo(event.target.value)}
                      placeholder="Mechanic or workshop vehicle"
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Status
                    </label>
                    <select
                      value={normalizeStatus(selected.status)}
                      onChange={(event) =>
                        updateBreakdownStatus(selected.id, event.target.value)
                      }
                      disabled={working}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-red-500 disabled:opacity-60"
                    >
                      <option value="Open">Open</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Completed">Completed</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-bold uppercase text-slate-500">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    rows={4}
                    placeholder="Write workshop or admin follow-up notes..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-red-500"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={saveAdminUpdate}
                    disabled={working}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    Save Update
                  </button>

                  <button
                    onClick={() => updateBreakdownStatus(selected.id, 'Closed')}
                    disabled={working}
                    className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    Close Breakdown
                  </button>

                  {selected.gps_map_link ? (
                    <a
                      href={selected.gps_map_link}
                      target="_blank"
                      className="rounded-2xl bg-blue-900 px-5 py-3 text-sm font-black text-white"
                    >
                      Open GPS
                    </a>
                  ) : null}
                </div>
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
}: {
  title: string
  value: number
  green?: boolean
  red?: boolean
  yellow?: boolean
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-lg">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        {title}
      </p>

      <h3
        className={`mt-2 text-4xl font-black ${
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
      </h3>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const value = priority || '-'
  const lower = value.toLowerCase()

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
      {value}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase()

  const classes =
    lower === 'closed' || lower === 'completed' || lower === 'resolved'
      ? 'bg-emerald-100 text-emerald-700'
      : lower === 'assigned' || lower === 'in progress' || lower === 'workshop'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-red-100 text-red-700'

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
