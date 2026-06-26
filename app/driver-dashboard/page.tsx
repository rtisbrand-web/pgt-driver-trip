'use client'

import { useEffect, useState } from 'react'
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

    const rows = (rpcRes.data || []) as FuelRouteRow[]

    const fromSet = new Set<string>()
    const toSet = new Set<string>()

    rows.forEach((row) => {
      const fromValue = normalizeLocation(row.from_norm || row.from_location || '')
      const toValue = normalizeLocation(row.to_norm || row.to_location || '')

      if (fromValue) fromSet.add(fromValue)
      if (toValue) toSet.add(toValue)
    })

    setFromOptions(Array.from(fromSet).sort())
    setToOptions(Array.from(toSet).sort())

    if (rows.length === 0) {
      alert('No fuel routes found for this company. Please check Fuel Route Master.')
    }
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
      {
        value: 'KIZAD',
        keywords: ['kizad', 'kizaat', 'lzzat', 'izzat', 'pizza hut', 'keyzad', 'kezad'],
      },
      {
        value: 'AL QUOZ',
        keywords: ['al quoz', 'al qouz', 'alcos', 'al cohal', 'alcohol', 'al kooz', 'al coz'],
      },
      {
        value: 'JEBEL ALI',
        keywords: ['jebel ali', 'jabal ali', 'jabel ali', 'jab loli', 'j ali', 'j.ali'],
      },
      {
        value: 'JAFZA',
        keywords: ['jafza', 'jebel ali free zone', 'jabal ali free zone'],
      },
      {
        value: 'KHALIFA PORT',
        keywords: ['khalifa port', 'kalifa port', 'califa port'],
      },
      {
        value: 'MUSSAFAH',
        keywords: ['mussafah', 'musaffah', 'musafa'],
      },
      {
        value: 'ICAD',
        keywords: ['icad', 'i cad', 'eye cad'],
      },
      {
        value: 'DIP',
        keywords: ['dip', 'd i p', 'dubai investment park'],
      },
      {
        value: 'DUBAI SOUTH',
        keywords: ['dubai south', 'south dubai'],
      },
      {
        value: 'DUBAI INDUSTRIAL CITY',
        keywords: ['dubai industrial city', 'industrial city dubai', 'dic'],
      },
      {
        value: 'ABU DHABI',
        keywords: ['abu dhabi', 'abudhabi', 'abu dabi', 'abu dhbai', 'abu dhbhi', 'abu dhbi'],
      },
      {
        value: 'DUBAI',
        keywords: ['dubai', 'dubi'],
      },
      {
        value: 'SHARJAH',
        keywords: ['sharjah', 'sharja', 'sher'],
      },
      {
        value: 'AJMAN',
        keywords: ['ajman', 'ajmaan'],
      },
      {
        value: 'FUJAIRAH',
        keywords: ['fujairah', 'fujaira', 'fujeirah'],
      },
      {
        value: 'RAS AL KHAIMAH',
        keywords: ['ras al khaimah', 'ras al khaima', 'rak'],
      },
      {
        value: 'UMM AL QUWAIN',
        keywords: ['umm al quwain', 'um al quwain', 'uaq'],
      },
      {
        value: 'AL AIN',
        keywords: ['al ain', 'alain'],
      },
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
        setFromLocation(selected)
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

  function logout() {
    localStorage.removeItem('pgt_driver')
    window.location.href = '/driver-login'
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl bg-slate-950 p-6 text-white shadow">
          <h1 className="text-2xl font-bold">PGT Driver Dashboard</h1>
          <p className="mt-2 text-slate-300">
            Welcome, {driver?.driver_name}
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
            My Vehicle / Trailer
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
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
              className="rounded-xl border p-3 text-slate-900"
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
              className="rounded-xl bg-slate-900 p-3 font-semibold text-white"
            >
              Save Vehicle / Trailer
            </button>
          </div>
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
            New Trip Entry
          </h2>

          <form onSubmit={saveTrip} className="grid gap-4 md:grid-cols-3">
            <select
              value={companyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.company_name}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <select
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                className="w-full rounded-xl border p-3 text-slate-900"
                required
                disabled={!companyId}
              >
                <option value="">
                  {companyId ? 'Select From Location' : 'Select Company First'}
                </option>

                {fromLocation && !fromOptions.includes(fromLocation) && (
                  <option value={fromLocation}>{fromLocation}</option>
                )}

                {fromOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => startVoiceInput('from')}
                disabled={!companyId}
                className="rounded-xl bg-slate-900 px-4 font-semibold text-white disabled:opacity-50"
              >
                🎤
              </button>
            </div>

            <div className="flex gap-2">
              <select
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                className="w-full rounded-xl border p-3 text-slate-900"
                required
                disabled={!companyId}
              >
                <option value="">
                  {companyId ? 'Select To Location' : 'Select Company First'}
                </option>

                {toLocation && !toOptions.includes(toLocation) && (
                  <option value={toLocation}>{toLocation}</option>
                )}

                {toOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => startVoiceInput('to')}
                disabled={!companyId}
                className="rounded-xl bg-slate-900 px-4 font-semibold text-white disabled:opacity-50"
              >
                🎤
              </button>
            </div>

            <input
              type="number"
              placeholder="Trip Allowance"
              value={allowance}
              onChange={(e) => setAllowance(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <input
              type="text"
              placeholder="Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
            />

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-900 p-3 font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Submitting...' : 'Submit Trip'}
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Delivery Complete - Upload Documents
          </h2>

          <form onSubmit={uploadDocuments} className="grid gap-4 md:grid-cols-4">
            <select
              value={uploadTripId}
              onChange={(e) => setUploadTripId(e.target.value)}
              className="rounded-xl border p-3 text-slate-900"
              required
            >
              <option value="">Select Trip</option>
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
              className="rounded-xl border p-3 text-slate-900"
            >
              <option value="POD">POD</option>
              <option value="Delivery Note">Delivery Note</option>
              <option value="Customer Stamp">Customer Stamp</option>
              <option value="Delivery Photo">Delivery Photo</option>
              <option value="Gate Pass">Gate Pass</option>
              <option value="Other">Other</option>
            </select>

            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={(e) => setFiles(e.target.files)}
              className="rounded-xl border p-3 text-slate-900"
              required
            />

            <button
              type="submit"
              disabled={uploading}
              className="rounded-xl bg-green-700 p-3 font-semibold text-white disabled:opacity-60"
            >
              {uploading ? 'Uploading...' : 'Submit Delivery'}
            </button>
          </form>

          <p className="mt-3 text-sm text-slate-500">
            After document upload, this trip will go to admin for verification.
          </p>
        </div>

        <div className="mt-6 overflow-auto rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-900">My Trips</h2>

          <table className="w-full">
            <thead>
              <tr className="border-b text-slate-700">
                <th className="p-3 text-left">Trip No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">From</th>
                <th className="p-3 text-left">To</th>
                <th className="p-3 text-left">Allowance</th>
                <th className="p-3 text-left">Documents</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id} className="border-b text-slate-900">
                  <td className="p-3 font-semibold">{trip.trip_no}</td>
                  <td className="p-3">{trip.trip_date}</td>
                  <td className="p-3">
                    {Array.isArray(trip.companies)
                      ? trip.companies[0]?.company_name || '-'
                      : trip.companies?.company_name || '-'}
                  </td>
                  <td className="p-3">{trip.from_location}</td>
                  <td className="p-3">{trip.to_location}</td>
                  <td className="p-3">{trip.trip_allowance}</td>
                  <td className="p-3">
                    {trip.documents_uploaded ? 'Uploaded' : 'Pending'}
                  </td>
                  <td className="p-3">{trip.status}</td>
                </tr>
              ))}

              {trips.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
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