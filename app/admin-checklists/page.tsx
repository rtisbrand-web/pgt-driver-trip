'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import {
  downloadChecklistPdf,
  shareChecklistPdf,
} from '../../lib/pdf/checklistPdf'

type AdminSession = {
  name: string
  mobile: string
}

type Vehicle = {
  id: string
  vehicle_no: string | null
  vehicle_number?: string | null
  plate_no?: string | null
  is_active: boolean | null
}

type ChecklistReport = {
  id: string
  report_no: string | null
  created_at: string
  checklist_date: string
  checklist_time: string | null
  language: string | null
  status: string
  fail_count: number | null
  not_ok_count: number | null
  remarks: string | null
  gps_map_link: string | null
  driver_name_snapshot: string | null
  driver_mobile_snapshot: string | null
  vehicle_no_snapshot: string | null
  trailer_no_snapshot: string | null
  checklist_data: any[] | null
  fail_items: any[] | null
  photo_urls: string[] | null
  vehicle_photo_url: string | null
  tyre_photo_url: string | null
  extra_photo_url: string | null
  signature_data: string | null
}

type VehicleChecklistRow = {
  vehicleNo: string
  vehicleId: string | null
  report: ChecklistReport | null
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

function getVehicleNo(vehicle: Vehicle) {
  return vehicle.vehicle_no || vehicle.vehicle_number || vehicle.plate_no || '-'
}

export default function AdminChecklistsPage() {
  const [admin, setAdmin] = useState<AdminSession | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayDate())
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [reports, setReports] = useState<ChecklistReport[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const savedAdmin = localStorage.getItem('pgt_admin')

    if (!savedAdmin) {
      window.location.href = '/'
      return
    }

    setAdmin(JSON.parse(savedAdmin))
    loadData(selectedDate)
  }, [])

  async function loadData(dateValue = selectedDate) {
    setLoading(true)

    const vehiclesRes = await supabase
      .from('vehicles')
      .select('id, vehicle_no, vehicle_number, plate_no, is_active')
      .eq('is_active', true)
      .order('vehicle_no', { ascending: true })

    const reportsRes = await supabase
      .from('driver_checklists')
      .select(`
        id,
        report_no,
        created_at,
        checklist_date,
        checklist_time,
        language,
        status,
        fail_count,
        not_ok_count,
        remarks,
        gps_map_link,
        driver_name_snapshot,
        driver_mobile_snapshot,
        vehicle_no_snapshot,
        trailer_no_snapshot,
        checklist_data,
        fail_items,
        photo_urls,
        vehicle_photo_url,
        tyre_photo_url,
        extra_photo_url,
        signature_data
      `)
      .eq('checklist_date', dateValue)
      .order('created_at', { ascending: false })

    if (vehiclesRes.error) {
      alert(vehiclesRes.error.message)
    }

    if (reportsRes.error) {
      alert(reportsRes.error.message)
    }

    setVehicles((vehiclesRes.data || []) as Vehicle[])
    setReports((reportsRes.data || []) as unknown as ChecklistReport[])
    setLoading(false)
  }

  function goBack() {
    window.location.href = '/dashboard'
  }

  async function downloadPdf(report: ChecklistReport) {
    setWorking(true)

    try {
      await downloadChecklistPdf(report)
    } catch (error: any) {
      alert(error.message || 'PDF download failed')
    } finally {
      setWorking(false)
    }
  }

  async function shareWhatsApp(report: ChecklistReport) {
    setWorking(true)

    try {
      await shareChecklistPdf(report)
    } catch (error: any) {
      alert(error.message || 'WhatsApp share failed')
    } finally {
      setWorking(false)
    }
  }

  const rows = useMemo<VehicleChecklistRow[]>(() => {
    const reportMap = new Map<string, ChecklistReport>()

    reports.forEach((report) => {
      const vehicleNo = (report.vehicle_no_snapshot || '').trim().toUpperCase()

      if (vehicleNo && !reportMap.has(vehicleNo)) {
        reportMap.set(vehicleNo, report)
      }
    })

    const vehicleRows = vehicles.map((vehicle) => {
      const vehicleNo = getVehicleNo(vehicle)
      const key = vehicleNo.trim().toUpperCase()

      return {
        vehicleNo,
        vehicleId: vehicle.id,
        report: reportMap.get(key) || null,
      }
    })

    const reportOnlyRows = reports
      .filter((report) => {
        const key = (report.vehicle_no_snapshot || '').trim().toUpperCase()
        return key && !vehicleRows.some((row) => row.vehicleNo.trim().toUpperCase() === key)
      })
      .map((report) => ({
        vehicleNo: report.vehicle_no_snapshot || '-',
        vehicleId: null,
        report,
      }))

    return [...vehicleRows, ...reportOnlyRows]
  }, [vehicles, reports])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const text = [
        row.vehicleNo,
        row.report?.driver_name_snapshot || '',
        row.report?.driver_mobile_snapshot || '',
        row.report?.trailer_no_snapshot || '',
        row.report?.status || 'Pending',
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = text.includes(search.toLowerCase())

      const currentStatus = row.report
        ? row.report.status === 'OK'
          ? 'OK'
          : 'FAILED'
        : 'PENDING'

      const matchesStatus = !statusFilter || statusFilter === currentStatus

      return matchesSearch && matchesStatus
    })
  }, [rows, search, statusFilter])

  const stats = useMemo(() => {
    const totalVehicles = rows.length
    const completed = rows.filter((row) => row.report).length
    const pending = rows.filter((row) => !row.report).length
    const ok = rows.filter((row) => row.report?.status === 'OK').length
    const failed = rows.filter((row) => row.report && row.report.status !== 'OK').length

    return { totalVehicles, completed, pending, ok, failed }
  }, [rows])

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
                Admin Monitoring
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Daily Checklist Dashboard
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                Welcome, {admin?.name || 'Admin'} • Vehicle daily safety status
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
                onClick={goBack}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white"
              >
                Dashboard
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-5">
          <KpiCard title="Total Vehicles" value={stats.totalVehicles} />
          <KpiCard title="Completed" value={stats.completed} green />
          <KpiCard title="Pending" value={stats.pending} yellow />
          <KpiCard title="OK" value={stats.ok} green />
          <KpiCard title="Failed" value={stats.failed} red />
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-lg">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="OK">OK</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">
                Search
              </label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Vehicle, driver, mobile..."
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => loadData(selectedDate)}
                className="h-12 w-full rounded-2xl bg-slate-950 px-5 font-black text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Vehicle Checklist Status
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Date: {selectedDate}
              </p>
            </div>

            <Link
              href="/checklist-history"
              className="rounded-2xl bg-blue-900 px-4 py-3 text-sm font-black text-white"
            >
              Driver History
            </Link>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center font-bold text-slate-500">
              Loading daily checklist status...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-xs uppercase text-slate-600">
                    <th className="border p-3">Vehicle</th>
                    <th className="border p-3">Driver</th>
                    <th className="border p-3">Trailer</th>
                    <th className="border p-3">Time</th>
                    <th className="border p-3">Status</th>
                    <th className="border p-3">Fail</th>
                    <th className="border p-3">GPS</th>
                    <th className="border p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={`${row.vehicleNo}-${row.report?.id || 'pending'}`}>
                      <td className="border p-3 font-black text-slate-900">
                        {row.vehicleNo}
                      </td>

                      <td className="border p-3 font-semibold text-slate-700">
                        {row.report?.driver_name_snapshot || '-'}
                        {row.report?.driver_mobile_snapshot ? (
                          <p className="text-xs text-slate-400">
                            {row.report.driver_mobile_snapshot}
                          </p>
                        ) : null}
                      </td>

                      <td className="border p-3 font-semibold text-slate-700">
                        {row.report?.trailer_no_snapshot || '-'}
                      </td>

                      <td className="border p-3 font-semibold text-slate-700">
                        {row.report
                          ? new Date(row.report.created_at).toLocaleTimeString()
                          : '-'}
                      </td>

                      <td className="border p-3">
                        {row.report ? (
                          <StatusBadge status={row.report.status} />
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="border p-3 font-black">
                        {row.report?.fail_count || 0}
                      </td>

                      <td className="border p-3">
                        {row.report?.gps_map_link ? (
                          <a
                            href={row.report.gps_map_link}
                            target="_blank"
                            className="font-black text-blue-700 underline"
                          >
                            GPS
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="border p-3">
                        {row.report ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => downloadPdf(row.report!)}
                              disabled={working}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                            >
                              PDF
                            </button>

                            <button
                              onClick={() => shareWhatsApp(row.report!)}
                              disabled={working}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
                            >
                              WA
                            </button>

                            <a
                              href={`/checklist-history?report=${row.report.id}`}
                              className="rounded-xl bg-blue-900 px-3 py-2 text-xs font-black text-white"
                            >
                              View
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">
                            No report
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRows.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-8 text-center font-bold text-slate-500">
                  No records found.
                </div>
              )}
            </div>
          )}
        </section>
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

function StatusBadge({ status }: { status: string }) {
  if (status === 'OK') {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
        OK
      </span>
    )
  }

  return (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
      {status || 'Attention'}
    </span>
  )
}
