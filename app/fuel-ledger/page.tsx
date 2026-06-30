'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Vehicle = {
  id: string
  vehicle_number: string
}

type Wallet = {
  vehicle_id: string
  vehicle_number: string
  earned_gallons: number
  issued_gallons: number
  balance_gallons: number
}

type FuelEntry = {
  id: string
  bill_no: string | null
  created_at: string
  vehicle_id: string
  driver_id: string | null
  fuel_source_type: string | null
  requested_gallons: number | null
  issued_gallons: number | null
  wallet_used_gallons: number | null
  extra_approved_gallons: number | null
  balance_before: number | null
  balance_after: number | null
  fuel_type: string | null
  status: string | null
  remarks: string | null
  gps_map_link: string | null
  vehicles: { vehicle_number: string } | null
  drivers: { driver_name: string } | null
  fuel_stations: { station_name: string } | null
  refueling_vehicles: { vehicle_number: string } | null
}

export default function FuelLedgerPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vehicleId, setVehicleId] = useState('')
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [entries, setEntries] = useState<FuelEntry[]>([])
  const [loading, setLoading] = useState(false)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, vehicle_number')
      .eq('is_active', true)
      .order('vehicle_number')

    if (error) {
      alert(error.message)
      return
    }

    setVehicles(data || [])
  }

  async function loadLedger(selectedVehicleId: string) {
    setVehicleId(selectedVehicleId)
    setWallet(null)
    setEntries([])

    if (!selectedVehicleId) return

    setLoading(true)

    const walletRes = await supabase
      .from('vehicle_fuel_wallet_view')
      .select('*')
      .eq('vehicle_id', selectedVehicleId)
      .maybeSingle()

    if (walletRes.error) {
      setLoading(false)
      alert(walletRes.error.message)
      return
    }

    let query = supabase
      .from('fuel_entries')
      .select(`
        *,
        vehicles(vehicle_number),
        drivers(driver_name),
        fuel_stations(station_name),
        refueling_vehicles(vehicle_number)
      `)
      .eq('vehicle_id', selectedVehicleId)
      .order('created_at', { ascending: false })

    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`)
    }

    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`)
    }

    const entriesRes = await query

    setLoading(false)

    if (entriesRes.error) {
      alert(entriesRes.error.message)
      return
    }

    setWallet(walletRes.data as Wallet)
    setEntries((entriesRes.data || []) as FuelEntry[])
  }

  async function applyFilters() {
    if (!vehicleId) {
      alert('Please select vehicle first')
      return
    }

    await loadLedger(vehicleId)
  }

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
  }

  function sourceName(entry: FuelEntry) {
    if (entry.fuel_stations?.station_name) {
      return entry.fuel_stations.station_name
    }

    if (entry.refueling_vehicles?.vehicle_number) {
      return `Company Vehicle - ${entry.refueling_vehicles.vehicle_number}`
    }

    return entry.fuel_source_type || '-'
  }

  function typeBadge(type: string | null, status: string | null) {
    const value = type || status || '-'
    const lower = value.toLowerCase()

    if (lower.includes('approved extra')) {
      return (
        <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
          Approved Extra
        </span>
      )
    }

    if (lower.includes('normal')) {
      return (
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
          Normal
        </span>
      )
    }

    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
        {value}
      </span>
    )
  }

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc.issued += Number(entry.issued_gallons || 0)
        acc.walletUsed += Number(entry.wallet_used_gallons || 0)
        acc.extra += Number(entry.extra_approved_gallons || 0)
        return acc
      },
      { issued: 0, walletUsed: 0, extra: 0 }
    )
  }, [entries])

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Vehicle Fuel Ledger
          </h1>
          <p className="mt-1 text-slate-500">
            Vehicle wise fuel wallet, issued fuel, approved extra fuel, and balance history.
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <div className="grid gap-4 md:grid-cols-4">
            <select
              value={vehicleId}
              onChange={(e) => loadLedger(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            >
              <option value="">Select Vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicle_number}
                </option>
              ))}
            </select>

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

            <div className="flex gap-2">
              <button
                onClick={applyFilters}
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

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Earned Gallons</p>
            <h2 className="mt-2 text-2xl font-bold text-green-700">
              {Number(wallet?.earned_gallons || 0).toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Wallet Used</p>
            <h2 className="mt-2 text-2xl font-bold text-blue-700">
              {Number(wallet?.issued_gallons || 0).toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Approved Extra</p>
            <h2 className="mt-2 text-2xl font-bold text-red-700">
              {totals.extra.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Balance Gallons</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {Number(wallet?.balance_gallons || 0).toFixed(2)}
            </h2>
          </div>
        </div>

        <div className="overflow-auto rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Fuel Ledger History
          </h2>

          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-slate-700">
                  <th className="p-3 text-left">S.No</th>
                  <th className="p-3 text-left">Bill No</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Vehicle</th>
                  <th className="p-3 text-left">Driver</th>
                  <th className="p-3 text-left">Source</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Issued</th>
                  <th className="p-3 text-left">Wallet Used</th>
                  <th className="p-3 text-left">Extra</th>
                  <th className="p-3 text-left">Before</th>
                  <th className="p-3 text-left">After</th>
                  <th className="p-3 text-left">GPS</th>
                  <th className="p-3 text-left">Remarks</th>
                </tr>
              </thead>

              <tbody>
                {entries.map((entry, index) => (
                  <tr key={entry.id} className="border-b text-slate-900">
                    <td className="p-3 font-semibold">{index + 1}</td>

                    <td className="p-3 font-bold text-blue-700">
                      {entry.bill_no || '-'}
                    </td>

                    <td className="p-3">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>

                    <td className="p-3 font-semibold">
                      {entry.vehicles?.vehicle_number || '-'}
                    </td>

                    <td className="p-3">
                      {entry.drivers?.driver_name || '-'}
                    </td>

                    <td className="p-3">{sourceName(entry)}</td>

                    <td className="p-3">
                      {typeBadge(entry.fuel_type, entry.status)}
                    </td>

                    <td className="p-3 font-semibold">
                      {Number(entry.issued_gallons || 0).toFixed(2)}
                    </td>

                    <td className="p-3">
                      {Number(entry.wallet_used_gallons || 0).toFixed(2)}
                    </td>

                    <td className="p-3 font-bold text-red-600">
                      {Number(entry.extra_approved_gallons || 0).toFixed(2)}
                    </td>

                    <td className="p-3">
                      {Number(entry.balance_before || 0).toFixed(2)}
                    </td>

                    <td className="p-3">
                      {Number(entry.balance_after || 0).toFixed(2)}
                    </td>

                    <td className="p-3">
                      {entry.gps_map_link ? (
                        <a
                          href={entry.gps_map_link}
                          target="_blank"
                          className="font-semibold text-blue-700 underline"
                        >
                          Map
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="p-3">{entry.remarks || '-'}</td>
                  </tr>
                ))}

                {entries.length === 0 && (
                  <tr>
                    <td colSpan={14} className="p-6 text-center text-slate-500">
                      No fuel ledger entries found.
                    </td>
                  </tr>
                )}
              </tbody>

              {entries.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-slate-50 font-bold text-slate-900">
                    <td className="p-3" colSpan={7}>
                      Total
                    </td>
                    <td className="p-3">{totals.issued.toFixed(2)}</td>
                    <td className="p-3">{totals.walletUsed.toFixed(2)}</td>
                    <td className="p-3 text-red-600">{totals.extra.toFixed(2)}</td>
                    <td className="p-3" colSpan={4}></td>
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