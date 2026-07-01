'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type RefuelerSession = {
  id: string
  vehicle_number: string
  driver_name: string | null
  mobile: string
}

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
  issued_gallons: number | null
  wallet_used_gallons: number | null
  extra_approved_gallons: number | null
  balance_before: number | null
  balance_after: number | null
  status: string | null
  fuel_type: string | null
  vehicles: { vehicle_number: string } | null
  drivers: { driver_name: string } | null
}

export default function RefuelerDashboardPage() {
  const [refueler, setRefueler] = useState<RefuelerSession | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [history, setHistory] = useState<FuelEntry[]>([])

  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [driverName, setDriverName] = useState('-')
  const [wallet, setWallet] = useState<Wallet | null>(null)

  const [gallons, setGallons] = useState('')
  const [remarks, setRemarks] = useState('')
  const [odometerReading, setOdometerReading] = useState('')

  const [meter1Reading, setMeter1Reading] = useState('')
  const [meter2Reading, setMeter2Reading] = useState('')

  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null)
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null)
  const [gpsStatus, setGpsStatus] = useState('GPS not captured')

  const [meter1Photo, setMeter1Photo] = useState<File | null>(null)
  const [meter2Photo, setMeter2Photo] = useState<File | null>(null)
  const [refuelPhoto, setRefuelPhoto] = useState<File | null>(null)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('pgt_refueler')

    if (!saved) {
      window.location.href = '/refueler-login'
      return
    }

    const parsed = JSON.parse(saved)
    setRefueler(parsed)
    loadData(parsed.id)
    captureGps()
  }, [])

  async function loadData(refuelerId: string) {
    const vehiclesRes = await supabase
      .from('vehicles')
      .select('id, vehicle_number')
      .eq('is_active', true)
      .order('vehicle_number')

    const historyRes = await supabase
      .from('fuel_entries')
      .select(`
        id,
        bill_no,
        created_at,
        issued_gallons,
        wallet_used_gallons,
        extra_approved_gallons,
        balance_before,
        balance_after,
        status,
        fuel_type,
        vehicles(vehicle_number),
        drivers(driver_name)
      `)
      .eq('refueling_vehicle_id', refuelerId)
      .order('created_at', { ascending: false })
      .limit(20)

    setVehicles(vehiclesRes.data || [])
    setHistory((historyRes.data || []).map((r: any) => ({
      ...r,
      vehicles: Array.isArray(r.vehicles) ? r.vehicles[0] ?? null : r.vehicles,
      drivers: Array.isArray(r.drivers) ? r.drivers[0] ?? null : r.drivers,
    })))
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
    const path = `refueler-fuel-${vehicleId}/${Date.now()}-${label}-${safeName}`

    const uploadRes = await supabase.storage
      .from('trip-documents')
      .upload(path, file)

    if (uploadRes.error) {
      throw new Error(uploadRes.error.message)
    }

    return supabase.storage.from('trip-documents').getPublicUrl(path).data
      .publicUrl
  }

  function meterDifference() {
    const m1 = Number(meter1Reading || 0)
    const m2 = Number(meter2Reading || 0)

    if (!meter1Reading || !meter2Reading) return 0

    return Math.max(m2 - m1, 0)
  }

  async function issueFuel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!refueler) return

    if (!vehicleId) {
      alert('Please select vehicle')
      return
    }

    const issueGallons = Number(gallons || 0)

    if (issueGallons <= 0) {
      alert('Please enter issue gallons')
      return
    }

    if (!meter1Reading.trim()) {
      alert('Please enter Meter 1st Reading')
      return
    }

    if (!meter2Reading.trim()) {
      alert('Please enter Meter 2nd Reading')
      return
    }

    const diff = meterDifference()

    if (diff > 0 && Math.abs(diff - issueGallons) > 0.5) {
      const proceed = confirm(
        `Meter difference is ${diff.toFixed(
          2
        )} but issued gallons is ${issueGallons.toFixed(
          2
        )}.\n\nDo you still want to continue?`
      )

      if (!proceed) return
    }

    const availableBalance = Math.max(Number(wallet?.balance_gallons || 0), 0)

    setSaving(true)

    try {
      const meter1PhotoUrl = await uploadFuelPhoto(
        meter1Photo,
        'meter-1-reading'
      )
      const meter2PhotoUrl = await uploadFuelPhoto(
        meter2Photo,
        'meter-2-reading'
      )
      const refuelPhotoUrl = await uploadFuelPhoto(refuelPhoto, 'refuel-photo')

      const gpsMapLink =
        gpsLatitude && gpsLongitude
          ? `https://www.google.com/maps?q=${gpsLatitude},${gpsLongitude}`
          : null

      if (issueGallons > availableBalance) {
        const extra = issueGallons - availableBalance

        const requestRes = await supabase.from('fuel_approval_requests').insert([
          {
            vehicle_id: vehicleId,
            driver_id: driverId || null,
            refueling_vehicle_id: refueler.id,
            requested_gallons: issueGallons,
            allowed_balance_gallons: availableBalance,
            extra_gallons: extra,
            reason: remarks || 'Over fuel requested by refueler',
            status: 'Pending',
            gps_latitude: gpsLatitude,
            gps_longitude: gpsLongitude,
            gps_map_link: gpsMapLink,
            odometer_reading: odometerReading || null,
            meter1_reading: meter1Reading.trim(),
            meter2_reading: meter2Reading.trim(),
            meter1_photo_url: meter1PhotoUrl,
            meter2_photo_url: meter2PhotoUrl,
            refuel_photo_url: refuelPhotoUrl,
          },
        ])

        if (requestRes.error) {
          alert(requestRes.error.message)
          return
        }

        alert(
          `Over Fuel Blocked. Available ${availableBalance} gallons only. Admin approval request created.`
        )

        resetForm()
        await loadVehicleInfo(vehicleId)
        await loadData(refueler.id)
        return
      }

      const { error } = await supabase.from('fuel_entries').insert([
        {
          vehicle_id: vehicleId,
          driver_id: driverId || null,
          fuel_source_type: 'Company Vehicle',
          refueling_vehicle_id: refueler.id,
          requested_gallons: issueGallons,
          issued_gallons: issueGallons,
          wallet_used_gallons: issueGallons,
          extra_approved_gallons: 0,
          balance_before: availableBalance,
          balance_after: availableBalance - issueGallons,
          fuel_type: 'Normal',
          status: 'Issued',
          gps_latitude: gpsLatitude,
          gps_longitude: gpsLongitude,
          gps_map_link: gpsMapLink,
          odometer_reading: odometerReading || null,
          meter1_reading: meter1Reading.trim(),
          meter2_reading: meter2Reading.trim(),
          meter1_photo_url: meter1PhotoUrl,
          meter2_photo_url: meter2PhotoUrl,
          refuel_photo_url: refuelPhotoUrl,
          remarks: remarks || null,
        },
      ])

      if (error) {
        alert(error.message)
        return
      }

      alert('Fuel issued successfully')

      resetForm()
      await loadVehicleInfo(vehicleId)
      await loadData(refueler.id)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setGallons('')
    setRemarks('')
    setOdometerReading('')
    setMeter1Reading('')
    setMeter2Reading('')
    setMeter1Photo(null)
    setMeter2Photo(null)
    setRefuelPhoto(null)
  }

  function logout() {
    localStorage.removeItem('pgt_refueler')
    window.location.href = '/refueler-login'
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl bg-slate-950 p-6 text-white shadow">
          <h1 className="text-2xl font-bold">Refueler Dashboard</h1>
          <p className="mt-2 text-slate-300">
            Welcome, {refueler?.driver_name || '-'}
          </p>
          <p className="text-slate-300">
            Refueling Vehicle: {refueler?.vehicle_number || '-'}
          </p>

          <button
            onClick={logout}
            className="mt-4 rounded-xl bg-red-600 px-5 py-2 font-semibold text-white"
          >
            Logout
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            GPS Location
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-3 text-slate-900">
              {gpsStatus}
            </div>

            <div className="rounded-xl border p-3 text-slate-900">
              Lat: {gpsLatitude || '-'} / Long: {gpsLongitude || '-'}
            </div>

            <button
              onClick={captureGps}
              className="rounded-xl bg-green-700 p-3 font-semibold text-white"
            >
              Refresh GPS
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Issue Fuel
          </h2>

          <form onSubmit={issueFuel} className="grid gap-4 md:grid-cols-3">
            <select
              value={vehicleId}
              onChange={(e) => loadVehicleInfo(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            >
              <option value="">Select Vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicle_number}
                </option>
              ))}
            </select>

            <div className="rounded-xl border p-3 text-slate-900">
              Driver: {driverName}
            </div>

            <div className="rounded-xl border p-3 text-slate-900">
              Balance: {Number(wallet?.balance_gallons || 0).toFixed(2)} Gallons
            </div>

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
              type="number"
              step="0.01"
              placeholder="Meter 1st Reading"
              value={meter1Reading}
              onChange={(e) => setMeter1Reading(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            />

            <input
              type="number"
              step="0.01"
              placeholder="Meter 2nd Reading"
              value={meter2Reading}
              onChange={(e) => setMeter2Reading(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            />

            <div className="rounded-xl border p-3 text-slate-900">
              Meter Difference: {meterDifference().toFixed(2)}
            </div>

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

            <div>
              <label className="text-sm text-slate-600">
                Meter 1st Reading Photo Optional
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setMeter1Photo(e.target.files?.[0] || null)}
                className="mt-1 w-full rounded-xl border p-3 text-slate-900"
              />
            </div>

            <div>
              <label className="text-sm text-slate-600">
                Meter 2nd Reading Photo Optional
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setMeter2Photo(e.target.files?.[0] || null)}
                className="mt-1 w-full rounded-xl border p-3 text-slate-900"
              />
            </div>

            <div>
              <label className="text-sm text-slate-600">
                Vehicle Refueling Photo Optional
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
            My Fuel Issue History
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
              {history.map((entry) => (
                <tr key={entry.id} className="border-b text-slate-900">
                  <td className="p-3 font-bold text-blue-700">
                    {entry.bill_no || '-'}
                  </td>
                  <td className="p-3">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {entry.vehicles?.vehicle_number || '-'}
                  </td>
                  <td className="p-3">
                    {entry.drivers?.driver_name || '-'}
                  </td>
                  <td className="p-3 font-semibold">
                    {Number(entry.issued_gallons || 0).toFixed(2)}
                  </td>
                  <td className="p-3">
                    {Number(entry.balance_before || 0).toFixed(2)}
                  </td>
                  <td className="p-3">
                    {Number(entry.balance_after || 0).toFixed(2)}
                  </td>
                  <td className="p-3">{entry.status || '-'}</td>
                </tr>
              ))}

              {history.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No fuel issues found.
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