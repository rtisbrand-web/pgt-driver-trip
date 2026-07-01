'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type RelationArray<T> = T[] | T | null

type Vehicle = { id: string; vehicle_number: string }
type Driver = { id: string; driver_name: string }
type Company = { id: string; company_name: string }

type Trip = {
  id: string
  trip_no: number
  trip_date: string
  vehicle_id: string | null
  driver_id: string | null
  company_id: string | null
  from_location: string | null
  to_location: string | null
  allowed_fuel_gallons: number | null
  fuel_calculated: boolean | null
  status: string | null
  vehicles: RelationArray<{ vehicle_number: string }>
  drivers: RelationArray<{ driver_name: string }>
  companies: RelationArray<{ company_name: string }>
}

type FuelEntry = {
  id: string
  created_at: string
  bill_no: string | null
  vehicle_id: string | null
  driver_id: string | null
  issued_gallons: number | null
  wallet_used_gallons: number | null
  extra_approved_gallons: number | null
  status: string | null
  fuel_type: string | null
  vehicles: RelationArray<{ vehicle_number: string }>
  drivers: RelationArray<{ driver_name: string }>
}

type ReportRow = {
  vehicleId: string
  vehicle: string
  driver: string
  company: string
  trips: number
  earned: number
  issued: number
  extra: number
  balance: number
}

function firstRelation<T>(value: RelationArray<T>): T | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

export default function FuelConsumptionReportPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  const [trips, setTrips] = useState<Trip[]>([])
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([])
  const [loading, setLoading] = useState(false)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    loadMasters()
    loadReport()
  }, [])

  async function loadMasters() {
    const vehiclesRes = await supabase
      .from('vehicles')
      .select('id, vehicle_number')
      .eq('is_active', true)
      .order('vehicle_number')

    const driversRes = await supabase
      .from('drivers')
      .select('id, driver_name')
      .eq('is_active', true)
      .order('driver_name')

    const companiesRes = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('is_active', true)
      .order('company_name')

    setVehicles((vehiclesRes.data || []) as Vehicle[])
    setDrivers((driversRes.data || []) as Driver[])
    setCompanies((companiesRes.data || []) as Company[])
  }

  async function loadReport() {
    setLoading(true)

    let tripQuery = supabase
      .from('trips')
      .select(`
        id,
        trip_no,
        trip_date,
        vehicle_id,
        driver_id,
        company_id,
        from_location,
        to_location,
        allowed_fuel_gallons,
        fuel_calculated,
        status,
        vehicles(vehicle_number),
        drivers(driver_name),
        companies(company_name)
      `)
      .order('trip_date', { ascending: false })

    if (dateFrom) tripQuery = tripQuery.gte('trip_date', dateFrom)
    if (dateTo) tripQuery = tripQuery.lte('trip_date', dateTo)
    if (vehicleId) tripQuery = tripQuery.eq('vehicle_id', vehicleId)
    if (driverId) tripQuery = tripQuery.eq('driver_id', driverId)
    if (companyId) tripQuery = tripQuery.eq('company_id', companyId)

    let fuelQuery = supabase
      .from('fuel_entries')
      .select(`
        id,
        created_at,
        bill_no,
        vehicle_id,
        driver_id,
        issued_gallons,
        wallet_used_gallons,
        extra_approved_gallons,
        status,
        fuel_type,
        vehicles(vehicle_number),
        drivers(driver_name)
      `)
      .order('created_at', { ascending: false })

    if (dateFrom) fuelQuery = fuelQuery.gte('created_at', `${dateFrom}T00:00:00`)
    if (dateTo) fuelQuery = fuelQuery.lte('created_at', `${dateTo}T23:59:59`)
    if (vehicleId) fuelQuery = fuelQuery.eq('vehicle_id', vehicleId)
    if (driverId) fuelQuery = fuelQuery.eq('driver_id', driverId)

    const [tripRes, fuelRes] = await Promise.all([tripQuery, fuelQuery])

    setLoading(false)

    if (tripRes.error) {
      alert(tripRes.error.message)
      return
    }

    if (fuelRes.error) {
      alert(fuelRes.error.message)
      return
    }

    setTrips((tripRes.data || []) as unknown as Trip[])
    setFuelEntries((fuelRes.data || []) as unknown as FuelEntry[])
  }

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setVehicleId('')
    setDriverId('')
    setCompanyId('')
  }

  const reportRows = useMemo(() => {
    const map = new Map<string, ReportRow>()

    trips.forEach((trip) => {
      const tripVehicle = firstRelation(trip.vehicles)
      const tripDriver = firstRelation(trip.drivers)
      const tripCompany = firstRelation(trip.companies)

      const vId = trip.vehicle_id || 'unknown'

      const existing = map.get(vId) || {
        vehicleId: vId,
        vehicle: tripVehicle?.vehicle_number || '-',
        driver: tripDriver?.driver_name || '-',
        company: tripCompany?.company_name || '-',
        trips: 0,
        earned: 0,
        issued: 0,
        extra: 0,
        balance: 0,
      }

      if (trip.status?.toLowerCase().trim() === 'verified') {
        existing.trips += 1
        existing.earned += Number(trip.allowed_fuel_gallons || 0)
      }

      map.set(vId, existing)
    })

    fuelEntries.forEach((entry) => {
      const entryVehicle = firstRelation(entry.vehicles)
      const entryDriver = firstRelation(entry.drivers)

      const vId = entry.vehicle_id || 'unknown'

      const existing = map.get(vId) || {
        vehicleId: vId,
        vehicle: entryVehicle?.vehicle_number || '-',
        driver: entryDriver?.driver_name || '-',
        company: '-',
        trips: 0,
        earned: 0,
        issued: 0,
        extra: 0,
        balance: 0,
      }

      existing.issued += Number(entry.wallet_used_gallons || 0)
      existing.extra += Number(entry.extra_approved_gallons || 0)

      map.set(vId, existing)
    })

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        balance: row.earned - row.issued,
      }))
      .sort((a, b) => b.issued - a.issued)
  }, [trips, fuelEntries])

  const totals = useMemo(() => {
    return reportRows.reduce(
      (acc, row) => {
        acc.trips += row.trips
        acc.earned += row.earned
        acc.issued += row.issued
        acc.extra += row.extra
        acc.balance += row.balance
        return acc
      },
      { trips: 0, earned: 0, issued: 0, extra: 0, balance: 0 }
    )
  }, [reportRows])

  function exportCsv() {
    const header = [
      'Vehicle',
      'Driver',
      'Company',
      'Verified Trips',
      'Wallet Earned',
      'Wallet Used',
      'Approved Extra',
      'Balance',
    ]

    const rows = reportRows.map((row) => [
      row.vehicle,
      row.driver,
      row.company,
      row.trips,
      row.earned.toFixed(2),
      row.issued.toFixed(2),
      row.extra.toFixed(2),
      row.balance.toFixed(2),
    ])

    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'fuel-consumption-report.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    window.print()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6 print:bg-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow print:shadow-none">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Vehicle Fuel Consumption Report
              </h1>
              <p className="mt-1 text-slate-500">
                Vehicle-wise earned fuel, issued fuel, approved extra, and balance report.
              </p>
            </div>

            <div className="flex gap-3 print:hidden">
              <button
                onClick={exportCsv}
                className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white"
              >
                Export Excel
              </button>

              <button
                onClick={printReport}
                className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white"
              >
                Print / PDF
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow print:hidden">
          <div className="grid gap-4 md:grid-cols-6">
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
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicle_number}
                </option>
              ))}
            </select>

            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            >
              <option value="">All Drivers</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.driver_name}
                </option>
              ))}
            </select>

            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.company_name}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={loadReport}
                className="w-full rounded-xl bg-blue-900 p-3 font-semibold text-white"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="w-full rounded-xl bg-slate-700 p-3 font-semibold text-white"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <Card title="Verified Trips" value={totals.trips.toString()} />
          <Card title="Wallet Earned" value={totals.earned.toFixed(2)} />
          <Card title="Wallet Used" value={totals.issued.toFixed(2)} />
          <Card title="Approved Extra" value={totals.extra.toFixed(2)} red />
          <Card title="Balance" value={totals.balance.toFixed(2)} green />
        </div>

        <div className="overflow-auto rounded-2xl bg-white p-6 shadow print:shadow-none">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Consumption Summary
          </h2>

          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-slate-700">
                  <th className="p-3 text-left">S.No</th>
                  <th className="p-3 text-left">Vehicle</th>
                  <th className="p-3 text-left">Driver</th>
                  <th className="p-3 text-left">Company</th>
                  <th className="p-3 text-left">Verified Trips</th>
                  <th className="p-3 text-left">Wallet Earned</th>
                  <th className="p-3 text-left">Wallet Used</th>
                  <th className="p-3 text-left">Approved Extra</th>
                  <th className="p-3 text-left">Balance</th>
                </tr>
              </thead>

              <tbody>
                {reportRows.map((row, index) => (
                  <tr key={row.vehicleId} className="border-b text-slate-900">
                    <td className="p-3 font-semibold">{index + 1}</td>
                    <td className="p-3 font-bold">{row.vehicle}</td>
                    <td className="p-3">{row.driver}</td>
                    <td className="p-3">{row.company}</td>
                    <td className="p-3">{row.trips}</td>
                    <td className="p-3 font-semibold text-green-700">
                      {row.earned.toFixed(2)}
                    </td>
                    <td className="p-3 font-semibold text-blue-700">
                      {row.issued.toFixed(2)}
                    </td>
                    <td className="p-3 font-bold text-red-600">
                      {row.extra.toFixed(2)}
                    </td>
                    <td className="p-3 font-bold">
                      {row.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}

                {reportRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">
                      No report data found.
                    </td>
                  </tr>
                )}
              </tbody>

              {reportRows.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-slate-50 font-bold text-slate-900">
                    <td className="p-3" colSpan={4}>
                      Total
                    </td>
                    <td className="p-3">{totals.trips}</td>
                    <td className="p-3 text-green-700">
                      {totals.earned.toFixed(2)}
                    </td>
                    <td className="p-3 text-blue-700">
                      {totals.issued.toFixed(2)}
                    </td>
                    <td className="p-3 text-red-600">
                      {totals.extra.toFixed(2)}
                    </td>
                    <td className="p-3">{totals.balance.toFixed(2)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </main>
  )
}

function Card({
  title,
  value,
  red,
  green,
}: {
  title: string
  value: string
  red?: boolean
  green?: boolean
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow print:shadow-none">
      <p className="text-sm text-slate-500">{title}</p>
      <h2
        className={`mt-2 text-2xl font-bold ${
          red ? 'text-red-700' : green ? 'text-green-700' : 'text-slate-900'
        }`}
      >
        {value}
      </h2>
    </div>
  )
}