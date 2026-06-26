'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type FuelStation = {
  id: string
  station_name: string
  location: string | null
  is_active: boolean
}

type RefuelingVehicle = {
  id: string
  vehicle_number: string
  driver_name: string | null
  mobile: string | null
  is_active: boolean
}

export default function FuelSourcesPage() {
  const [stations, setStations] = useState<FuelStation[]>([])
  const [refuelingVehicles, setRefuelingVehicles] = useState<RefuelingVehicle[]>([])

  const [stationName, setStationName] = useState('')
  const [stationLocation, setStationLocation] = useState('')

  const [fuelVehicleNumber, setFuelVehicleNumber] = useState('')
  const [fuelVehicleDriver, setFuelVehicleDriver] = useState('')
  const [fuelVehicleMobile, setFuelVehicleMobile] = useState('')

  const [savingStation, setSavingStation] = useState(false)
  const [savingVehicle, setSavingVehicle] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const stationsRes = await supabase
      .from('fuel_stations')
      .select('id, station_name, location, is_active')
      .order('created_at', { ascending: false })

    const vehiclesRes = await supabase
      .from('refueling_vehicles')
      .select('id, vehicle_number, driver_name, mobile, is_active')
      .order('created_at', { ascending: false })

    if (stationsRes.error) {
      alert(stationsRes.error.message)
      return
    }

    if (vehiclesRes.error) {
      alert(vehiclesRes.error.message)
      return
    }

    setStations(stationsRes.data || [])
    setRefuelingVehicles(vehiclesRes.data || [])
  }

  async function addStation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!stationName.trim()) {
      alert('Please enter station name')
      return
    }

    setSavingStation(true)

    const { error } = await supabase.from('fuel_stations').insert([
      {
        station_name: stationName.trim(),
        location: stationLocation.trim() || null,
        is_active: true,
      },
    ])

    setSavingStation(false)

    if (error) {
      alert(error.message)
      return
    }

    setStationName('')
    setStationLocation('')
    await loadData()
    alert('Fuel station added successfully')
  }

  async function addRefuelingVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!fuelVehicleNumber.trim()) {
      alert('Please enter refueling vehicle number')
      return
    }

    setSavingVehicle(true)

    const { error } = await supabase.from('refueling_vehicles').insert([
      {
        vehicle_number: fuelVehicleNumber.trim().toUpperCase(),
        driver_name: fuelVehicleDriver.trim() || null,
        mobile: fuelVehicleMobile.trim() || null,
        is_active: true,
      },
    ])

    setSavingVehicle(false)

    if (error) {
      alert(error.message)
      return
    }

    setFuelVehicleNumber('')
    setFuelVehicleDriver('')
    setFuelVehicleMobile('')
    await loadData()
    alert('Refueling vehicle added successfully')
  }

  async function toggleStation(id: string, current: boolean) {
    const { error } = await supabase
      .from('fuel_stations')
      .update({ is_active: !current })
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    await loadData()
  }

  async function toggleRefuelingVehicle(id: string, current: boolean) {
    const { error } = await supabase
      .from('refueling_vehicles')
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
            Fuel Source Master
          </h1>
          <p className="mt-1 text-slate-500">
            Manage company refueling vehicles and external fuel stations.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Add External Fuel Station
            </h2>

            <form onSubmit={addStation} className="grid gap-4">
              <input
                type="text"
                placeholder="Station Name e.g. ADNOC Mussafah"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                className="rounded-xl border p-3 text-slate-900"
                required
              />

              <input
                type="text"
                placeholder="Location"
                value={stationLocation}
                onChange={(e) => setStationLocation(e.target.value)}
                className="rounded-xl border p-3 text-slate-900"
              />

              <button
                type="submit"
                disabled={savingStation}
                className="rounded-xl bg-slate-900 p-3 font-semibold text-white disabled:opacity-60"
              >
                {savingStation ? 'Saving...' : 'Add Fuel Station'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Add Company Refueling Vehicle
            </h2>

            <form onSubmit={addRefuelingVehicle} className="grid gap-4">
              <input
                type="text"
                placeholder="Refueling Vehicle No"
                value={fuelVehicleNumber}
                onChange={(e) => setFuelVehicleNumber(e.target.value)}
                className="rounded-xl border p-3 text-slate-900"
                required
              />

              <input
                type="text"
                placeholder="Driver / Operator Name"
                value={fuelVehicleDriver}
                onChange={(e) => setFuelVehicleDriver(e.target.value)}
                className="rounded-xl border p-3 text-slate-900"
              />

              <input
                type="text"
                placeholder="Mobile Number"
                value={fuelVehicleMobile}
                onChange={(e) => setFuelVehicleMobile(e.target.value)}
                className="rounded-xl border p-3 text-slate-900"
              />

              <button
                type="submit"
                disabled={savingVehicle}
                className="rounded-xl bg-blue-900 p-3 font-semibold text-white disabled:opacity-60"
              >
                {savingVehicle ? 'Saving...' : 'Add Refueling Vehicle'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="overflow-auto rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              External Fuel Stations
            </h2>

            <table className="w-full">
              <thead>
                <tr className="border-b text-slate-700">
                  <th className="p-3 text-left">Station</th>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {stations.map((station) => (
                  <tr key={station.id} className="border-b text-slate-900">
                    <td className="p-3">{station.station_name}</td>
                    <td className="p-3">{station.location || '-'}</td>
                    <td className="p-3">
                      {station.is_active ? 'Active' : 'Inactive'}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleStation(station.id, station.is_active)}
                        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
                      >
                        Change
                      </button>
                    </td>
                  </tr>
                ))}

                {stations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      No fuel stations added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-auto rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Company Refueling Vehicles
            </h2>

            <table className="w-full">
              <thead>
                <tr className="border-b text-slate-700">
                  <th className="p-3 text-left">Vehicle No</th>
                  <th className="p-3 text-left">Operator</th>
                  <th className="p-3 text-left">Mobile</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {refuelingVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b text-slate-900">
                    <td className="p-3 font-semibold">{vehicle.vehicle_number}</td>
                    <td className="p-3">{vehicle.driver_name || '-'}</td>
                    <td className="p-3">{vehicle.mobile || '-'}</td>
                    <td className="p-3">
                      {vehicle.is_active ? 'Active' : 'Inactive'}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() =>
                          toggleRefuelingVehicle(vehicle.id, vehicle.is_active)
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
                      >
                        Change
                      </button>
                    </td>
                  </tr>
                ))}

                {refuelingVehicles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No refueling vehicles added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}