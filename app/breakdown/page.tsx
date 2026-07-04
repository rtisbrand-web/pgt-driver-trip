'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type DriverSession = {
  driver_id: string
  driver_name: string
  mobile: string
}

type Vehicle = {
  id: string
  vehicle_number: string
}

type Trailer = {
  id: string
  trailer_number: string
}

type BreakdownRecord = {
  id: string
  created_at: string
  breakdown_type: string
  priority: string
  status: string
  description: string | null
  vehicles: { vehicle_number: string }[] | { vehicle_number: string } | null
}

function getRelationName(value: BreakdownRecord['vehicles']) {
  if (!value) return '-'
  if (Array.isArray(value)) return value[0]?.vehicle_number || '-'
  return value.vehicle_number || '-'
}

export default function BreakdownPage() {
  const [driver, setDriver] = useState<DriverSession | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [trailers, setTrailers] = useState<Trailer[]>([])
  const [history, setHistory] = useState<BreakdownRecord[]>([])

  const [vehicleId, setVehicleId] = useState('')
  const [trailerId, setTrailerId] = useState('')
  const [breakdownType, setBreakdownType] = useState('Mechanical')
  const [priority, setPriority] = useState('High')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null)
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null)
  const [gpsStatus, setGpsStatus] = useState('GPS not captured')

  const [photo1, setPhoto1] = useState<File | null>(null)
  const [photo2, setPhoto2] = useState<File | null>(null)
  const [photo3, setPhoto3] = useState<File | null>(null)

  useEffect(() => {
    const savedDriver = localStorage.getItem('pgt_driver')

    if (!savedDriver) {
      window.location.href = '/driver-login'
      return
    }

    const parsed = JSON.parse(savedDriver)
    setDriver(parsed)
    loadData(parsed.driver_id)
    captureGps()
  }, [])

  async function loadData(driverId: string) {
    const driverRes = await supabase
      .from('drivers')
      .select('current_vehicle_id, current_trailer_id')
      .eq('id', driverId)
      .single()

    if (driverRes.data) {
      setVehicleId(driverRes.data.current_vehicle_id || '')
      setTrailerId(driverRes.data.current_trailer_id || '')
    }

    const vehiclesRes = await supabase
      .from('vehicles')
      .select('id, vehicle_number')
      .eq('is_active', true)
      .order('vehicle_number')

    const trailersRes = await supabase
      .from('trailers')
      .select('id, trailer_number')
      .eq('is_active', true)
      .order('trailer_number')

    const historyRes = await supabase
      .from('driver_breakdowns')
      .select(`
        id,
        created_at,
        breakdown_type,
        priority,
        status,
        description,
        vehicles(vehicle_number)
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .limit(10)

    setVehicles(vehiclesRes.data || [])
    setTrailers(trailersRes.data || [])

    if (!historyRes.error) {
      setHistory((historyRes.data || []) as unknown as BreakdownRecord[])
    }
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not supported')
      return
    }

    setGpsStatus('Capturing GPS...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLatitude(position.coords.latitude)
        setGpsLongitude(position.coords.longitude)
        setGpsStatus('GPS captured')
      },
      () => setGpsStatus('GPS permission denied'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  async function uploadPhoto(file: File | null, label: string) {
    if (!file || !driver) return null

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `breakdowns/${driver.driver_id}/${Date.now()}-${label}-${safeName}`

    const uploadRes = await supabase.storage.from('trip-documents').upload(path, file)

    if (uploadRes.error) {
      throw new Error(uploadRes.error.message)
    }

    return supabase.storage.from('trip-documents').getPublicUrl(path).data.publicUrl
  }

  async function submitBreakdown(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!driver) return

    if (!vehicleId) {
      alert('Please select vehicle')
      return
    }

    if (!description.trim()) {
      alert('Please enter breakdown details')
      return
    }

    const gpsMapLink =
      gpsLatitude && gpsLongitude
        ? `https://www.google.com/maps?q=${gpsLatitude},${gpsLongitude}`
        : null

    setSaving(true)

    try {
      const photo1Url = await uploadPhoto(photo1, 'photo-1')
      const photo2Url = await uploadPhoto(photo2, 'photo-2')
      const photo3Url = await uploadPhoto(photo3, 'photo-3')

      const { error } = await supabase.from('driver_breakdowns').insert([
        {
          driver_id: driver.driver_id,
          vehicle_id: vehicleId,
          trailer_id: trailerId || null,
          breakdown_type: breakdownType,
          priority,
          status: 'Open',
          description: description.trim(),
          gps_latitude: gpsLatitude,
          gps_longitude: gpsLongitude,
          gps_map_link: gpsMapLink,
          photo1_url: photo1Url,
          photo2_url: photo2Url,
          photo3_url: photo3Url,
        },
      ])

      if (error) {
        alert(error.message)
        return
      }

      alert('Breakdown alert submitted successfully.')

      setDescription('')
      setPhoto1(null)
      setPhoto2(null)
      setPhoto3(null)
      captureGps()
      await loadData(driver.driver_id)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  function goBack() {
    window.location.href = '/driver-dashboard'
  }

  const gpsReady = gpsStatus.toLowerCase().includes('captured')
  const selectedVehicleNumber =
    vehicles.find((vehicle) => vehicle.id === vehicleId)?.vehicle_number || '-'

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <div className="mx-auto max-w-md pb-8">
        <header className="rounded-b-[36px] bg-[#070d22] px-5 pb-6 pt-7 text-white shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
                Breakdown Alert
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight">
                Emergency Report
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {driver?.driver_name || 'Driver'} • Vehicle {selectedVehicleNumber}
              </p>
            </div>

            <button
              onClick={goBack}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white"
            >
              Back
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <TopCard title="Status" value="Open" />
            <TopCard title="Priority" value={priority} red />
            <TopCard title="GPS" value={gpsReady ? 'ON' : 'OFF'} green={gpsReady} />
          </div>
        </header>

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

          <form onSubmit={submitBreakdown} className="mt-5 space-y-5">
            <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Vehicle
                </p>
                <h2 className="mt-1 text-2xl font-black">Vehicle Details</h2>
              </div>

              <div className="space-y-3">
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-red-500"
                  required
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_number}
                    </option>
                  ))}
                </select>

                <select
                  value={trailerId}
                  onChange={(e) => setTrailerId(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-red-500"
                >
                  <option value="">Select Trailer Optional</option>
                  {trailers.map((trailer) => (
                    <option key={trailer.id} value={trailer.id}>
                      {trailer.trailer_number}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Issue
                </p>
                <h2 className="mt-1 text-2xl font-black">Breakdown Details</h2>
              </div>

              <div className="space-y-3">
                <select
                  value={breakdownType}
                  onChange={(e) => setBreakdownType(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-red-500"
                >
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Tyre">Tyre</option>
                  <option value="Accident">Accident</option>
                  <option value="Fuel">Fuel Issue</option>
                  <option value="Battery">Battery</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-red-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Emergency">Emergency</option>
                </select>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write breakdown details here..."
                  className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base font-semibold outline-none focus:border-red-500"
                  required
                />
              </div>
            </section>

            <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Evidence
                </p>
                <h2 className="mt-1 text-2xl font-black">Photos</h2>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <PhotoPicker title="Photo 1" file={photo1} onChange={setPhoto1} />
                <PhotoPicker title="Photo 2" file={photo2} onChange={setPhoto2} />
                <PhotoPicker title="Photo 3" file={photo3} onChange={setPhoto3} />
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="h-16 w-full rounded-3xl bg-red-600 text-lg font-black text-white shadow-xl shadow-red-900/20 disabled:opacity-60"
            >
              {saving ? 'Sending Alert...' : '🚨 Submit Breakdown Alert'}
            </button>
          </form>

          <section className="mt-5 rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Recent
              </p>
              <h2 className="mt-1 text-2xl font-black">My Breakdown History</h2>
            </div>

            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">
                        {item.breakdown_type} • {getRelationName(item.vehicles)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    {item.description || '-'}
                  </p>
                </div>
              ))}

              {history.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                  No breakdown history found.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function TopCard({
  title,
  value,
  green,
  red,
}: {
  title: string
  value: string
  green?: boolean
  red?: boolean
}) {
  return (
    <div className="rounded-3xl bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
        {title}
      </p>
      <p
        className={`mt-1 text-lg font-black ${
          green ? 'text-emerald-300' : red ? 'text-red-300' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
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
