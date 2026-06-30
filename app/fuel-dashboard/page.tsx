'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type FuelEntry = {
  id: string
  bill_no: string | null
  created_at: string
  vehicle_id: string
  driver_id: string | null
  issued_gallons: number | null
  wallet_used_gallons: number | null
  extra_approved_gallons: number | null
  balance_before: number | null
  balance_after: number | null
  fuel_type: string | null
  status: string | null
  remarks: string | null
  vehicles: { vehicle_number: string } | null
  drivers: { driver_name: string } | null
}

type ApprovalRequest = {
  id: string
  created_at: string
  requested_gallons: number
  allowed_balance_gallons: number
  extra_gallons: number
  status: string
  reason: string | null
  vehicles: { vehicle_number: string } | null
}

type Wallet = {
  vehicle_id: string
  vehicle_number: string
  earned_gallons: number
  issued_gallons: number
  balance_gallons: number
}

export default function FuelDashboardPage() {
  const [entries, setEntries] = useState<FuelEntry[]>([])
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)

    const entriesRes = await supabase
      .from('fuel_entries')
      .select(`
        id,
        bill_no,
        created_at,
        vehicle_id,
        driver_id,
        issued_gallons,
        wallet_used_gallons,
        extra_approved_gallons,
        balance_before,
        balance_after,
        fuel_type,
        status,
        remarks,
        vehicles(vehicle_number),
        drivers(driver_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    const requestsRes = await supabase
      .from('fuel_approval_requests')
      .select(`
        id,
        created_at,
        requested_gallons,
        allowed_balance_gallons,
        extra_gallons,
        status,
        reason,
        vehicles(vehicle_number)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    const walletsRes = await supabase
      .from('vehicle_fuel_wallet_view')
      .select('*')
      .order('balance_gallons', { ascending: true })

    setLoading(false)

    if (entriesRes.error) {
      alert(entriesRes.error.message)
      return
    }

    if (requestsRes.error) {
      alert(requestsRes.error.message)
      return
    }

    if (walletsRes.error) {
      alert(walletsRes.error.message)
      return
    }

    setEntries((entriesRes.data || []) as FuelEntry[])
    setRequests((requestsRes.data || []) as ApprovalRequest[])
    setWallets((walletsRes.data || []) as Wallet[])
  }

  const today = new Date().toISOString().split('T')[0]

  const stats = useMemo(() => {
    const todayEntries = entries.filter((entry) =>
      entry.created_at?.startsWith(today)
    )

    const todayRequests = requests.filter((request) =>
      request.created_at?.startsWith(today)
    )

    const totalTodayIssued = todayEntries.reduce(
      (sum, entry) => sum + Number(entry.issued_gallons || 0),
      0
    )

    const totalTodayExtra = todayEntries.reduce(
      (sum, entry) => sum + Number(entry.extra_approved_gallons || 0),
      0
    )

    const pendingApprovals = requests.filter(
      (request) => request.status?.toLowerCase() === 'pending'
    )

    const approvedToday = todayRequests.filter(
      (request) => request.status?.toLowerCase() === 'approved'
    )

    const rejectedToday = todayRequests.filter(
      (request) => request.status?.toLowerCase() === 'rejected'
    )

    const totalWalletBalance = wallets.reduce(
      (sum, wallet) => sum + Number(wallet.balance_gallons || 0),
      0
    )

    return {
      todayFuelEntries: todayEntries.length,
      totalTodayIssued,
      totalTodayExtra,
      pendingApprovals: pendingApprovals.length,
      approvedToday: approvedToday.length,
      rejectedToday: rejectedToday.length,
      totalWalletBalance,
    }
  }, [entries, requests, wallets, today])

  const topVehicles = useMemo(() => {
    const map = new Map<string, { vehicle: string; gallons: number }>()

    entries.forEach((entry) => {
      const vehicle = entry.vehicles?.vehicle_number || '-'
      const current = map.get(vehicle) || { vehicle, gallons: 0 }
      current.gallons += Number(entry.issued_gallons || 0)
      map.set(vehicle, current)
    })

    return Array.from(map.values())
      .sort((a, b) => b.gallons - a.gallons)
      .slice(0, 10)
  }, [entries])

  function badge(status: string | null) {
    const value = status || '-'
    const s = value.toLowerCase()

    if (s.includes('approved')) {
      return 'rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700'
    }

    if (s.includes('rejected')) {
      return 'rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700'
    }

    if (s.includes('pending')) {
      return 'rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700'
    }

    return 'rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700'
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Admin Fuel Dashboard
              </h1>
              <p className="mt-1 text-slate-500">
                Fuel issue summary, approvals, wallet balances, and recent fuel activity.
              </p>
            </div>

            <button
              onClick={loadDashboard}
              className="rounded-xl bg-blue-900 px-6 py-3 font-semibold text-white"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="mb-6 rounded-2xl bg-white p-6 text-center text-slate-500 shadow">
            Loading dashboard...
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Today Fuel Entries</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {stats.todayFuelEntries}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Today Issued Gallons</p>
            <h2 className="mt-2 text-2xl font-bold text-blue-700">
              {stats.totalTodayIssued.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Today Extra Approved</p>
            <h2 className="mt-2 text-2xl font-bold text-red-700">
              {stats.totalTodayExtra.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Total Wallet Balance</p>
            <h2 className="mt-2 text-2xl font-bold text-green-700">
              {stats.totalWalletBalance.toFixed(2)}
            </h2>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Pending Approvals</p>
            <h2 className="mt-2 text-2xl font-bold text-yellow-700">
              {stats.pendingApprovals}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Approved Today</p>
            <h2 className="mt-2 text-2xl font-bold text-green-700">
              {stats.approvedToday}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Rejected Today</p>
            <h2 className="mt-2 text-2xl font-bold text-red-700">
              {stats.rejectedToday}
            </h2>
          </div>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="overflow-auto rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Pending / Recent Approval Requests
            </h2>

            <table className="w-full">
              <thead>
                <tr className="border-b text-slate-700">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Vehicle</th>
                  <th className="p-3 text-left">Requested</th>
                  <th className="p-3 text-left">Extra</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {requests.slice(0, 10).map((request) => (
                  <tr key={request.id} className="border-b text-slate-900">
                    <td className="p-3">
                      {new Date(request.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold">
                      {request.vehicles?.vehicle_number || '-'}
                    </td>
                    <td className="p-3 font-semibold">
                      {Number(request.requested_gallons || 0).toFixed(2)}
                    </td>
                    <td className="p-3 font-bold text-red-600">
                      {Number(request.extra_gallons || 0).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className={badge(request.status)}>
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {requests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No approval requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-auto rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Low Wallet Vehicles
            </h2>

            <table className="w-full">
              <thead>
                <tr className="border-b text-slate-700">
                  <th className="p-3 text-left">Vehicle</th>
                  <th className="p-3 text-left">Earned</th>
                  <th className="p-3 text-left">Used</th>
                  <th className="p-3 text-left">Balance</th>
                </tr>
              </thead>

              <tbody>
                {wallets.slice(0, 10).map((wallet) => (
                  <tr key={wallet.vehicle_id} className="border-b text-slate-900">
                    <td className="p-3 font-semibold">{wallet.vehicle_number}</td>
                    <td className="p-3">
                      {Number(wallet.earned_gallons || 0).toFixed(2)}
                    </td>
                    <td className="p-3">
                      {Number(wallet.issued_gallons || 0).toFixed(2)}
                    </td>
                    <td className="p-3 font-bold">
                      {Number(wallet.balance_gallons || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {wallets.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      No wallet data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-6 overflow-auto rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Recent Fuel Issues
          </h2>

          <table className="w-full">
            <thead>
              <tr className="border-b text-slate-700">
                <th className="p-3 text-left">Bill No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Vehicle</th>
                <th className="p-3 text-left">Driver</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Issued</th>
                <th className="p-3 text-left">Wallet Used</th>
                <th className="p-3 text-left">Extra</th>
                <th className="p-3 text-left">After</th>
              </tr>
            </thead>

            <tbody>
              {entries.slice(0, 20).map((entry) => (
                <tr key={entry.id} className="border-b text-slate-900">
                  <td className="p-3 font-bold text-blue-700">
                    {entry.bill_no || '-'}
                  </td>
                  <td className="p-3">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-semibold">
                    {entry.vehicles?.vehicle_number || '-'}
                  </td>
                  <td className="p-3">{entry.drivers?.driver_name || '-'}</td>
                  <td className="p-3">
                    <span className={badge(entry.fuel_type || entry.status)}>
                      {entry.fuel_type || entry.status || '-'}
                    </span>
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
                    {Number(entry.balance_after || 0).toFixed(2)}
                  </td>
                </tr>
              ))}

              {entries.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    No fuel issues found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-auto rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Top Vehicles by Fuel Issued
          </h2>

          <table className="w-full">
            <thead>
              <tr className="border-b text-slate-700">
                <th className="p-3 text-left">Rank</th>
                <th className="p-3 text-left">Vehicle</th>
                <th className="p-3 text-left">Issued Gallons</th>
              </tr>
            </thead>

            <tbody>
              {topVehicles.map((item, index) => (
                <tr key={item.vehicle} className="border-b text-slate-900">
                  <td className="p-3 font-semibold">{index + 1}</td>
                  <td className="p-3 font-semibold">{item.vehicle}</td>
                  <td className="p-3 font-bold text-blue-700">
                    {item.gallons.toFixed(2)}
                  </td>
                </tr>
              ))}

              {topVehicles.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-slate-500">
                    No fuel vehicle ranking found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}