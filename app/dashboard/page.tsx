'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type AdminSession = {
  name: string
  mobile: string
}

type KpiData = {
  todayTrips: number
  pendingTrips: number
  documentsUploadedTrips: number
  verifiedTrips: number
  rejectedTrips: number
  pendingFuelApprovals: number
  todayFuelIssued: number
  lowWalletVehicles: number
  checklistCompleted: number
  checklistPending: number
  checklistFailed: number
  breakdownOpen: number
  totalDrivers: number
  totalVehicles: number
  totalTrailers: number
  totalCompanies: number
}

export default function DashboardPage() {
  const [admin, setAdmin] = useState<AdminSession | null>(null)
  const [loading, setLoading] = useState(true)

  const [kpi, setKpi] = useState<KpiData>({
    todayTrips: 0,
    pendingTrips: 0,
    documentsUploadedTrips: 0,
    verifiedTrips: 0,
    rejectedTrips: 0,
    pendingFuelApprovals: 0,
    todayFuelIssued: 0,
    lowWalletVehicles: 0,
    checklistCompleted: 0,
    checklistPending: 0,
    checklistFailed: 0,
    breakdownOpen: 0,
    totalDrivers: 0,
    totalVehicles: 0,
    totalTrailers: 0,
    totalCompanies: 0,
  })

  useEffect(() => {
    const savedAdmin = localStorage.getItem('pgt_admin')

    if (!savedAdmin) {
      window.location.href = '/'
      return
    }

    setAdmin(JSON.parse(savedAdmin))
    loadKpis()
  }, [])

  async function loadKpis() {
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]

    const tripsRes = await supabase
      .from('trips')
      .select('id, trip_date, status')

    const fuelEntriesRes = await supabase
      .from('fuel_entries')
      .select('id, created_at, issued_gallons')

    const fuelApprovalRes = await supabase
      .from('fuel_approval_requests')
      .select('id, status')

    const walletRes = await supabase
      .from('vehicle_fuel_wallet_view')
      .select('vehicle_id, balance_gallons')

    const checklistsRes = await supabase
      .from('driver_checklists')
      .select('id, vehicle_no_snapshot, status, checklist_date')
      .eq('checklist_date', today)

    const breakdownRes = await supabase
      .from('driver_breakdowns')
      .select('id, status, created_at')

    const driversRes = await supabase
      .from('drivers')
      .select('id')
      .eq('is_active', true)

    const vehiclesRes = await supabase
      .from('vehicles')
      .select('id, vehicle_no, vehicle_number, plate_no')
      .eq('is_active', true)

    const trailersRes = await supabase
      .from('trailers')
      .select('id')
      .eq('is_active', true)

    const companiesRes = await supabase
      .from('companies')
      .select('id')
      .eq('is_active', true)

    const trips = tripsRes.data || []
    const fuelEntries = fuelEntriesRes.data || []
    const fuelApprovals = fuelApprovalRes.data || []
    const wallets = walletRes.data || []
    const vehicles = vehiclesRes.data || []
    const checklists = checklistsRes.data || []
    const breakdowns = breakdownRes.data || []

    const checklistVehicleSet = new Set(
      checklists
        .map((item) => String(item.vehicle_no_snapshot || '').trim().toUpperCase())
        .filter(Boolean)
    )

    const activeVehicleSet = new Set(
      vehicles
        .map((vehicle) =>
          String(
            vehicle.vehicle_no ||
              vehicle.vehicle_number ||
              vehicle.plate_no ||
              ''
          )
            .trim()
            .toUpperCase()
        )
        .filter(Boolean)
    )

    const completedChecklistCount = Array.from(activeVehicleSet).filter((vehicleNo) =>
      checklistVehicleSet.has(vehicleNo)
    ).length

    setKpi({
      todayTrips: trips.filter((trip) => trip.trip_date === today).length,
      pendingTrips: trips.filter((trip) => trip.status === 'Pending').length,
      documentsUploadedTrips: trips.filter(
        (trip) => trip.status === 'Documents Uploaded'
      ).length,
      verifiedTrips: trips.filter((trip) => trip.status === 'Verified').length,
      rejectedTrips: trips.filter((trip) => trip.status === 'Rejected').length,
      pendingFuelApprovals: fuelApprovals.filter(
        (item) => item.status?.toLowerCase() === 'pending'
      ).length,
      todayFuelIssued: fuelEntries
        .filter((entry) => entry.created_at?.startsWith(today))
        .reduce((sum, entry) => sum + Number(entry.issued_gallons || 0), 0),
      lowWalletVehicles: wallets.filter(
        (wallet) => Number(wallet.balance_gallons || 0) <= 10
      ).length,
      checklistCompleted: completedChecklistCount,
      checklistPending: Math.max(vehicles.length - completedChecklistCount, 0),
      checklistFailed: checklists.filter((item) => item.status !== 'OK').length,
      breakdownOpen: breakdowns.filter(
        (item) =>
          !item.status ||
          ['open', 'new', 'pending'].includes(String(item.status).toLowerCase())
      ).length,
      totalDrivers: driversRes.data?.length || 0,
      totalVehicles: vehiclesRes.data?.length || 0,
      totalTrailers: trailersRes.data?.length || 0,
      totalCompanies: companiesRes.data?.length || 0,
    })

    setLoading(false)
  }

  function logout() {
    localStorage.removeItem('pgt_admin')
    window.location.href = '/'
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <header className="overflow-hidden rounded-[32px] bg-[#070d22] text-white shadow-xl">
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                  PGT Enterprise Control Center
                </p>
                <h1 className="mt-3 text-3xl font-black md:text-4xl">
                  Admin Dashboard
                </h1>
                <p className="mt-2 text-slate-300">
                  Welcome, {admin?.name || 'Admin'} — monitor trips, fuel,
                  approvals and fleet operations.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={loadKpis}
                  className="rounded-2xl bg-blue-700 px-5 py-3 font-bold text-white shadow-lg"
                >
                  Refresh
                </button>

                <button
                  onClick={logout}
                  className="rounded-2xl bg-red-600 px-5 py-3 font-bold text-white shadow-lg"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-5">
              <TopCard title="Today Trips" value={kpi.todayTrips} icon="🚛" />
              <TopCard
                title="Fuel Issued Today"
                value={kpi.todayFuelIssued.toFixed(2)}
                icon="⛽"
              />
              <TopCard
                title="Fuel Approvals"
                value={kpi.pendingFuelApprovals}
                icon="⚠️"
              />
              <TopCard
                title="Low Wallets"
                value={kpi.lowWalletVehicles}
                icon="📉"
              />

              <Link href="/admin-breakdowns">
                <TopCard
                  title="Breakdown Alerts"
                  value={kpi.breakdownOpen}
                  icon="🚨"
                  alert={kpi.breakdownOpen > 0}
                />
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="mt-6 rounded-[28px] bg-white p-8 text-center font-semibold text-slate-500 shadow">
            Loading dashboard...
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-5">
              <KpiCard title="Pending Trips" value={kpi.pendingTrips} color="amber" />
              <KpiCard
                title="POD Uploaded"
                value={kpi.documentsUploadedTrips}
                color="blue"
              />
              <KpiCard title="Verified" value={kpi.verifiedTrips} color="green" />
              <KpiCard title="Rejected" value={kpi.rejectedTrips} color="red" />
              <KpiCard title="Drivers" value={kpi.totalDrivers} color="slate" />
            </section>

            <section className="mt-4 grid gap-4 md:grid-cols-4">
              <KpiCard title="Vehicles" value={kpi.totalVehicles} color="slate" />
              <KpiCard title="Trailers" value={kpi.totalTrailers} color="slate" />
              <KpiCard title="Companies" value={kpi.totalCompanies} color="slate" />
              <KpiCard
                title="Pending Fuel"
                value={kpi.pendingFuelApprovals}
                color="amber"
              />
            </section>

            <section className="mt-4 grid gap-4 md:grid-cols-4">
              <KpiCard
                title="Checklist Done"
                value={kpi.checklistCompleted}
                color="green"
              />
              <KpiCard
                title="Checklist Pending"
                value={kpi.checklistPending}
                color="amber"
              />
              <KpiCard
                title="Checklist Failed"
                value={kpi.checklistFailed}
                color="red"
              />
              <KpiCard
                title="Breakdown Open"
                value={kpi.breakdownOpen}
                color="red"
              />
            </section>
          </>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-4">
          <Panel title="Trips Control" icon="🚛">
            <QuickLink href="/admin-trips" title="Admin Trips" desc="Verify, reject, view POD" />
            <QuickLink href="/trips" title="Trip Testing" desc="Trip entry testing screen" />
            <QuickLink href="/reports" title="Trip Reports" desc="Daily and driver reports" />
          </Panel>

          <Panel title="Safety & Compliance" icon="🛡️">
            <QuickLink
              href="/admin-checklists"
              title="Daily Checklist Status"
              desc="Vehicle-wise completed, pending and failed checklists"
            />
            <QuickLink
              href="/checklist-history"
              title="Checklist Reports"
              desc="View, download PDF and WhatsApp share reports"
            />
            <QuickLink
              href="/admin-breakdowns"
              title="Breakdown Alerts"
              desc="Admin breakdown center, GPS, photos and status workflow"
            />
          </Panel>

          <Panel title="Fuel Control" icon="⛽">
            <QuickLink href="/fuel-dashboard" title="Fuel Dashboard" desc="Fuel summary and KPIs" />
            <QuickLink href="/fuel-issue" title="Issue Fuel" desc="Manual fuel issue" />
            <QuickLink href="/fuel-approvals" title="Fuel Approvals" desc="Approve over-fuel" />
            <QuickLink href="/fuel-ledger" title="Fuel Ledger" desc="Vehicle fuel statement" />
            <QuickLink href="/fuel-consumption-report" title="Fuel Report" desc="Consumption report" />
          </Panel>

          <Panel title="Masters" icon="🗂️">
            <QuickLink href="/drivers" title="Drivers" desc="Driver master data" />
            <QuickLink href="/vehicles" title="Vehicles" desc="Vehicle master data" />
            <QuickLink href="/trailers" title="Trailers" desc="Trailer master data" />
            <QuickLink href="/companies" title="Companies" desc="Company master data" />
            <QuickLink href="/fuel-routes" title="Fuel Routes" desc="Route fuel allowance" />
            <QuickLink href="/fuel-sources" title="Fuel Sources" desc="Stations and refuelers" />
          </Panel>
        </section>

        <section className="mt-6 rounded-[28px] bg-white p-6 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Mobile Apps
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">
                Driver & Refueler Access
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Link
                href="/driver-login"
                className="rounded-2xl bg-[#070d22] px-6 py-4 text-center font-black text-white"
              >
                Driver Login
              </Link>

              <Link
                href="/refueler-login"
                className="rounded-2xl bg-emerald-600 px-6 py-4 text-center font-black text-white"
              >
                Refueler Login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function TopCard({
  title,
  value,
  icon,
  alert,
}: {
  title: string
  value: string | number
  icon: string
  alert?: boolean
}) {
  return (
    <div
      className={`rounded-3xl p-5 backdrop-blur transition ${
        alert
          ? 'bg-red-600/25 ring-2 ring-red-400 hover:bg-red-600/35'
          : 'bg-white/10 hover:bg-white/15'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-300">{title}</p>
        <span className={`text-2xl ${alert ? 'animate-pulse' : ''}`}>{icon}</span>
      </div>
      <h2 className={`mt-3 text-3xl font-black ${alert ? 'text-red-200' : 'text-white'}`}>
        {value}
      </h2>
      {alert ? (
        <p className="mt-1 text-xs font-black uppercase tracking-wider text-red-100">
          Action Required
        </p>
      ) : null}
    </div>
  )
}

function KpiCard({
  title,
  value,
  color,
}: {
  title: string
  value: number
  color: 'green' | 'red' | 'blue' | 'amber' | 'slate'
}) {
  const colorClass =
    color === 'green'
      ? 'text-emerald-700 bg-emerald-50'
      : color === 'red'
        ? 'text-red-700 bg-red-50'
        : color === 'blue'
          ? 'text-blue-700 bg-blue-50'
          : color === 'amber'
            ? 'text-amber-700 bg-amber-50'
            : 'text-slate-900 bg-white'

  return (
    <div className={`rounded-[26px] p-5 shadow ${colorClass}`}>
      <p className="text-sm font-semibold opacity-70">{title}</p>
      <h3 className="mt-2 text-3xl font-black">{value}</h3>
    </div>
  )
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[28px] bg-white p-6 shadow">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        <span className="text-3xl">{icon}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string
  title: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-slate-100"
    >
      <p className="font-black text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </Link>
  )
}