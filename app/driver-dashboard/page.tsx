'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Vehicle = { id: string; vehicle_number: string }
type Trailer = { id: string; trailer_number: string }
type Company = { id: string; company_name: string }

type DriverSession = {
  driver_id: string
  driver_name: string
  mobile: string
}

type Trip = {
  id: string
  trip_no: number
  trip_date: string
  from_location: string
  to_location: string
  trip_allowance: number
  status: string
  documents_uploaded: boolean | null
  companies: { company_name: string }[] | { company_name: string } | null
}

type FuelRouteRow = {
  from_location: string | null
  to_location: string | null
  from_norm: string | null
  to_norm: string | null
}

export default function DriverDashboardPage() {
  const [driver, setDriver] = useState<DriverSession | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [trailers, setTrailers] = useState<Trailer[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [trips, setTrips] = useState<Trip[]>([])

  const [routeRows, setRouteRows] = useState<FuelRouteRow[]>([])
  const [fromOptions, setFromOptions] = useState<string[]>([])
  const [toOptions, setToOptions] = useState<string[]>([])

  const [vehicleId, setVehicleId] = useState('')
  const [trailerId, setTrailerId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [allowance, setAllowance] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null)
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null)
  const [gpsStatus, setGpsStatus] = useState('GPS not captured yet')

  const [uploadTripId, setUploadTripId] = useState('')
  const [documentType, setDocumentType] = useState('POD')
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)

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

    const companiesRes = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('is_active', true)
      .order('company_name')

    setVehicles(vehiclesRes.data || [])
    setTrailers(trailersRes.data || [])
    setCompanies(companiesRes.data || [])

    await loadTrips(driverId)
  }

  async function loadTrips(driverId: string) {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        id,
        trip_no,
        trip_date,
        from_location,
        to_location,
        trip_allowance,
        status,
        documents_uploaded,
        companies (
          company_name
        )
      `)
      .eq('driver_id', driverId)
      .order('trip_no', { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setTrips((data || []) as Trip[])
  }

  async function loadCompanyRoutes(selectedCompanyId: string) {
    setRouteRows([])
    setFromOptions([])
    setToOptions([])

    if (!selectedCompanyId) return

    const rpcRes = await supabase.rpc('get_company_fuel_route_locations', {
      p_company_id: selectedCompanyId,
    })

    if (rpcRes.error) {
      alert(rpcRes.error.message)
      return
    }

    const rows = ((rpcRes.data || []) as FuelRouteRow[]).map((row) => ({
      from_location: row.from_location,
      to_location: row.to_location,
      from_norm: normalizeLocation(row.from_norm || row.from_location || ''),
      to_norm: normalizeLocation(row.to_norm || row.to_location || ''),
    }))

    const fromSet = new Set<string>()

    rows.forEach((row) => {
      const fromValue = row.from_norm || ''
      if (fromValue) fromSet.add(fromValue)
    })

    setRouteRows(rows)
    setFromOptions(Array.from(fromSet).sort())
    setToOptions([])

    if (rows.length === 0) {
      alert('No fuel routes found for this company. Please check Fuel Route Master.')
    }
  }

  function loadToOptionsForFrom(selectedFrom: string, rowsToUse = routeRows) {
    const fromNorm = normalizeLocation(selectedFrom)
    const toSet = new Set<string>()

    rowsToUse.forEach((row) => {
      const rowFrom = normalizeLocation(row.from_norm || row.from_location || '')
      const rowTo = normalizeLocation(row.to_norm || row.to_location || '')

      if (rowFrom === fromNorm && rowTo) {
        toSet.add(rowTo)
      }
    })

    setToOptions(Array.from(toSet).sort())
  }

  function handleFromChange(selectedFrom: string) {
    setFromLocation(selectedFrom)
    setToLocation('')
    loadToOptionsForFrom(selectedFrom)
  }

  async function handleCompanyChange(newCompanyId: string) {
    setCompanyId(newCompanyId)
    setFromLocation('')
    setToLocation('')
    await loadCompanyRoutes(newCompanyId)
  }

  function normalizeLocation(input: string) {
    const text = input.toLowerCase().trim()

    const corrections: { keywords: string[]; value: string }[] = [
      { value: 'KIZAD', keywords: ['kizad', 'kizaat', 'lzzat', 'izzat', 'pizza hut', 'keyzad', 'kezad'] },
      { value: 'AL QUOZ', keywords: ['al quoz', 'al qouz', 'alcos', 'al cohal', 'alcohol', 'al kooz', 'al coz'] },
      { value: 'JEBEL ALI', keywords: ['jebel ali', 'jabal ali', 'jabel ali', 'jab loli', 'j ali', 'j.ali'] },
      { value: 'JAFZA', keywords: ['jafza', 'jebel ali free zone', 'jabal ali free zone'] },
      { value: 'KHALIFA PORT', keywords: ['khalifa port', 'kalifa port', 'califa port'] },
      { value: 'MUSSAFAH', keywords: ['mussafah', 'musaffah', 'musafa'] },
      { value: 'ICAD', keywords: ['icad', 'i cad', 'eye cad'] },
      { value: 'DIP', keywords: ['dip', 'd i p', 'dubai investment park'] },
      { value: 'DUBAI SOUTH', keywords: ['dubai south', 'south dubai'] },
      { value: 'DUBAI INDUSTRIAL CITY', keywords: ['dubai industrial city', 'industrial city dubai', 'dic'] },
      { value: 'ABU DHABI', keywords: ['abu dhabi', 'abudhabi', 'abu dabi', 'abu dhbai', 'abu dhbhi', 'abu dhbi'] },
      { value: 'DUBAI', keywords: ['dubai', 'dubi'] },
      { value: 'SHARJAH', keywords: ['sharjah', 'sharja', 'sher'] },
      { value: 'AJMAN', keywords: ['ajman', 'ajmaan'] },
      { value: 'FUJAIRAH', keywords: ['fujairah', 'fujaira', 'fujeirah'] },
      { value: 'RAS AL KHAIMAH', keywords: ['ras al khaimah', 'ras al khaima', 'rak'] },
      { value: 'UMM AL QUWAIN', keywords: ['umm al quwain', 'um al quwain', 'uaq'] },
      { value: 'AL AIN', keywords: ['al ain', 'alain'] },
    ]

    for (const item of corrections) {
      if (item.keywords.some((keyword) => text.includes(keyword))) {
        return item.value
      }
    }

    return input.trim().toUpperCase()
  }

  function selectClosestRouteOption(value: string, options: string[]) {
    const corrected = normalizeLocation(value)

    const exact = options.find(
      (option) => normalizeLocation(option) === corrected
    )

    if (exact) return exact

    const contains = options.find(
      (option) =>
        normalizeLocation(option).includes(corrected) ||
        corrected.includes(normalizeLocation(option))
    )

    return contains || corrected
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsStatus('GPS is not supported on this device/browser')
      return
    }

    setGpsStatus('Capturing GPS location...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLatitude(position.coords.latitude)
        setGpsLongitude(position.coords.longitude)
        setGpsStatus('GPS captured successfully')
      },
      () => {
        setGpsStatus('GPS permission denied or location unavailable')
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  function startVoiceInput(field: 'from' | 'to') {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Voice-to-text is not supported in this browser. Please use Google Chrome on Android.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.start()

    recognition.onresult = (event: any) => {
      const rawText = event.results[0][0].transcript

      if (field === 'from') {
        const selected = selectClosestRouteOption(rawText, fromOptions)
        handleFromChange(selected)
      } else {
        const selected = selectClosestRouteOption(rawText, toOptions)
        setToLocation(selected)
      }
    }

    recognition.onerror = () => {
      alert('Voice input failed. Please try again.')
    }
  }

  async function saveDriverAssignment() {
    if (!driver) return

    const { error } = await supabase
      .from('drivers')
      .update({
        current_vehicle_id: vehicleId || null,
        current_trailer_id: trailerId || null,
      })
      .eq('id', driver.driver_id)

    if (error) {
      alert(error.message)
      return
    }

    alert('Vehicle / Trailer updated')
  }

  async function saveTrip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!driver) return

    if (!vehicleId) {
      alert('Please select vehicle')
      return
    }

    if (!companyId) {
      alert('Please select company')
      return
    }

    if (!fromLocation) {
      alert('Please select From location')
      return
    }

    if (!toLocation) {
      alert('Please select To location')
      return
    }

    const fromNorm = normalizeLocation(fromLocation)
    const toNorm = normalizeLocation(toLocation)

    const validRoute = routeRows.some((row) => {
      const rowFrom = normalizeLocation(row.from_norm || row.from_location || '')
      const rowTo = normalizeLocation(row.to_norm || row.to_location || '')
      return rowFrom === fromNorm && rowTo === toNorm
    })

    if (!validRoute) {
      alert('Selected route is not available in Fuel Route Master. Please select a valid From and To route.')
      return
    }

    const gpsMapLink =
      gpsLatitude && gpsLongitude
        ? `https://www.google.com/maps?q=${gpsLatitude},${gpsLongitude}`
        : null

    setSaving(true)

    let allowedFuelGallons = 0
    let fuelCalculated = false

    const fuelRes = await supabase.rpc('get_allowed_fuel_gallons', {
      p_company_id: companyId,
      p_from_norm: fromNorm,
      p_to_norm: toNorm,
    })

    if (!fuelRes.error) {
      allowedFuelGallons = Number(fuelRes.data || 0)
      fuelCalculated = allowedFuelGallons > 0
    }

    const { error } = await supabase.from('trips').insert([
      {
        driver_id: driver.driver_id,
        vehicle_id: vehicleId,
        trailer_id: trailerId || null,
        company_id: companyId,
        trip_date: new Date().toISOString().split('T')[0],
        from_location: fromNorm,
        to_location: toNorm,
        from_norm: fromNorm,
        to_norm: toNorm,
        trip_allowance: allowance ? Number(allowance) : 0,
        remarks: remarks.trim(),
        status: 'Pending',
        gps_latitude: gpsLatitude,
        gps_longitude: gpsLongitude,
        gps_map_link: gpsMapLink,
        allowed_fuel_gallons: allowedFuelGallons,
        fuel_calculated: fuelCalculated,
        fuel_eligible: false,
      },
    ])

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setCompanyId('')
    setFromLocation('')
    setToLocation('')
    setFromOptions([])
    setToOptions([])
    setAllowance('')
    setRemarks('')

    alert('Trip submitted successfully. After delivery, upload documents.')
    await loadTrips(driver.driver_id)
  }

  async function uploadDocuments(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!driver) return

    if (!uploadTripId) {
      alert('Please select trip')
      return
    }

    if (!files || files.length === 0) {
      alert('Please select documents/photos')
      return
    }

    setUploading(true)

    for (const file of Array.from(files)) {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `trip-${uploadTripId}/${Date.now()}-${safeFileName}`

      const uploadRes = await supabase.storage
        .from('trip-documents')
        .upload(filePath, file)

      if (uploadRes.error) {
        setUploading(false)
        alert(uploadRes.error.message)
        return
      }

      const publicUrl = supabase.storage
        .from('trip-documents')
        .getPublicUrl(filePath).data.publicUrl

      const docRes = await supabase.from('trip_documents').insert([
        {
          trip_id: uploadTripId,
          file_name: file.name,
          file_url: publicUrl,
          document_type: documentType,
          uploaded_by: 'Driver',
        },
      ])

      if (docRes.error) {
        setUploading(false)
        alert(docRes.error.message)
        return
      }
    }

    const updateRes = await supabase
      .from('trips')
      .update({
        documents_uploaded: true,
        documents_uploaded_at: new Date().toISOString(),
        status: 'Documents Uploaded',
      })
      .eq('id', uploadTripId)

    setUploading(false)

    if (updateRes.error) {
      alert(updateRes.error.message)
      return
    }

    setUploadTripId('')
    setDocumentType('POD')
    setFiles(null)

    alert('Documents uploaded successfully. Your work for this trip is complete.')
    await loadTrips(driver.driver_id)
  }

  function getStatusBadge(status: string) {
    const cleanStatus = status.toLowerCase().trim()

    if (cleanStatus === 'verified') {
      return 'rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-700'
    }

    if (cleanStatus === 'documents uploaded') {
      return 'rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black text-blue-700'
    }

    if (cleanStatus === 'rejected') {
      return 'rounded-full bg-red-100 px-3 py-1 text-[11px] font-black text-red-700'
    }

    return 'rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-700'
  }

  function logout() {
    localStorage.removeItem('pgt_driver')
    window.location.href = '/driver-login'
  }

  function openChecklist() {
    window.location.href = '/checklist'
  }

  function openBreakdown() {
    window.location.href = '/breakdown'
  }

  function getCompanyName(trip: Trip) {
    if (Array.isArray(trip.companies)) return trip.companies[0]?.company_name || '-'
    return trip.companies?.company_name || '-'
  }

  const currentVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId)
  const currentTrailer = trailers.find((trailer) => trailer.id === trailerId)
  const gpsReady = gpsStatus.toLowerCase().includes('captured')
  const todayTrips = trips.filter(
    (trip) => trip.trip_date === new Date().toISOString().split('T')[0]
  ).length
  const pendingPod = trips.filter(
    (trip) => !trip.documents_uploaded && (trip.status === 'Pending' || trip.status === 'Rejected')
  ).length

  const latestTrips = useMemo(() => trips.slice(0, 6), [trips])

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <div className="mx-auto max-w-md pb-8">
        <header className="rounded-b-[36px] bg-[#070d22] px-5 pb-6 pt-7 text-white shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                PGT Driver App
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight">
                {driver?.driver_name || 'Driver'}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                🚛 {currentVehicle?.vehicle_number || 'No Vehicle'} • Trailer{' '}
                {currentTrailer?.trailer_number || '-'}
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30"
            >
              Logout
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatCard title="Today" value={todayTrips.toString()} />
            <StatCard title="Pending POD" value={pendingPod.toString()} />
            <StatCard title="GPS" value={gpsReady ? 'ON' : 'OFF'} green={gpsReady} />
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

          <section className="mt-5 rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Safety & Support
              </p>
              <h2 className="mt-1 text-2xl font-black">Driver Tools</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={openChecklist}
                className="min-h-28 rounded-3xl bg-emerald-600 p-4 text-left text-white shadow-lg shadow-emerald-900/20"
              >
                <span className="text-3xl">✅</span>
                <p className="mt-3 text-base font-black">Daily Checklist</p>
                <p className="mt-1 text-xs font-semibold text-emerald-100">
                  Vehicle safety check
                </p>
              </button>

              <button
                type="button"
                onClick={openBreakdown}
                className="min-h-28 rounded-3xl bg-red-600 p-4 text-left text-white shadow-lg shadow-red-900/20"
              >
                <span className="text-3xl">🚨</span>
                <p className="mt-3 text-base font-black">Breakdown Alert</p>
                <p className="mt-1 text-xs font-semibold text-red-100">
                  Report vehicle issue
                </p>
              </button>
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-[28px] bg-white shadow-lg shadow-slate-200">
            <div className="bg-gradient-to-br from-blue-950 to-[#070d22] p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                Assignment
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-slate-300">Vehicle</p>
                  <p className="mt-1 truncate text-xl font-black">
                    {currentVehicle?.vehicle_number || '-'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-slate-300">Trailer</p>
                  <p className="mt-1 truncate text-xl font-black">
                    {currentTrailer?.trailer_number || '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-emerald-500"
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
                <option value="">Select Trailer</option>
                {trailers.map((trailer) => (
                  <option key={trailer.id} value={trailer.id}>
                    {trailer.trailer_number}
                  </option>
                ))}
              </select>

              <button
                onClick={saveDriverAssignment}
                className="h-14 w-full rounded-2xl bg-[#070d22] text-base font-black text-white shadow-lg shadow-slate-300"
              >
                Save Vehicle / Trailer
              </button>
            </div>
          </section>

          <section className="mt-5 rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Operation
                </p>
                <h2 className="mt-1 text-2xl font-black">New Trip</h2>
              </div>
              <div className="rounded-2xl bg-[#070d22] px-4 py-3 text-sm font-bold text-white">
                🚛
              </div>
            </div>

            <form onSubmit={saveTrip} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Company
                </span>
                <select
                  value={companyId}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </label>

              <RouteSelect
                title="From"
                value={fromLocation}
                disabled={!companyId}
                placeholder={companyId ? 'Select From Location' : 'Select Company First'}
                options={fromOptions}
                onChange={handleFromChange}
                onVoice={() => startVoiceInput('from')}
              />

              <RouteSelect
                title="To"
                value={toLocation}
                disabled={!companyId || !fromLocation}
                placeholder={
                  !companyId
                    ? 'Select Company First'
                    : !fromLocation
                      ? 'Select From First'
                      : 'Select To Location'
                }
                options={toOptions}
                onChange={setToLocation}
                onVoice={() => startVoiceInput('to')}
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Allowance
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    value={allowance}
                    onChange={(e) => setAllowance(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Remarks
                  </span>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold outline-none focus:border-emerald-500"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="h-16 w-full rounded-3xl bg-emerald-600 text-lg font-black text-white shadow-xl shadow-emerald-900/20 disabled:opacity-60"
              >
                {saving ? 'Submitting Trip...' : '✅ Submit Trip'}
              </button>
            </form>
          </section>

          <section className="mt-5 rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Delivery
                </p>
                <h2 className="mt-1 text-2xl font-black">Upload POD</h2>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                Required
              </span>
            </div>

            <form onSubmit={uploadDocuments} className="space-y-4">
              <select
                value={uploadTripId}
                onChange={(e) => setUploadTripId(e.target.value)}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-blue-500"
                required
              >
                <option value="">Select Pending Trip</option>
                {trips
                  .filter((trip) => trip.status === 'Pending' || trip.status === 'Rejected')
                  .map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      Trip #{trip.trip_no} - {trip.from_location} to {trip.to_location}
                    </option>
                  ))}
              </select>

              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-blue-500"
              >
                <option value="POD">POD</option>
                <option value="Delivery Note">Delivery Note</option>
                <option value="Customer Stamp">Customer Stamp</option>
                <option value="Delivery Photo">Delivery Photo</option>
                <option value="Gate Pass">Gate Pass</option>
                <option value="Other">Other</option>
              </select>

              <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-3 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(e) => setFiles(e.target.files)}
                  className="hidden"
                  required
                />
                <span className="text-3xl">📷</span>
                <span className="mt-1 text-sm font-black text-slate-700">
                  Tap to upload POD / Photos
                </span>
                <span className="mt-1 text-xs text-slate-400">
                  {files?.length ? `${files.length} file(s) selected` : 'Image or PDF'}
                </span>
              </label>

              <button
                type="submit"
                disabled={uploading}
                className="h-16 w-full rounded-3xl bg-blue-900 text-lg font-black text-white shadow-xl shadow-blue-900/20 disabled:opacity-60"
              >
                {uploading ? 'Uploading...' : '📤 Submit Delivery'}
              </button>
            </form>
          </section>

          <section className="mt-5 rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Recent
                </p>
                <h2 className="mt-1 text-2xl font-black">My Trips</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                Last 6
              </span>
            </div>

            <div className="space-y-3">
              {latestTrips.map((trip, index) => (
                <div
                  key={trip.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-blue-700">
                        #{index + 1} • Trip {trip.trip_no}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {trip.trip_date} • {getCompanyName(trip)}
                      </p>
                    </div>
                    <span className={getStatusBadge(trip.status)}>
                      {trip.status}
                    </span>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {trip.from_location}
                        </p>
                        <p className="text-[10px] text-slate-400">From</p>
                      </div>
                      <span className="text-xl">→</span>
                      <div className="min-w-0 text-right">
                        <p className="truncate text-sm font-black">
                          {trip.to_location}
                        </p>
                        <p className="text-[10px] text-slate-400">To</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between text-xs font-bold text-slate-500">
                    <span>Allowance: {trip.trip_allowance}</span>
                    <span>
                      POD: {trip.documents_uploaded ? 'Uploaded' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}

              {latestTrips.length === 0 && (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                  No trips found.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function StatCard({
  title,
  value,
  green,
}: {
  title: string
  value: string
  green?: boolean
}) {
  return (
    <div className="rounded-3xl bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
        {title}
      </p>
      <p
        className={`mt-1 text-xl font-black ${
          green ? 'text-emerald-300' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function RouteSelect({
  title,
  value,
  options,
  placeholder,
  disabled,
  onChange,
  onVoice,
}: {
  title: string
  value: string
  options: string[]
  placeholder: string
  disabled: boolean
  onChange: (value: string) => void
  onVoice: () => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-600">
        {title}
      </span>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-emerald-500 disabled:opacity-60"
          required
          disabled={disabled}
        >
          <option value="">{placeholder}</option>

          {value && !options.includes(value) && (
            <option value={value}>{value}</option>
          )}

          {options.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onVoice}
          disabled={disabled}
          className="h-14 w-16 rounded-2xl bg-[#070d22] text-xl font-black text-white disabled:opacity-50"
        >
          🎤
        </button>
      </div>
    </label>
  )
}
