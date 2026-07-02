'use client'

import { useEffect, useMemo, useState } from 'react'
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
    setHistory(
      (historyRes.data || []).map((r: any) => ({
        ...r,
        vehicles: Array.isArray(r.vehicles) ? r.vehicles[0] ?? null : r.vehicles,
        drivers: Array.isArray(r.drivers) ? r.drivers[0] ?? null : r.drivers,
      }))
    )
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

  const gpsReady = gpsStatus.toLowerCase().includes('captured')
  const balanceGallons = Number(wallet?.balance_gallons || 0)
  const selectedVehicleNumber =
    vehicles.find((vehicle) => vehicle.id === vehicleId)?.vehicle_number || '-'

  const latestHistory = useMemo(() => history.slice(0, 5), [history])

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <div className="mx-auto max-w-md pb-8">
        <div className="rounded-b-[34px] bg-[#070d22] px-5 pb-6 pt-7 text-white shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                PGT Fuel System
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight">
                Refueler
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {refueler?.driver_name || '-'} • Vehicle{' '}
                {refueler?.vehicle_number || '-'}
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30"
            >
              Logout
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs text-slate-300">GPS</p>
              <p
                className={`mt-1 text-sm font-bold ${
                  gpsReady ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {gpsReady ? '● Connected' : '● Required'}
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs text-slate-300">Wallet</p>
              <p className="mt-1 text-xl font-black text-emerald-300">
                {balanceGallons.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4">
          <button
            onClick={captureGps}
            className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-black text-white shadow-lg ${
              gpsReady
                ? 'bg-emerald-600 shadow-emerald-900/20'
                : 'bg-amber-600 shadow-amber-900/20'
            }`}
          >
            📍 {gpsReady ? 'GPS Captured' : 'Capture GPS'}
          </button>

          <section className="mt-5 overflow-hidden rounded-[28px] bg-white shadow-lg shadow-slate-200">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                Fuel Wallet
              </p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <h2 className="text-4xl font-black">
                    {balanceGallons.toFixed(2)}
                  </h2>
                  <p className="mt-1 text-sm text-emerald-100">
                    Gallons remaining
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-3 text-right">
                  <p className="text-xs text-emerald-100">Vehicle</p>
                  <p className="text-lg font-black">{selectedVehicleNumber}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-xs text-slate-500">Driver</p>
                <p className="mt-1 truncate text-lg font-black">{driverName}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-xs text-slate-500">Meter Diff</p>
                <p className="mt-1 text-lg font-black">
                  {meterDifference().toFixed(2)}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Operation
                </p>
                <h2 className="mt-1 text-2xl font-black">Issue Fuel</h2>
              </div>
              <div className="rounded-2xl bg-[#070d22] px-4 py-3 text-sm font-bold text-white">
                ⛽
              </div>
            </div>

            <form onSubmit={issueFuel} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Vehicle
                </span>
                <select
                  value={vehicleId}
                  onChange={(e) => loadVehicleInfo(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_number}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Issue Gallons
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={gallons}
                    onChange={(e) => setGallons(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-emerald-500"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Odometer
                  </span>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={odometerReading}
                    onChange={(e) => setOdometerReading(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-emerald-500"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Meter 1st
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Start"
                    value={meter1Reading}
                    onChange={(e) => setMeter1Reading(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-emerald-500"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Meter 2nd
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="End"
                    value={meter2Reading}
                    onChange={(e) => setMeter2Reading(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold outline-none focus:border-emerald-500"
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Remarks
                </span>
                <input
                  type="text"
                  placeholder="Optional remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold outline-none focus:border-emerald-500"
                />
              </label>

              <div>
                <p className="mb-3 text-sm font-bold text-slate-600">
                  Photos
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <PhotoPicker
                    title="Meter 1"
                    file={meter1Photo}
                    onChange={setMeter1Photo}
                  />
                  <PhotoPicker
                    title="Meter 2"
                    file={meter2Photo}
                    onChange={setMeter2Photo}
                  />
                  <PhotoPicker
                    title="Refuel"
                    file={refuelPhoto}
                    onChange={setRefuelPhoto}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 h-16 w-full rounded-3xl bg-[#070d22] text-lg font-black text-white shadow-xl shadow-slate-300 disabled:opacity-60"
              >
                {saving ? 'Saving Fuel...' : '⛽ Issue Fuel'}
              </button>
            </form>
          </section>

          <section className="mt-5 rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Recent
                </p>
                <h2 className="mt-1 text-2xl font-black">Fuel History</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                Last 5
              </span>
            </div>

            <div className="space-y-3">
              {latestHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-blue-700">
                        {entry.bill_no || 'Pending Bill'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                      {entry.status || '-'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white p-2">
                      <p className="text-[10px] text-slate-400">Vehicle</p>
                      <p className="text-sm font-black">
                        {entry.vehicles?.vehicle_number || '-'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-2">
                      <p className="text-[10px] text-slate-400">Gallons</p>
                      <p className="text-sm font-black">
                        {Number(entry.issued_gallons || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-2">
                      <p className="text-[10px] text-slate-400">After</p>
                      <p className="text-sm font-black">
                        {Number(entry.balance_after || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {latestHistory.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                  No fuel issues found.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function PhotoPicker({
  title,
  file,
  onChange,
}: {
  title: string
  file: File | null
  onChange: (file: File | null) => void
}) {
  return (
    <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-3 text-center">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <span className="text-2xl">📷</span>
      <span className="mt-1 text-xs font-black text-slate-700">{title}</span>
      <span className="mt-1 max-w-full truncate text-[10px] text-slate-400">
        {file ? file.name : 'Tap'}
      </span>
    </label>
  )
}
