'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

type ReportTrip = {
  trip_id: string
  trip_no: number
  trip_date: string
  trip_time: string | null
  driver_name: string | null
  driver_mobile: string | null
  vehicle_number: string | null
  vehicle_type: string | null
  vehicle_size: string | null
  trailer_number: string | null
  company_name: string | null
  from_location: string | null
  to_location: string | null
  trip_allowance: number | null
  trip_amount: number | null
  status: string | null
  documents_uploaded: boolean | null
  documents_uploaded_at: string | null
  verified_at: string | null
  remarks: string | null
  admin_notes: string | null
  document_count: number | null
}

export default function ReportsPage() {
  const [trips, setTrips] = useState<ReportTrip[]>([])
  const [loading, setLoading] = useState(false)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [driverName, setDriverName] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    loadTrips()
  }, [])

  async function loadTrips() {
    setLoading(true)

    const { data, error } = await supabase
      .from('reports_trip_detail_view')
      .select('*')
      .order('trip_no', { ascending: false })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setTrips(data || [])
  }

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (dateFrom && trip.trip_date < dateFrom) return false
      if (dateTo && trip.trip_date > dateTo) return false
      if (driverName && trip.driver_name !== driverName) return false
      if (vehicleNumber && trip.vehicle_number !== vehicleNumber) return false
      if (companyName && trip.company_name !== companyName) return false
      if (status && trip.status !== status) return false
      return true
    })
  }, [trips, dateFrom, dateTo, driverName, vehicleNumber, companyName, status])

  const drivers = Array.from(
    new Set(trips.map((trip) => trip.driver_name).filter(Boolean))
  ) as string[]

  const vehicles = Array.from(
    new Set(trips.map((trip) => trip.vehicle_number).filter(Boolean))
  ) as string[]

  const companies = Array.from(
    new Set(trips.map((trip) => trip.company_name).filter(Boolean))
  ) as string[]

  const statuses = Array.from(
    new Set(trips.map((trip) => trip.status).filter(Boolean))
  ) as string[]

  const totalTrips = filteredTrips.length
  const totalAllowance = filteredTrips.reduce(
    (sum, trip) => sum + Number(trip.trip_allowance || 0),
    0
  )
  const totalAmount = filteredTrips.reduce(
    (sum, trip) => sum + Number(trip.trip_amount || 0),
    0
  )
  const verifiedTrips = filteredTrips.filter(
    (trip) => trip.status === 'Verified'
  ).length
  const pendingTrips = filteredTrips.filter(
    (trip) => trip.status === 'Pending'
  ).length
  const documentsUploadedTrips = filteredTrips.filter(
    (trip) => trip.status === 'Documents Uploaded'
  ).length
  const rejectedTrips = filteredTrips.filter(
    (trip) => trip.status === 'Rejected'
  ).length

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setDriverName('')
    setVehicleNumber('')
    setCompanyName('')
    setStatus('')
  }

  function exportExcel() {
    const exportData = filteredTrips.map((trip) => ({
      'Trip No': trip.trip_no,
      Date: trip.trip_date,
      Time: trip.trip_time || '',
      Driver: trip.driver_name || '',
      'Driver Mobile': trip.driver_mobile || '',
      Vehicle: trip.vehicle_number || '',
      'Vehicle Type': trip.vehicle_type || '',
      'Vehicle Size': trip.vehicle_size || '',
      Trailer: trip.trailer_number || '',
      Company: trip.company_name || '',
      From: trip.from_location || '',
      To: trip.to_location || '',
      Allowance: trip.trip_allowance || 0,
      Amount: trip.trip_amount || 0,
      Status: trip.status || '',
      'Documents Uploaded': trip.documents_uploaded ? 'Yes' : 'No',
      'Document Count': trip.document_count || 0,
      Remarks: trip.remarks || '',
      'Admin Notes': trip.admin_notes || '',
      'Created At': trip.trip_date || '',
      'Verified At': trip.verified_at || '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trip Report')

    XLSX.writeFile(workbook, 'PGT_Trip_Report.xlsx')
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Reports
          </h1>
          <p className="mt-1 text-slate-500">
            Daily, driver-wise, vehicle-wise, company-wise trip reports with Excel export.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          <SummaryCard title="Total Trips" value={totalTrips} />
          <SummaryCard title="Total Allowance" value={totalAllowance.toFixed(2)} />
          <SummaryCard title="Total Amount" value={totalAmount.toFixed(2)} />
          <SummaryCard title="Verified" value={verifiedTrips} />
          <SummaryCard title="Pending" value={pendingTrips} />
          <SummaryCard title="Rejected" value={rejectedTrips} />
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Filters
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <select
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            >
              <option value="">All Drivers</option>
              {drivers.map((driver) => (
                <option key={driver} value={driver}>
                  {driver}
                </option>
              ))}
            </select>

            <select
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle} value={vehicle}>
                  {vehicle}
                </option>
              ))}
            </select>

            <select
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            >
              <option value="">All Status</option>
              {statuses.map((tripStatus) => (
                <option key={tripStatus} value={tripStatus}>
                  {tripStatus}
                </option>
              ))}
            </select>

            <button
              onClick={clearFilters}
              className="rounded-xl bg-slate-600 p-3 font-semibold text-white"
            >
              Clear Filters
            </button>

            <button
              onClick={exportExcel}
              className="rounded-xl bg-green-700 p-3 font-semibold text-white"
            >
              Export Excel
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-auto rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Trip Report
            </h2>
            <p className="text-sm text-slate-500">
              Showing {filteredTrips.length} records
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading...</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-slate-700">
                  <th className="p-3 text-left">Trip No</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Driver</th>
                  <th className="p-3 text-left">Vehicle</th>
                  <th className="p-3 text-left">Trailer</th>
                  <th className="p-3 text-left">Company</th>
                  <th className="p-3 text-left">From</th>
                  <th className="p-3 text-left">To</th>
                  <th className="p-3 text-left">Allowance</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Docs</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredTrips.map((trip) => (
                  <tr key={trip.trip_id} className="border-b text-slate-900">
                    <td className="p-3 font-semibold">{trip.trip_no}</td>
                    <td className="p-3">{trip.trip_date}</td>
                    <td className="p-3">{trip.driver_name || '-'}</td>
                    <td className="p-3">{trip.vehicle_number || '-'}</td>
                    <td className="p-3">{trip.trailer_number || '-'}</td>
                    <td className="p-3">{trip.company_name || '-'}</td>
                    <td className="p-3">{trip.from_location || '-'}</td>
                    <td className="p-3">{trip.to_location || '-'}</td>
                    <td className="p-3">{trip.trip_allowance || 0}</td>
                    <td className="p-3">{trip.trip_amount || 0}</td>
                    <td className="p-3">{trip.document_count || 0}</td>
                    <td className="p-3">{trip.status || '-'}</td>
                  </tr>
                ))}

                {filteredTrips.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-6 text-center text-slate-500">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <SummaryCard title="Documents Uploaded" value={documentsUploadedTrips} />
          <SummaryCard title="Unique Drivers" value={drivers.length} />
          <SummaryCard title="Unique Vehicles" value={vehicles.length} />
          <SummaryCard title="Unique Companies" value={companies.length} />
        </div>
      </div>
    </main>
  )
}

function SummaryCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </h3>
    </div>
  )
}