'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Company = {
  id: string
  company_name: string
}

type FuelRoute = {
  id: string
  company_id: string | null
  vehicle_number: string | null
  from_location: string
  to_location: string
  route_pattern: string
  allowed_diesel_liters: number
  is_active: boolean
  companies?: {
    company_name: string
  } | null
}

export default function FuelRoutesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [routes, setRoutes] = useState<FuelRoute[]>([])

  const [companyId, setCompanyId] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [routePattern, setRoutePattern] = useState('One Way')
  const [allowedDiesel, setAllowedDiesel] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const companiesRes = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('is_active', true)
      .order('company_name')

    const routesRes = await supabase
      .from('diesel_route_master')
      .select(`
        *,
        companies (
          company_name
        )
      `)
      .order('created_at', { ascending: false })

    if (companiesRes.error) {
      alert(companiesRes.error.message)
      return
    }

    if (routesRes.error) {
      alert(routesRes.error.message)
      return
    }

    setCompanies(companiesRes.data || [])
    setRoutes((routesRes.data || []) as FuelRoute[])
  }

  async function addRoute(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!companyId) {
      alert('Please select company')
      return
    }

    if (!fromLocation.trim() || !toLocation.trim()) {
      alert('Please enter From and To location')
      return
    }

    if (!allowedDiesel || Number(allowedDiesel) <= 0) {
      alert('Please enter allowed diesel liters')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('diesel_route_master').insert([
      {
        company_id: companyId,
        vehicle_number: vehicleNumber.trim().toUpperCase() || null,
        from_location: fromLocation.trim(),
        to_location: toLocation.trim(),
        route_pattern: routePattern,
        allowed_diesel_liters: Number(allowedDiesel),
        is_active: true,
      },
    ])

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setCompanyId('')
    setVehicleNumber('')
    setFromLocation('')
    setToLocation('')
    setRoutePattern('One Way')
    setAllowedDiesel('')

    await loadData()
    alert('Diesel route added successfully')
  }

  async function toggleStatus(id: string, current: boolean) {
    const { error } = await supabase
      .from('diesel_route_master')
      .update({ is_active: !current })
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    await loadData()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Diesel Route Master
          </h1>
          <p className="mt-1 text-slate-500">
            Customer-wise diesel allowance based on vehicle number and trip route.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Add Diesel Route
          </h2>

          <form onSubmit={addRoute} className="grid gap-4 md:grid-cols-3">
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            >
              <option value="">Select Customer / Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.company_name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Vehicle Number (optional)"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <select
              value={routePattern}
              onChange={(e) => setRoutePattern(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            >
              <option value="One Way">One Way</option>
              <option value="Return">Return</option>
              <option value="Return With Load">Return With Load</option>
              <option value="Multi Point">Multi Point</option>
            </select>

            <input
              type="text"
              placeholder="From Location"
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            />

            <input
              type="text"
              placeholder="To Location"
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            />

            <input
              type="number"
              step="0.01"
              placeholder="Allowed Diesel Liters"
              value={allowedDiesel}
              onChange={(e) => setAllowedDiesel(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 p-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Add Route'}
            </button>
          </form>
        </div>

        <div className="mt-6 overflow-auto rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Diesel Route List
          </h2>

          <table className="w-full">
            <thead>
              <tr className="border-b text-slate-700">
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Vehicle</th>
                <th className="p-3 text-left">From</th>
                <th className="p-3 text-left">To</th>
                <th className="p-3 text-left">Pattern</th>
                <th className="p-3 text-left">Diesel L</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {routes.map((route) => (
                <tr key={route.id} className="border-b text-slate-900">
                  <td className="p-3">
                    {route.companies?.company_name || '-'}
                  </td>
                  <td className="p-3">
                    {route.vehicle_number || 'Any Vehicle'}
                  </td>
                  <td className="p-3">{route.from_location}</td>
                  <td className="p-3">{route.to_location}</td>
                  <td className="p-3">{route.route_pattern}</td>
                  <td className="p-3 font-semibold">
                    {route.allowed_diesel_liters}
                  </td>
                  <td className="p-3">
                    {route.is_active ? 'Active' : 'Inactive'}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleStatus(route.id, route.is_active)}
                      className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
                    >
                      Change
                    </button>
                  </td>
                </tr>
              ))}

              {routes.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No diesel routes added yet.
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