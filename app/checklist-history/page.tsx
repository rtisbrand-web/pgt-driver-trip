'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type DriverSession = {
  driver_id: string
  driver_name: string
  mobile: string
}

type ChecklistItem = {
  key: string
  label: string
  status: string
  remarks: string | null
  photo_url: string | null
}

type ChecklistSection = {
  key: string
  title: string
  items: ChecklistItem[]
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
  checklist_data: ChecklistSection[] | null
  fail_items: any[] | null
  photo_urls: string[] | null
  vehicle_photo_url: string | null
  tyre_photo_url: string | null
  extra_photo_url: string | null
  signature_data: string | null
}

export default function ChecklistHistoryPage() {
  const [driver, setDriver] = useState<DriverSession | null>(null)
  const [reports, setReports] = useState<ChecklistReport[]>([])
  const [selectedReport, setSelectedReport] = useState<ChecklistReport | null>(null)
  const [loading, setLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    const savedDriver = localStorage.getItem('pgt_driver')

    if (!savedDriver) {
      window.location.href = '/driver-login'
      return
    }

    const parsed = JSON.parse(savedDriver)
    setDriver(parsed)
    loadReports(parsed.driver_id)
  }, [])

  async function loadReports(driverId = driver?.driver_id || '') {
    if (!driverId) return

    setLoading(true)

    let query = supabase
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
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })

    if (statusFilter) query = query.eq('status', statusFilter)
    if (dateFrom) query = query.gte('checklist_date', dateFrom)
    if (dateTo) query = query.lte('checklist_date', dateTo)

    const { data, error } = await query

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setReports((data || []) as unknown as ChecklistReport[])
  }

  function goBack() {
    window.location.href = '/driver-dashboard'
  }

  function openChecklist() {
    window.location.href = '/checklist'
  }

  function printReport(report: ChecklistReport) {
    setSelectedReport(report)
    setTimeout(() => window.print(), 300)
  }

  const stats = useMemo(() => {
    return {
      total: reports.length,
      ok: reports.filter((item) => item.status === 'OK').length,
      attention: reports.filter((item) => item.status !== 'OK').length,
    }
  }, [reports])

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900 print:bg-white">
      <div className="mx-auto max-w-md pb-8 print:max-w-full">
        <header className="rounded-b-[36px] bg-[#070d22] px-5 pb-6 pt-7 text-white shadow-xl print:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                VDCL Reports
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight">
                Checklist History
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {driver?.driver_name || 'Driver'} • Past safety reports
              </p>
            </div>

            <button
              onClick={goBack}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white"
            >
              Back
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <TopCard title="Total" value={stats.total.toString()} />
            <TopCard title="OK" value={stats.ok.toString()} green />
            <TopCard title="Issues" value={stats.attention.toString()} red />
          </div>
        </header>

        <div className="px-4 print:px-0">
          <section className="mt-5 rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200 print:hidden">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Filters
                </p>
                <h2 className="mt-1 text-2xl font-black">Find Reports</h2>
              </div>

              <button
                onClick={openChecklist}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white"
              >
                New
              </button>
            </div>

            <div className="space-y-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-emerald-500"
              >
                <option value="">All Status</option>
                <option value="OK">OK</option>
                <option value="Attention Required">Attention Required</option>
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-emerald-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={() => loadReports()}
                className="h-14 w-full rounded-2xl bg-[#070d22] text-base font-black text-white"
              >
                Apply Filter
              </button>
            </div>
          </section>

          <section className="mt-5 space-y-4 print:hidden">
            {loading ? (
              <div className="rounded-[28px] bg-white p-6 text-center font-semibold text-slate-500 shadow-lg">
                Loading checklist reports...
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-blue-700">
                        {report.report_no || 'VDCL Report'}
                      </p>
                      <h2 className="mt-1 text-xl font-black text-slate-900">
                        {report.vehicle_no_snapshot || '-'}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        report.status === 'OK'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <InfoBox title="Trailer" value={report.trailer_no_snapshot || '-'} />
                    <InfoBox title="Fail" value={String(report.fail_count || 0)} />
                    <InfoBox title="Date" value={report.checklist_date || '-'} />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="h-12 rounded-2xl bg-blue-900 text-sm font-black text-white"
                    >
                      View
                    </button>

                    <button
                      onClick={() => printReport(report)}
                      className="h-12 rounded-2xl bg-slate-800 text-sm font-black text-white"
                    >
                      Print
                    </button>

                    {report.gps_map_link ? (
                      <a
                        href={report.gps_map_link}
                        target="_blank"
                        className="flex h-12 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white"
                      >
                        GPS
                      </a>
                    ) : (
                      <button className="h-12 rounded-2xl bg-slate-200 text-sm font-black text-slate-500">
                        GPS
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {!loading && reports.length === 0 && (
              <div className="rounded-[28px] bg-white p-8 text-center font-semibold text-slate-500 shadow-lg">
                No checklist reports found.
              </div>
            )}
          </section>

          {selectedReport && (
            <ReportView
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
            />
          )}
        </div>
      </div>
    </main>
  )
}

function ReportView({
  report,
  onClose,
}: {
  report: ChecklistReport
  onClose: () => void
}) {
  const sections = Array.isArray(report.checklist_data)
    ? report.checklist_data
    : []

  return (
    <section className="fixed inset-0 z-50 overflow-auto bg-white p-4 print:static print:block print:p-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <button
            onClick={onClose}
            className="rounded-2xl bg-slate-800 px-5 py-3 font-black text-white"
          >
            Close
          </button>

          <button
            onClick={() => window.print()}
            className="rounded-2xl bg-blue-900 px-5 py-3 font-black text-white"
          >
            Print / PDF
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 p-6 print:border-0">
          <div className="border-b pb-4">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              PGT Logistic and Transport Services LLC
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Vehicle Daily Checklist Report
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Report No: {report.report_no || '-'}
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <ReportInfo title="Driver" value={report.driver_name_snapshot || '-'} />
            <ReportInfo title="Mobile" value={report.driver_mobile_snapshot || '-'} />
            <ReportInfo title="Vehicle" value={report.vehicle_no_snapshot || '-'} />
            <ReportInfo title="Trailer" value={report.trailer_no_snapshot || '-'} />
            <ReportInfo title="Date" value={report.checklist_date || '-'} />
            <ReportInfo title="Status" value={report.status || '-'} />
            <ReportInfo title="Fail Count" value={String(report.fail_count || 0)} />
            <ReportInfo title="GPS" value={report.gps_map_link ? 'Available' : '-'} />
          </div>

          {report.gps_map_link && (
            <a
              href={report.gps_map_link}
              target="_blank"
              className="mt-4 inline-block rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white print:hidden"
            >
              Open GPS Map
            </a>
          )}

          <div className="mt-6 space-y-5">
            {sections.map((section) => (
              <div key={section.key} className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-xl font-black text-slate-900">{section.title}</h2>

                <div className="mt-3 overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="border p-2">Item</th>
                        <th className="border p-2">Status</th>
                        <th className="border p-2">Remarks</th>
                        <th className="border p-2">Photo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item) => (
                        <tr key={item.key}>
                          <td className="border p-2 font-semibold">{item.label}</td>
                          <td className="border p-2 font-black">{item.status}</td>
                          <td className="border p-2">{item.remarks || '-'}</td>
                          <td className="border p-2">
                            {item.photo_url ? (
                              <a
                                href={item.photo_url}
                                target="_blank"
                                className="font-bold text-blue-700 underline"
                              >
                                View
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {Array.isArray(report.photo_urls) && report.photo_urls.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-black text-slate-900">Photos</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {report.photo_urls.map((url, index) => (
                  <a
                    href={url}
                    target="_blank"
                    key={url}
                    className="rounded-xl border p-3 text-center text-sm font-bold text-blue-700"
                  >
                    Photo {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {report.signature_data && (
            <div className="mt-6">
              <h2 className="text-xl font-black text-slate-900">Driver Signature</h2>
              <img
                src={report.signature_data}
                alt="Driver Signature"
                className="mt-3 h-28 rounded-xl border bg-slate-50 object-contain p-3"
              />
            </div>
          )}

          {report.remarks && (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <h2 className="font-black text-slate-900">General Remarks</h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">{report.remarks}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function TopCard({
  title,
  value,
  green,
  red,
}: {
  title: string
  value: string
  green?: boolean
  red?: boolean
}) {
  return (
    <div className="rounded-3xl bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
        {title}
      </p>
      <p
        className={`mt-1 text-xl font-black ${
          green ? 'text-emerald-300' : red ? 'text-red-300' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase text-slate-400">{title}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-900">{value}</p>
    </div>
  )
}

function ReportInfo({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  )
}
