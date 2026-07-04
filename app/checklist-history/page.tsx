'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  downloadPdfFromElement,
  sharePdfOrWhatsAppText,
} from '../../lib/pdf/checklistPdf'

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

const COMPANY_NAME = 'PGT Logistic and Transport Services LLC'
const REPORT_TITLE = 'EHS VEHICLE DAILY CHECKLIST'
const PDF_ELEMENT_ID = 'checklist-pdf-report'

export default function ChecklistHistoryPage() {
  const [driver, setDriver] = useState<DriverSession | null>(null)
  const [reports, setReports] = useState<ChecklistReport[]>([])
  const [selectedReport, setSelectedReport] = useState<ChecklistReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfWorking, setPdfWorking] = useState(false)

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

  function openReport(report: ChecklistReport) {
    setSelectedReport(report)
  }

  function makePdfFileName(report: ChecklistReport) {
    const reportNo = (report.report_no || 'VDCL-REPORT').replace(/[^a-zA-Z0-9-_]/g, '-')
    const vehicle = (report.vehicle_no_snapshot || 'VEHICLE').replace(/[^a-zA-Z0-9-_]/g, '-')
    return `${reportNo}-${vehicle}.pdf`
  }

  function makeShareMessage(report: ChecklistReport) {
    return [
      `${REPORT_TITLE}`,
      `${COMPANY_NAME}`,
      `Report No: ${report.report_no || '-'}`,
      `Driver: ${report.driver_name_snapshot || '-'}`,
      `Mobile: ${report.driver_mobile_snapshot || '-'}`,
      `Vehicle: ${report.vehicle_no_snapshot || '-'}`,
      `Trailer: ${report.trailer_no_snapshot || '-'}`,
      `Date: ${report.checklist_date || '-'}`,
      `Status: ${report.status || '-'}`,
      `Fail Count: ${report.fail_count || 0}`,
      report.gps_map_link ? `GPS: ${report.gps_map_link}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  function downloadPdf(report: ChecklistReport) {
    setSelectedReport(report)
    setPdfWorking(true)

    setTimeout(async () => {
      try {
        await downloadChecklistPdf(report)
      } catch (error: any) {
        alert(error.message || 'PDF generation failed')
      } finally {
        setPdfWorking(false)
      }
    }, 500)
  }

  function shareWhatsApp(report: ChecklistReport) {
    setSelectedReport(report)
    setPdfWorking(true)

    setTimeout(async () => {
      try {
        await sharePdfOrWhatsAppText(
          PDF_ELEMENT_ID,
          makePdfFileName(report),
          makeShareMessage(report)
        )
      } catch (error: any) {
        alert(error.message || 'WhatsApp share failed')
      } finally {
        setPdfWorking(false)
      }
    }, 500)
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
      <style jsx global>{`
        @page {
          size: A4;
          margin: 8mm;
        }

        @media print {
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .print-report-wrap {
            position: static !important;
            inset: auto !important;
            display: block !important;
            overflow: visible !important;
            background: white !important;
            padding: 0 !important;
          }

          .a4-report-page {
            width: 194mm !important;
            min-height: 281mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: 1px solid #111827 !important;
            border-radius: 0 !important;
            page-break-after: always;
          }

          .a4-page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="mx-auto max-w-md pb-8 print:max-w-full">
        <header className="no-print rounded-b-[36px] bg-[#070d22] px-5 pb-6 pt-7 text-white shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                VDCL Reports
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight">
                Checklist History
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {driver?.driver_name || 'Driver'} • Professional reports
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
          <section className="no-print mt-5 rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
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

          <section className="no-print mt-5 space-y-4">
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
                    <InfoBox title="Driver" value={report.driver_name_snapshot || '-'} />
                    <InfoBox title="Fail" value={String(report.fail_count || 0)} />
                    <InfoBox title="Date" value={report.checklist_date || '-'} />
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    <button
                      onClick={() => openReport(report)}
                      className="h-12 rounded-2xl bg-blue-900 text-sm font-black text-white"
                    >
                      View
                    </button>

                    <button
                      onClick={() => downloadPdf(report)}
                      disabled={pdfWorking}
                      className="h-12 rounded-2xl bg-slate-800 text-sm font-black text-white"
                    >
                      PDF
                    </button>

                    <button
                      onClick={() => shareWhatsApp(report)}
                      disabled={pdfWorking}
                      className="h-12 rounded-2xl bg-emerald-600 text-sm font-black text-white"
                    >
                      WA
                    </button>

                    {report.gps_map_link ? (
                      <a
                        href={report.gps_map_link}
                        target="_blank"
                        className="flex h-12 items-center justify-center rounded-2xl bg-amber-500 text-sm font-black text-white"
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
              onShare={() => shareWhatsApp(selectedReport)}
              onPdf={() => downloadPdf(selectedReport)}
              pdfWorking={pdfWorking}
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
  onShare,
  onPdf,
  pdfWorking,
}: {
  report: ChecklistReport
  onClose: () => void
  onShare: () => void
  onPdf: () => void
  pdfWorking: boolean
}) {
  const sections = Array.isArray(report.checklist_data)
    ? report.checklist_data
    : []

  const allPhotos = [
    ...(Array.isArray(report.photo_urls) ? report.photo_urls : []),
    report.vehicle_photo_url,
    report.tyre_photo_url,
    report.extra_photo_url,
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index) as string[]

  const failItems = sections.flatMap((section) =>
    section.items
      .filter((item) => item.status === 'FAIL')
      .map((item) => ({
        section: section.title,
        ...item,
      }))
  )

  return (
    <section className="print-report-wrap fixed inset-0 z-50 overflow-auto bg-slate-100 p-4 print:static print:block print:bg-white">
      <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between gap-2">
        <button
          onClick={onClose}
          className="rounded-2xl bg-slate-800 px-5 py-3 font-black text-white"
        >
          Close
        </button>

        <div className="flex gap-2">
          <button
            onClick={onShare}
            disabled={pdfWorking}
            className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white disabled:opacity-60"
          >
            WhatsApp
          </button>

          <button
            onClick={onPdf}
            disabled={pdfWorking}
            className="rounded-2xl bg-blue-900 px-5 py-3 font-black text-white disabled:opacity-60"
          >
            Save PDF
          </button>
        </div>
      </div>

      <div id={PDF_ELEMENT_ID} className="a4-report-page mx-auto bg-white p-5 shadow-2xl">
        <ReportHeader report={report} />

        <div className="mt-4 grid grid-cols-4 border border-black text-[11px]">
          <Cell label="Driver Name" value={report.driver_name_snapshot || '-'} />
          <Cell label="Mobile" value={report.driver_mobile_snapshot || '-'} />
          <Cell label="Vehicle No." value={report.vehicle_no_snapshot || '-'} />
          <Cell label="Trailer No." value={report.trailer_no_snapshot || '-'} />
          <Cell label="Date" value={report.checklist_date || '-'} />
          <Cell
            label="Time"
            value={
              report.checklist_time
                ? new Date(report.checklist_time).toLocaleTimeString()
                : new Date(report.created_at).toLocaleTimeString()
            }
          />
          <Cell label="Status" value={report.status || '-'} strong />
          <Cell label="Fail Count" value={String(report.fail_count || 0)} strong />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          <SummaryBox title="Report No." value={report.report_no || '-'} />
          <SummaryBox title="Checklist Status" value={report.status || '-'} />
          <SummaryBox title="Total Sections" value={String(sections.length)} />
          <SummaryBox title="GPS" value={report.gps_map_link ? 'Captured' : 'Not Captured'} />
        </div>

        <div className="mt-4">
          <h2 className="border border-black bg-[#11a7d9] p-2 text-center text-sm font-black uppercase text-black">
            Checklist Items
          </h2>

          <div className="grid grid-cols-2 gap-3 pt-3">
            {sections.map((section) => (
              <div key={section.key} className="break-inside-avoid border border-black">
                <h3 className="border-b border-black bg-slate-200 p-2 text-sm font-black uppercase">
                  {section.title}
                </h3>

                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="border-b border-r border-black p-1 text-left">Item</th>
                      <th className="border-b border-r border-black p-1">OK</th>
                      <th className="border-b border-r border-black p-1">FAIL</th>
                      <th className="border-b border-black p-1">N/A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => (
                      <tr key={item.key}>
                        <td className="border-r border-t border-black p-1 font-semibold">
                          {item.label}
                        </td>
                        <td className="border-r border-t border-black p-1 text-center">
                          {item.status === 'OK' ? '✓' : ''}
                        </td>
                        <td className="border-r border-t border-black p-1 text-center">
                          {item.status === 'FAIL' ? '✕' : ''}
                        </td>
                        <td className="border-t border-black p-1 text-center">
                          {item.status === 'NA' ? '✓' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        {failItems.length > 0 && (
          <div className="mt-4 break-inside-avoid">
            <h2 className="border border-black bg-red-100 p-2 text-sm font-black uppercase text-red-800">
              Failed Items / Defects
            </h2>

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black p-1 text-left">Section</th>
                  <th className="border border-black p-1 text-left">Item</th>
                  <th className="border border-black p-1 text-left">Remarks</th>
                  <th className="border border-black p-1">Photo</th>
                </tr>
              </thead>
              <tbody>
                {failItems.map((item) => (
                  <tr key={`${item.section}-${item.key}`}>
                    <td className="border border-black p-1">{item.section}</td>
                    <td className="border border-black p-1 font-semibold">{item.label}</td>
                    <td className="border border-black p-1">{item.remarks || '-'}</td>
                    <td className="border border-black p-1 text-center">
                      {item.photo_url ? 'Attached' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 break-inside-avoid">
          <div className="min-h-24 border border-black p-2">
            <h2 className="text-sm font-black uppercase">Remarks</h2>
            <p className="mt-2 text-[11px]">{report.remarks || '-'}</p>
            {report.gps_map_link && (
              <p className="mt-2 break-all text-[10px]">
                GPS: {report.gps_map_link}
              </p>
            )}
          </div>

          <div className="min-h-24 border border-black p-2">
            <h2 className="text-sm font-black uppercase">Driver Signature</h2>
            {report.signature_data ? (
              <img
                src={report.signature_data}
                alt="Driver Signature"
                className="mt-2 h-20 max-w-full object-contain"
              />
            ) : (
              <p className="mt-8 text-[11px] text-slate-500">No signature</p>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-black pt-2 text-center text-[10px] font-semibold">
          This is a system generated Vehicle Daily Checklist report from PGT Driver App.
        </div>
      </div>

      {allPhotos.length > 0 && (
        <div className="a4-report-page a4-page-break mx-auto mt-6 bg-white p-5 shadow-2xl print:mt-0">
          <ReportHeader report={report} small />

          <h2 className="mt-4 border border-black bg-[#11a7d9] p-2 text-center text-sm font-black uppercase text-black">
            Photo Evidence
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {allPhotos.map((url, index) => (
              <div key={url} className="break-inside-avoid border border-black p-2">
                <p className="mb-2 text-xs font-black">Photo {index + 1}</p>
                <img
                  src={url}
                  alt={`Checklist Photo ${index + 1}`}
                  className="h-52 w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function ReportHeader({
  report,
  small,
}: {
  report: ChecklistReport
  small?: boolean
}) {
  return (
    <div className="grid grid-cols-[80px_1fr_190px] items-center gap-3 border border-black p-2">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#070d22] text-lg font-black text-white">
        PGT
      </div>

      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-widest">{COMPANY_NAME}</p>
        <h1 className={`${small ? 'text-lg' : 'text-2xl'} font-black text-black`}>
          {REPORT_TITLE}
        </h1>
        <p className="text-[10px] font-semibold text-slate-600">
          Professional Safety Inspection Report
        </p>
      </div>

      <div className="text-[10px] font-semibold leading-5">
        <p>DTR No: {report.report_no || '-'}</p>
        <p>Date: {report.checklist_date || '-'}</p>
        <p>Status: {report.status || '-'}</p>
      </div>
    </div>
  )
}

function Cell({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="border-b border-r border-black p-2">
      <p className="text-[9px] font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 ${strong ? 'font-black' : 'font-semibold'}`}>{value}</p>
    </div>
  )
}

function SummaryBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 text-center">
      <p className="text-[10px] font-bold uppercase text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
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
