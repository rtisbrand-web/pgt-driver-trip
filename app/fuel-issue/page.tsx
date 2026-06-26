'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Vehicle = { id: string; vehicle_number: string }
type Station = { id: string; station_name: string; location: string | null }
type RefuelVehicle = {
  id: string
  vehicle_number: string
  driver_name: string | null
}
type Wallet = {
  vehicle_id: string
  vehicle_number: string
  earned_gallons: number
  issued_gallons: number
  balance_gallons: number
}

export default function FuelIssuePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [refuelVehicles, setRefuelVehicles] = useState<RefuelVehicle[]>([])
  const [fuelHistory, setFuelHistory] = useState<any[]>([])

  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [driverName, setDriverName] = useState('-')
  const [wallet, setWallet] = useState<Wallet | null>(null)

  const [sourceValue, setSourceValue] = useState('')
  const [gallons, setGallons] = useState('')
  const [remarks, setRemarks] = useState('')
  const [odometerReading, setOdometerReading] = useState('')

  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null)
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null)
  const [gpsStatus, setGpsStatus] = useState('GPS not captured')

  const [tankBefore, setTankBefore] = useState<File | null>(null)
  const [tankAfter, setTankAfter] = useState<File | null>(null)
  const [refuelPhoto, setRefuelPhoto] = useState<File | null>(null)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
    captureGps()
  }, [])

  async function loadData() {
    const vehiclesRes = await supabase
      .from('vehicles')
      .select('id, vehicle_number')
      .eq('is_active', true)
      .order('vehicle_number')

    const stationsRes = await supabase
      .from('fuel_stations')
      .select('id, station_name, location')
      .eq('is_active', true)
      .order('station_name')

    const refuelRes = await supabase
      .from('refueling_vehicles')
      .select('id, vehicle_number, driver_name')
      .eq('is_active', true)
      .order('vehicle_number')

    const historyRes = await supabase
      .from('fuel_entries')
      .select(`
        *,
        vehicles(vehicle_number),
        drivers(driver_name),
        fuel_stations(station_name),
        refueling_vehicles(vehicle_number)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    setVehicles(vehiclesRes.data || [])
    setStations(stationsRes.data || [])
    setRefuelVehicles(refuelRes.data || [])
    setFuelHistory(historyRes.data || [])
  }

  async function loadVehicleInfo(id: string) {
    setVehicleId(id)
    setDriverId('')
    setDriverName('-')
    setWallet(null)

    if (!id) return

    const walletRes = await supabase
      .from('vehicle_fuel_wallet_view')
      .select('*')
      .eq('vehicle_id', id)
      .maybeSingle()

    if (walletRes.data) {
      setWallet(walletRes.data as Wallet)
    }

    const tripRes = await supabase
      .from('trips')
      .select('driver_id, drivers(driver_name)')
      .eq('vehicle_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const driverData: any = tripRes.data?.drivers

    if (tripRes.data?.driver_id) {
      setDriverId(tripRes.data.driver_id)
    }

    if (Array.isArray(driverData)) {
      setDriverName(driverData[0]?.driver_name || '-')
    } else {
      setDriverName(driverData?.driver_name || '-')
    }
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not supported')
      return
    }

    setGpsStatus('Capturing GPS...')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLatitude(pos.coords.latitude)
        setGpsLongitude(pos.coords.longitude)
        setGpsStatus('GPS captured')
      },
      () => setGpsStatus('GPS permission denied'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  async function uploadFuelPhoto(file: File | null, label: string) {
    if (!file || !vehicleId) return null

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `fuel-${vehicleId}/${Date.now()}-${label}-${safeName}`

    const uploadRes = await supabase.storage
      .from('trip-documents')
      .upload(path, file)

    if (uploadRes.error) {
      throw new Error(uploadRes.error.message)
    }

    return supabase.storage.from('trip-documents').getPublicUrl(path).data
      .publicUrl
  }

  async function issueFuel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!vehicleId) {
      alert('Please select vehicle')
      return
    }

    if (!sourceValue) {
      alert('Please select fuel source')
      return
    }

    const issueGallons = Number(gallons || 0)

    if (issueGallons <= 0) {
      alert('Please enter issue gallons')
      return
    }

    const balance = Number(wallet?.balance_gallons || 0)

    if (issueGallons > balance) {
      const extra = issueGallons - balance

      await supabase.from('fuel_approval_requests').insert([
        {
          vehicle_id: vehicleId,
          requested_gallons: issueGallons,
          allowed_balance_gallons: balance,
          extra_gallons: extra,
          reason: remarks || 'Over fuel requested by refueler',
          status: 'Pending',
        },
      ])

      alert(
        `Over Fuel Blocked. Available ${balance} gallons only. Admin approval request created.`
      )
      return
    }

    setSaving(true)

    try {
      const tankBeforeUrl = await uploadFuelPhoto(tankBefore, 'tank-before')
      const tankAfterUrl = await uploadFuelPhoto(tankAfter, 'tank-after')
      const refuelPhotoUrl = await uploadFuelPhoto(refuelPhoto, 'refuel-photo')

      const [sourceType, sourceId] = sourceValue.split(':')

      const gpsMapLink =
        gpsLatitude && gpsLongitude
          ? `https://www.google.com/maps?q=${gpsLatitude},${gpsLongitude}`
          : null

      const { error } = await supabase.from('fuel_entries').insert([
        {
          vehicle_id: vehicleId,
          driver_id: driverId || null,
          fuel_source_type: sourceType,
          fuel_station_id: sourceType === 'station' ? sourceId : null,
          refueling_vehicle_id: sourceType === 'vehicle' ? sourceId : null,
          requested_gallons: issueGallons,
          issued_gallons: issueGallons,
          balance_before: balance,
          balance_after: balance - issueGallons,
          status: 'Issued',
          gps_latitude: gpsLatitude,
          gps_longitude: gpsLongitude,
          gps_map_link: gpsMapLink,
          odometer_reading: odometerReading || null,
          tank_before_photo_url: tankBeforeUrl,
          tank_after_photo_url: tankAfterUrl,
          refuel_photo_url: refuelPhotoUrl,
          remarks: remarks || null,
        },
      ])

      if (error) {
        alert(error.message)
        return
      }

      alert('Fuel issued successfully')

      setSourceValue('')
      setGallons('')
      setRemarks('')
      setOdometerReading('')
      setTankBefore(null)
      setTankAfter(null)
      setRefuelPhoto(null)

      await loadVehicleInfo(vehicleId)
      await loadData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">Fuel Issue</h1>
          <p className="mt-1 text-slate-500">
            Issue fuel against verified trip fuel wallet. Over-fuel is blocked.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <form onSubmit={issueFuel} className="grid gap-4 md:grid-cols-3">
            <select
              value={vehicleId}
              onChange={(e) => loadVehicleInfo(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            >
              <option value="">Select Vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number}
                </option>
              ))}
            </select>

            <div className="rounded-xl border p-3 text-slate-900">
              Driver: {driverName}
            </div>

            <div className="rounded-xl border p-3 text-slate-900">
              Balance: {Number(wallet?.balance_gallons || 0).toFixed(2)}{' '}
              Gallons
            </div>

            <select
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            >
              <option value="">Select Fuel Source</option>
              {stations.map((s) => (
                <option key={s.id} value={`station:${s.id}`}>
                  Station - {s.station_name}
                </option>
              ))}
              {refuelVehicles.map((v) => (
                <option key={v.id} value={`vehicle:${v.id}`}>
                  Company Vehicle - {v.vehicle_number}
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.01"
              placeholder="Issue Gallons"
              value={gallons}
              onChange={(e) => setGallons(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            />

            <input
              type="text"
              placeholder="Odometer Reading Optional"
              value={odometerReading}
              onChange={(e) => setOdometerReading(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <input
              type="text"
              placeholder="Remarks Optional"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <div className="rounded-xl border p-3 text-slate-900">
              {gpsStatus}
            </div>

            <button
              type="button"
              onClick={captureGps}
              className="rounded-xl bg-green-700 p-3 font-semibold text-white"
            >
              Refresh GPS
            </button>

            <div>
              <label className="text-sm text-slate-600">
                Tank Before Photo Optional
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setTankBefore(e.target.files?.[0] || null)}
                className="mt-1 w-full rounded-xl border p-3 text-slate-900"
              />
            </div>

            <div>
              <label className="text-sm text-slate-600">
                Tank After Photo Optional
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setTankAfter(e.target.files?.[0] || null)}
                className="mt-1 w-full rounded-xl border p-3 text-slate-900"
              />
            </div>

            <div>
              <label className="text-sm text-slate-600">
                Refuel Photo Optional
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setRefuelPhoto(e.target.files?.[0] || null)}
                className="mt-1 w-full rounded-xl border p-3 text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-900 p-3 font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Issue Fuel'}
            </button>
          </form>
        </div>

        <div className="mt-6 overflow-auto rounded-2xl bg-white p-6 shadow">
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
                <th className="p-3 text-left">Gallons</th>
                <th className="p-3 text-left">Before</th>
                <th className="p-3 text-left">After</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {fuelHistory.map((f) => (
                <tr key={f.id} className="border-b text-slate-900">
                  <td className="p-3 font-bold text-blue-700">
                    {f.bill_no || '-'}
                  </td>
                  <td className="p-3">
                    {new Date(f.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">{f.vehicles?.vehicle_number || '-'}</td>
                  <td className="p-3">{f.drivers?.driver_name || '-'}</td>
                  <td className="p-3">{f.issued_gallons || 0}</td>
                  <td className="p-3">{f.balance_before || 0}</td>
                  <td className="p-3">{f.balance_after || 0}</td>
                  <td className="p-3">{f.status}</td>
                </tr>
              ))}

              {fuelHistory.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No fuel entries yet.
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