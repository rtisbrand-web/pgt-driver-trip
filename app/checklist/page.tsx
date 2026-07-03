'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type DriverSession = {
  driver_id: string
  driver_name: string
  mobile: string
}

type Vehicle = { id: string; vehicle_number: string }
type Trailer = { id: string; trailer_number: string }

type ChecklistItem = {
  key: string
  label: string
  status: 'OK' | 'NOT_OK' | 'NA'
}

type ChecklistSection = {
  title: string
  icon: string
  items: ChecklistItem[]
}

const defaultSections: ChecklistSection[] = [
  {
    title: 'Mechanical',
    icon: '🔧',
    items: [
      { key: 'engine_oil', label: 'Engine Oil Level', status: 'OK' },
      { key: 'coolant', label: 'Coolant / Water Level', status: 'OK' },
      { key: 'brake_system', label: 'Brake System', status: 'OK' },
      { key: 'tyres', label: 'Tyres Condition', status: 'OK' },
      { key: 'wheel_nuts', label: 'Wheel Nuts', status: 'OK' },
    ],
  },
  {
    title: 'Electrical',
    icon: '💡',
    items: [
      { key: 'head_lights', label: 'Head Lights', status: 'OK' },
      { key: 'brake_lights', label: 'Brake Lights', status: 'OK' },
      { key: 'indicators', label: 'Indicators / Hazard', status: 'OK' },
      { key: 'horn', label: 'Horn', status: 'OK' },
      { key: 'battery', label: 'Battery Condition', status: 'OK' },
    ],
  },
  {
    title: 'Safety & PPE',
    icon: '🦺',
    items: [
      { key: 'fire_extinguisher', label: 'Fire Extinguisher', status: 'OK' },
      { key: 'first_aid', label: 'First Aid Box', status: 'OK' },
      { key: 'safety_cones', label: 'Safety Cones', status: 'OK' },
      { key: 'helmet', label: 'Helmet / Safety Shoes', status: 'OK' },
      { key: 'reflective_jacket', label: 'Reflective Jacket', status: 'OK' },
    ],
  },
  {
    title: 'Cargo & Securement',
    icon: '⛓️',
    items: [
      { key: 'lashing_belts', label: 'Lashing Belts', status: 'OK' },
      { key: 'chains', label: 'Chains / Clamps', status: 'OK' },
      { key: 'trailer_floor', label: 'Trailer Floor Condition', status: 'OK' },
      { key: 'load_safety', label: 'Load Safety Area', status: 'OK' },
      { key: 'tailgate', label: 'Tail Gate / Locks', status: 'OK' },
    ],
  },
]

export default function ChecklistPage() {
  const [driver, setDriver] = useState<DriverSession | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [trailers, setTrailers] = useState<Trailer[]>([])

  const [vehicleId, setVehicleId] = useState('')
  const [trailerId, setTrailerId] = useState('')
  const [sections, setSections] = useState<ChecklistSection[]>(defaultSections)
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null)
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null)
  const [gpsStatus, setGpsStatus] = useState('GPS not captured')

  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null)
  const [tyrePhoto, setTyrePhoto] = useState<File | null>(null)
  const [extraPhoto, setExtraPhoto] = useState<File | null>(null)

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

    setVehicles(vehiclesRes.data || [])
    setTrailers(trailersRes.data || [])
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

  function updateItem(
    sectionIndex: number,
    itemIndex: number,
    status: ChecklistItem['status']
  ) {
    setSections((current) =>
      current.map((section, sIndex) => {
        if (sIndex !== sectionIndex) return section

        return {
          ...section,
          items: section.items.map((item, iIndex) =>
            iIndex === itemIndex ? { ...item, status } : item
          ),
        }
      })
    )
  }

  async function uploadPhoto(file: File | null, label: string) {
    if (!file || !driver) return null

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `checklists/${driver.driver_id}/${Date.now()}-${label}-${safeName}`

    const uploadRes = await supabase.storage.from('trip-documents').upload(path, file)

    if (uploadRes.error) {
      throw new Error(uploadRes.error.message)
    }

    return supabase.storage.from('trip-documents').getPublicUrl(path).data.publicUrl
  }

  async function submitChecklist(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!driver) return

    if (!vehicleId) {
      alert('Please select vehicle')
      return
    }

    const notOkItems = sections
      .flatMap((section) =>
        section.items.map((item) => ({ ...item, section: section.title }))
      )
      .filter((item) => item.status === 'NOT_OK')

    const gpsMapLink =
      gpsLatitude && gpsLongitude
        ? `https://www.google.com/maps?q=${gpsLatitude},${gpsLongitude}`
        : null

    setSaving(true)

    try {
      const vehiclePhotoUrl = await uploadPhoto(vehiclePhoto, 'vehicle')
      const tyrePhotoUrl = await uploadPhoto(tyrePhoto, 'tyre')
      const extraPhotoUrl = await uploadPhoto(extraPhoto, 'extra')

      const { error } = await supabase.from('driver_checklists').insert([
        {
          driver_id: driver.driver_id,
          vehicle_id: vehicleId,
          trailer_id: trailerId || null,
          checklist_date: new Date().toISOString().split('T')[0],
          checklist_data: sections,
          not_ok_count: notOkItems.length,
          status: notOkItems.length > 0 ? 'Attention Required' : 'OK',
          remarks: remarks || null,
          gps_latitude: gpsLatitude,
          gps_longitude: gpsLongitude,
          gps_map_link: gpsMapLink,
          vehicle_photo_url: vehiclePhotoUrl,
          tyre_photo_url: tyrePhotoUrl,
          extra_photo_url: extraPhotoUrl,
        },
      ])

      if (error) {
        alert(error.message)
        return
      }

      alert('Daily vehicle checklist submitted successfully.')

      setSections(defaultSections)
      setRemarks('')
      setVehiclePhoto(null)
      setTyrePhoto(null)
      setExtraPhoto(null)
      captureGps()
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
  const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0)
  const okItems = sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.status === 'OK').length,
    0
  )
  const notOkItems = sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.status === 'NOT_OK').length,
    0
  )

  const selectedVehicleNumber =
    vehicles.find((vehicle) => vehicle.id === vehicleId)?.vehicle_number || '-'

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <div className="mx-auto max-w-md pb-8">
        <header className="rounded-b-[36px] bg-[#070d22] px-5 pb-6 pt-7 text-white shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                Vehicle Daily Checklist
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight">
                Safety Check
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
            <StatCard title="Total" value={totalItems.toString()} />
            <StatCard title="OK" value={okItems.toString()} green />
            <StatCard title="Issues" value={notOkItems.toString()} red />
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

          <form onSubmit={submitChecklist} className="mt-5 space-y-5">
            <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Assignment
                </p>
                <h2 className="mt-1 text-2xl font-black">Vehicle Details</h2>
              </div>

              <div className="space-y-3">
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-emerald-500"
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
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-emerald-500"
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

            {sections.map((section, sectionIndex) => (
              <section
                key={section.title}
                className="rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {section.icon} Section
                    </p>
                    <h2 className="mt-1 text-2xl font-black">{section.title}</h2>
                  </div>
                </div>

                <div className="space-y-3">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={item.key}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <p className="mb-3 text-sm font-black text-slate-700">
                        {item.label}
                      </p>

                      <div className="grid grid-cols-3 gap-2">
                        <StatusButton
                          label="OK"
                          active={item.status === 'OK'}
                          color="green"
                          onClick={() => updateItem(sectionIndex, itemIndex, 'OK')}
                        />
                        <StatusButton
                          label="Not OK"
                          active={item.status === 'NOT_OK'}
                          color="red"
                          onClick={() => updateItem(sectionIndex, itemIndex, 'NOT_OK')}
                        />
                        <StatusButton
                          label="N/A"
                          active={item.status === 'NA'}
                          color="slate"
                          onClick={() => updateItem(sectionIndex, itemIndex, 'NA')}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Evidence
                </p>
                <h2 className="mt-1 text-2xl font-black">Photos</h2>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <PhotoPicker title="Vehicle" file={vehiclePhoto} onChange={setVehiclePhoto} />
                <PhotoPicker title="Tyre" file={tyrePhoto} onChange={setTyrePhoto} />
                <PhotoPicker title="Extra" file={extraPhoto} onChange={setExtraPhoto} />
              </div>

              <textarea
                placeholder="Remarks / issue details optional"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="mt-4 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base font-semibold outline-none focus:border-emerald-500"
              />
            </section>

            <button
              type="submit"
              disabled={saving}
              className="h-16 w-full rounded-3xl bg-[#070d22] text-lg font-black text-white shadow-xl shadow-slate-300 disabled:opacity-60"
            >
              {saving ? 'Submitting Checklist...' : '✅ Submit Checklist'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

function StatCard({
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
        className={`mt-1 text-xl font-black ${
          green ? 'text-emerald-300' : red ? 'text-red-300' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function StatusButton({
  label,
  active,
  color,
  onClick,
}: {
  label: string
  active: boolean
  color: 'green' | 'red' | 'slate'
  onClick: () => void
}) {
  const activeClass =
    color === 'green'
      ? 'bg-emerald-600 text-white'
      : color === 'red'
        ? 'bg-red-600 text-white'
        : 'bg-slate-800 text-white'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-xl text-sm font-black ${
        active ? activeClass : 'bg-white text-slate-500'
      }`}
    >
      {label}
    </button>
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
