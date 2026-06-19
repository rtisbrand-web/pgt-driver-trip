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
  totalDrivers: number
  totalVehicles: number
  totalTrailers: number
  totalCompanies: number
}

export default function DashboardPage() {
  const [admin, setAdmin] = useState<AdminSession | null>(null)
  const [kpi, setKpi] = useState<KpiData>({
    todayTrips: 0,
    pendingTrips: 0,
    documentsUploadedTrips: 0,
    verifiedTrips: 0,
    rejectedTrips: 0,
    totalDrivers: 0,
    totalVehicles: 0,
    totalTrailers: 0,
    totalCompanies: 0,
  })
  const [loading, setLoading] = useState(true)

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

    const driversRes = await supabase
      .from('drivers')
      .select('id')
      .eq('is_active', true)

    const vehiclesRes = await supabase
      .from('vehicles')
      .select('id')
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

    setKpi({
      todayTrips: trips.filter((trip) => trip.trip_date === today).length,
      pendingTrips: trips.filter((trip) => trip.status === 'Pending').length,
      documentsUploadedTrips: trips.filter(
        (trip) => trip.status === 'Documents Uploaded'
      ).length,
      verifiedTrips: trips.filter((trip) => trip.status === 'Verified').length,
      rejectedTrips: trips.filter((trip) => trip.status === 'Rejected').length,
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
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl bg-slate-950 p-6 text-white shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                PGT Driver Trip Dashboard
              </h1>
              <p className="mt-2 text-slate-300">
                Welcome, {admin?.name || 'Admin'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={loadKpis}
                className="rounded-xl bg-blue-700 px-5 py-2 font-semibold text-white"
              >
                Refresh
              </button>

              <button
                onClick={logout}
                className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-center text-slate-500 shadow">
            Loading dashboard...
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <KpiCard title="Today's Trips" value={kpi.todayTrips} />
              <KpiCard title="Pending" value={kpi.pendingTrips} />
              <KpiCard
                title="Docs Uploaded"
                value={kpi.documentsUploadedTrips}
              />
              <KpiCard title="Verified" value={kpi.verifiedTrips} />
              <KpiCard title="Rejected" value={kpi.rejectedTrips} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <KpiCard title="Drivers" value={kpi.totalDrivers} />
              <KpiCard title="Vehicles" value={kpi.totalVehicles} />
              <KpiCard title="Trailers" value={kpi.totalTrailers} />
              <KpiCard title="Companies" value={kpi.totalCompanies} />
            </div>
          </>
        )}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Quick Access
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <QuickLink href="/drivers" title="Drivers" />
            <QuickLink href="/vehicles" title="Vehicles" />
            <QuickLink href="/trailers" title="Trailers" />
            <QuickLink href="/companies" title="Companies" />
            <QuickLink href="/admin-trips" title="Admin Trips" />
            <QuickLink href="/reports" title="Reports" />
            <QuickLink href="/driver-login" title="Driver Login" />
            <QuickLink href="/trips" title="Trip Testing" />
          </div>
        </div>
      </div>
    </main>
  )
}

function KpiCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </h3>
    </div>
  )
}

function QuickLink({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-slate-900 p-4 text-center font-semibold text-white hover:bg-slate-800"
    >
      {title}
    </Link>
  )
}