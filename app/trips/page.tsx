'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Driver = { id: string; driver_name: string }
type Vehicle = { id: string; vehicle_number: string }
type Trailer = { id: string; trailer_number: string }
type Company = { id: string; company_name: string }

type TripReport = {
  trip_id: string
  trip_no: number
  trip_date: string
  company_name: string | null
  from_location: string
  to_location: string
  trip_allowance: number
  status: string
}

export default function TripsPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [trailers, setTrailers] = useState<Trailer[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [trips, setTrips] = useState<TripReport[]>([])

  const [driverId, setDriverId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [trailerId, setTrailerId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0])
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [allowance, setAllowance] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const driversRes = await supabase.from('drivers').select('id, driver_name').eq('is_active', true).order('driver_name')
    const vehiclesRes = await supabase.from('vehicles').select('id, vehicle_number').eq('is_active', true).order('vehicle_number')
    const trailersRes = await supabase.from('trailers').select('id, trailer_number').eq('is_active', true).order('trailer_number')
    const companiesRes = await supabase.from('companies').select('id, company_name').eq('is_active', true).order('company_name')

    setDrivers(driversRes.data || [])
    setVehicles(vehiclesRes.data || [])
    setTrailers(trailersRes.data || [])
    setCompanies(companiesRes.data || [])

    await loadTrips()
  }

  async function loadTrips() {
    const { data, error } = await supabase
      .from('trip_report_view')
      .select('trip_id, trip_no, trip_date, company_name, from_location, to_location, trip_allowance, status')
      .order('trip_no', { ascending: true })

    if (error) {
      alert(error.message)
      return
    }

    setTrips(data || [])
  }

  async function saveTrip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('trips').insert([
      {
        driver_id: driverId,
        vehicle_id: vehicleId,
        trailer_id: trailerId || null,
        company_id: companyId || null,
        trip_date: tripDate,
        from_location: fromLocation.trim(),
        to_location: toLocation.trim(),
        trip_allowance: allowance ? Number(allowance) : 0,
        remarks: remarks.trim(),
        status: 'Pending',
      },
    ])

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('Trip Saved Successfully')

    setFromLocation('')
    setToLocation('')
    setAllowance('')
    setRemarks('')

    await loadTrips()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">Trip Entry Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Testing page only. Final trip entry will be from Driver App.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <form onSubmit={saveTrip} className="grid gap-4 md:grid-cols-3">
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="rounded-xl border p-3 text-slate-900" required>
              <option value="">Select Driver</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.driver_name}</option>
              ))}
            </select>

            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="rounded-xl border p-3 text-slate-900" required>
              <option value="">Select Vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_number}</option>
              ))}
            </select>

            <select value={trailerId} onChange={(e) => setTrailerId(e.target.value)} className="rounded-xl border p-3 text-slate-900">
              <option value="">Select Trailer</option>
              {trailers.map((trailer) => (
                <option key={trailer.id} value={trailer.id}>{trailer.trailer_number}</option>
              ))}
            </select>

            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="rounded-xl border p-3 text-slate-900">
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.company_name}</option>
              ))}
            </select>

            <input type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} className="rounded-xl border p-3 text-slate-900" required />

            <input type="number" placeholder="Driver Allowance" value={allowance} onChange={(e) => setAllowance(e.target.value)} className="rounded-xl border p-3 text-slate-900" />

            <input type="text" placeholder="From Location" value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} className="rounded-xl border p-3 text-slate-900" required />

            <input type="text" placeholder="To Location" value={toLocation} onChange={(e) => setToLocation(e.target.value)} className="rounded-xl border p-3 text-slate-900" required />

            <input type="text" placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="rounded-xl border p-3 text-slate-900" />

            <button type="submit" disabled={saving} className="rounded-xl bg-blue-900 p-3 font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Trip'}
            </button>
          </form>
        </div>

        <div className="mt-6 overflow-auto rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Recent Trips</h2>

          <table className="w-full">
            <thead>
              <tr className="border-b text-slate-700">
                <th className="p-3 text-left">Trip No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">From</th>
                <th className="p-3 text-left">To</th>
                <th className="p-3 text-left">Allowance</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {trips.map((trip) => (
                <tr key={trip.trip_id} className="border-b text-slate-900">
                  <td className="p-3 font-semibold">{trip.trip_no}</td>
                  <td className="p-3">{trip.trip_date}</td>
                  <td className="p-3">{trip.company_name || '-'}</td>
                  <td className="p-3">{trip.from_location}</td>
                  <td className="p-3">{trip.to_location}</td>
                  <td className="p-3">{trip.trip_allowance}</td>
                  <td className="p-3">{trip.status}</td>
                </tr>
              ))}

              {trips.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No trips found.
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