'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Vehicle = {
  id: string
  vehicle_number: string
  vehicle_type: string
  vehicle_size: string | null
  is_active: boolean
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('Flatbed')
  const [vehicleSize, setVehicleSize] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadVehicles() {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .order('vehicle_number')

    setVehicles(data || [])
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  async function addVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('vehicles').insert([
      {
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: vehicleType,
        vehicle_size: vehicleSize.trim(),
        is_active: true,
      },
    ])

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setVehicleNumber('')
    setVehicleType('Flatbed')
    setVehicleSize('')
    loadVehicles()
  }

  async function toggleStatus(id: string, current: boolean) {
    await supabase
      .from('vehicles')
      .update({ is_active: !current })
      .eq('id', id)

    loadVehicles()
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Vehicles Management
          </h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <form onSubmit={addVehicle} className="grid gap-4 md:grid-cols-4">
            <input
              type="text"
              placeholder="Vehicle Number"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            />

            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            >
              <option value="Flatbed">Flatbed</option>
              <option value="Pickup">Pickup</option>
              <option value="Side Cage">Side Cage</option>
              <option value="Tipper">Tipper</option>
            </select>

            <input
              type="text"
              placeholder="Size: 12M / 13M / 15M / 3 Ton"
              value={vehicleSize}
              onChange={(e) => setVehicleSize(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white"
            >
              {loading ? 'Saving...' : 'Add Vehicle'}
            </button>
          </form>
        </div>

        <div className="mt-6 overflow-auto rounded-2xl bg-white p-6 shadow">
          <table className="w-full">
            <thead>
              <tr className="border-b text-slate-700">
                <th className="p-3 text-left">Vehicle Number</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Size</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b text-slate-900">
                  <td className="p-3 font-semibold">
                    {vehicle.vehicle_number}
                  </td>
                  <td className="p-3">{vehicle.vehicle_type}</td>
                  <td className="p-3">{vehicle.vehicle_size || '-'}</td>
                  <td className="p-3">
                    {vehicle.is_active ? 'Active' : 'Inactive'}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() =>
                        toggleStatus(vehicle.id, vehicle.is_active)
                      }
                      className="rounded-lg bg-blue-600 px-3 py-2 text-white"
                    >
                      Change
                    </button>
                  </td>
                </tr>
              ))}

              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No vehicles added yet.
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