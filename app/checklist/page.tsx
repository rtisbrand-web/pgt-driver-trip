'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Lang = 'en' | 'ur' | 'hi'
type Status = 'OK' | 'FAIL' | 'NA'

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

type ChecklistItem = {
  key: string
  en: string
  ur: string
  hi: string
  status: Status
  remarks: string
  photo: File | null
}

type ChecklistSection = {
  key: string
  icon: string
  en: string
  ur: string
  hi: string
  items: ChecklistItem[]
}

type LabelSet = {
  title: string
  subtitle: string
  chooseLanguage: string
  back: string
  gpsCaptured: string
  captureGps: string
  vehicleDetails: string
  selectVehicle: string
  selectTrailer: string
  ok: string
  fail: string
  na: string
  failRemarks: string
  photo: string
  evidence: string
  remarks: string
  signature: string
  clearSignature: string
  submit: string
  submitting: string
  total: string
  issues: string
  tap: string
  front: string
  rear: string
  left: string
  right: string
  tyres: string
  dashboard: string
  engine: string
  extra: string
}

const L: Record<Lang, LabelSet> = {
  en: {
    title: 'Vehicle Daily Checklist',
    subtitle: 'Driver safety inspection report',
    chooseLanguage: 'Choose Language',
    back: 'Back',
    gpsCaptured: 'GPS Captured',
    captureGps: 'Capture GPS',
    vehicleDetails: 'Vehicle Details',
    selectVehicle: 'Select Vehicle',
    selectTrailer: 'Select Trailer Optional',
    ok: 'OK',
    fail: 'FAIL',
    na: 'N/A',
    failRemarks: 'Fail remarks required',
    photo: 'Photo',
    evidence: 'Evidence Photos',
    remarks: 'General Remarks',
    signature: 'Driver Signature',
    clearSignature: 'Clear Signature',
    submit: 'Submit Checklist',
    submitting: 'Submitting...',
    total: 'Total',
    issues: 'Issues',
    tap: 'Tap',
    front: 'Front',
    rear: 'Rear',
    left: 'Left',
    right: 'Right',
    tyres: 'Tyres',
    dashboard: 'Dashboard',
    engine: 'Engine',
    extra: 'Extra',
  },
  ur: {
    title: 'گاڑی کی روزانہ چیک لسٹ',
    subtitle: 'ڈرائیور سیفٹی انسپیکشن رپورٹ',
    chooseLanguage: 'زبان منتخب کریں',
    back: 'واپس',
    gpsCaptured: 'GPS محفوظ ہو گیا',
    captureGps: 'GPS محفوظ کریں',
    vehicleDetails: 'گاڑی کی تفصیل',
    selectVehicle: 'گاڑی منتخب کریں',
    selectTrailer: 'ٹریلر منتخب کریں',
    ok: 'ٹھیک',
    fail: 'خراب',
    na: 'لاگو نہیں',
    failRemarks: 'خرابی کی تفصیل لازمی ہے',
    photo: 'تصویر',
    evidence: 'ثبوت تصاویر',
    remarks: 'عمومی ریمارکس',
    signature: 'ڈرائیور دستخط',
    clearSignature: 'دستخط صاف کریں',
    submit: 'چیک لسٹ جمع کریں',
    submitting: 'جمع ہو رہی ہے...',
    total: 'کل',
    issues: 'مسائل',
    tap: 'کلک',
    front: 'سامنے',
    rear: 'پیچھے',
    left: 'بائیں',
    right: 'دائیں',
    tyres: 'ٹائر',
    dashboard: 'ڈیش بورڈ',
    engine: 'انجن',
    extra: 'اضافی',
  },
  hi: {
    title: 'वाहन दैनिक चेकलिस्ट',
    subtitle: 'ड्राइवर सुरक्षा निरीक्षण रिपोर्ट',
    chooseLanguage: 'भाषा चुनें',
    back: 'वापस',
    gpsCaptured: 'GPS कैप्चर हो गया',
    captureGps: 'GPS कैप्चर करें',
    vehicleDetails: 'वाहन विवरण',
    selectVehicle: 'वाहन चुनें',
    selectTrailer: 'ट्रेलर वैकल्पिक',
    ok: 'ठीक',
    fail: 'खराब',
    na: 'लागू नहीं',
    failRemarks: 'खराबी की टिप्पणी जरूरी है',
    photo: 'फोटो',
    evidence: 'प्रमाण फोटो',
    remarks: 'सामान्य टिप्पणी',
    signature: 'ड्राइवर हस्ताक्षर',
    clearSignature: 'हस्ताक्षर साफ करें',
    submit: 'चेकलिस्ट सबमिट करें',
    submitting: 'सबमिट हो रहा है...',
    total: 'कुल',
    issues: 'समस्या',
    tap: 'टैप',
    front: 'आगे',
    rear: 'पीछे',
    left: 'बाएं',
    right: 'दाएं',
    tyres: 'टायर',
    dashboard: 'डैशबोर्ड',
    engine: 'इंजन',
    extra: 'अतिरिक्त',
  },
}

function makeItem(key: string, en: string, ur: string, hi: string): ChecklistItem {
  return { key, en, ur, hi, status: 'OK', remarks: '', photo: null }
}

function makeSections(): ChecklistSection[] {
  return [
    {
      key: 'mechanical',
      icon: '🔧',
      en: 'Mechanical',
      ur: 'مکینیکل',
      hi: 'मैकेनिकल',
      items: [
        makeItem('brakes', 'BRAKES', 'بریک', 'ब्रेक'),
        makeItem('clutch', 'CLUTCH', 'کلچ', 'क्लच'),
        makeItem('gear', 'GEAR', 'گیئر', 'गियर'),
        makeItem('tires', 'TIRES', 'ٹائر', 'टायर'),
        makeItem('engine_fluids', 'ENGINE FLUIDS', 'انجن فلوئڈز', 'इंजन फ्लूइड्स'),
        makeItem('mirrors', 'MIRRORS', 'مررز', 'मिरर'),
        makeItem('doors', 'DOORS', 'دروازے', 'दरवाज़े'),
        makeItem('air_system', 'AIR SYSTEM', 'ایئر سسٹم', 'एयर सिस्टम'),
      ],
    },
    {
      key: 'electrical',
      icon: '💡',
      en: 'Electrical',
      ur: 'الیکٹریکل',
      hi: 'इलेक्ट्रिकल',
      items: [
        makeItem('lights', 'Lights', 'لائٹس', 'लाइट्स'),
        makeItem('horn', 'Horn', 'ہارن', 'हॉर्न'),
        makeItem('wiper', 'Wiper', 'وائپر', 'वाइपर'),
        makeItem('indicator', 'Indicator', 'انڈیکیٹر', 'इंडिकेटर'),
        makeItem('reverse_horn', 'Reverse horn', 'ریورس ہارن', 'रिवर्स हॉर्न'),
        makeItem('reverse_light', 'Reverse Light', 'ریورس لائٹ', 'रिवर्स लाइट'),
        makeItem('fan_belt', 'Fan Belt', 'فین بیلٹ', 'फैन बेल्ट'),
        makeItem('starter', 'Starter', 'اسٹارٹر', 'स्टार्टर'),
      ],
    },
    {
      key: 'safety',
      icon: '🛡️',
      en: 'Safety',
      ur: 'سیفٹی',
      hi: 'सेफ्टी',
      items: [
        makeItem('lashing_belts', 'Lashing belts', 'لیشنگ بیلٹس', 'लैशिंग बेल्ट'),
        makeItem('side_safety_angle', 'Side Safety Angle', 'سائیڈ سیفٹی اینگل', 'साइड सेफ्टी एंगल'),
        makeItem('wheel_choker', 'Wheel Choker', 'وہیل چوکر', 'व्हील चोकर'),
        makeItem('triangle', 'Triangle', 'ٹرائی اینگل', 'ट्रायंगल'),
        makeItem('first_aid_kit', 'First AID KIT', 'فرسٹ ایڈ کٹ', 'फर्स्ट एड किट'),
        makeItem('fire_extinguisher', 'Fire Extinguisher', 'فائر ایکسٹنگوشر', 'फायर एक्सटिंग्विशर'),
        makeItem('trailer_head', 'Trailer Head', 'ٹریلر ہیڈ', 'ट्रेलर हेड'),
      ],
    },
    {
      key: 'ppe',
      icon: '🦺',
      en: 'PPE',
      ur: 'پی پی ای',
      hi: 'पीपीई',
      items: [
        makeItem('safety_helmet', 'SAFETY HELMET', 'سیفٹی ہیلمٹ', 'सेफ्टी हेलमेट'),
        makeItem('safety_gloves', 'SAFETY GLOVES', 'سیفٹی گلوز', 'सेफ्टी ग्लव्स'),
        makeItem('safety_glasses', 'SAFETY GLASSES', 'سیفٹی گلاسز', 'सेफ्टी ग्लासेस'),
        makeItem('safety_jacket', 'SAFETY JACKET', 'سیفٹی جیکٹ', 'सेफ्टी जैकेट'),
        makeItem('safety_shoes', 'SAFETY SHOES', 'سیفٹی شوز', 'सेफ्टी शूज़'),
      ],
    },
  ]
}

export default function ChecklistPage() {
  const [driver, setDriver] = useState<DriverSession | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [trailers, setTrailers] = useState<Trailer[]>([])
  const [language, setLanguage] = useState<Lang>('en')
  const [languageSelected, setLanguageSelected] = useState(false)

  const [vehicleId, setVehicleId] = useState('')
  const [trailerId, setTrailerId] = useState('')
  const [sections, setSections] = useState<ChecklistSection[]>(makeSections())
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null)
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null)
  const [gpsStatus, setGpsStatus] = useState('GPS not captured')

  const [vehicleFrontPhoto, setVehicleFrontPhoto] = useState<File | null>(null)
  const [vehicleRearPhoto, setVehicleRearPhoto] = useState<File | null>(null)
  const [leftSidePhoto, setLeftSidePhoto] = useState<File | null>(null)
  const [rightSidePhoto, setRightSidePhoto] = useState<File | null>(null)
  const [tyrePhoto, setTyrePhoto] = useState<File | null>(null)
  const [dashboardPhoto, setDashboardPhoto] = useState<File | null>(null)
  const [enginePhoto, setEnginePhoto] = useState<File | null>(null)
  const [extraPhoto, setExtraPhoto] = useState<File | null>(null)

  const [signatureData, setSignatureData] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)

  const t = L[language]

  useEffect(() => {
    const savedLanguage = localStorage.getItem('pgt_checklist_language') as Lang | null
    if (savedLanguage && ['en', 'ur', 'hi'].includes(savedLanguage)) {
      setLanguage(savedLanguage)
      setLanguageSelected(true)
    }

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

  function chooseLanguage(code: Lang) {
    setLanguage(code)
    setLanguageSelected(true)
    localStorage.setItem('pgt_checklist_language', code)
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

  function sectionTitle(section: ChecklistSection) {
    return section[language]
  }

  function itemLabel(item: ChecklistItem) {
    return item[language]
  }

  function updateItem(sectionIndex: number, itemIndex: number, patch: Partial<ChecklistItem>) {
    setSections((current) =>
      current.map((section, sIndex) =>
        sIndex !== sectionIndex
          ? section
          : {
              ...section,
              items: section.items.map((item, iIndex) =>
                iIndex === itemIndex ? { ...item, ...patch } : item
              ),
            }
      )
    )
  }

  async function uploadPhoto(file: File | null, label: string) {
    if (!file || !driver) return null

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `checklists/${driver.driver_id}/${Date.now()}-${label}-${safeName}`

    const uploadRes = await supabase.storage.from('trip-documents').upload(path, file)

    if (uploadRes.error) throw new Error(uploadRes.error.message)

    return supabase.storage.from('trip-documents').getPublicUrl(path).data.publicUrl
  }

  function getCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startDrawing(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const point = getCanvasPoint(e)
    if (!canvas || !point) return
    isDrawingRef.current = true
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const point = getCanvasPoint(e)
    if (!canvas || !point) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    setSignatureData(canvas.toDataURL('image/png'))
  }

  function stopDrawing() {
    isDrawingRef.current = false
  }

  function clearSignature() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureData('')
  }

  function validateChecklist() {
    if (!vehicleId) {
      alert(t.selectVehicle)
      return false
    }

    const failWithoutRemarks = sections
      .flatMap((section) => section.items)
      .find((item) => item.status === 'FAIL' && !item.remarks.trim())

    if (failWithoutRemarks) {
      alert(`${t.failRemarks}: ${failWithoutRemarks.en}`)
      return false
    }

    return true
  }

  async function submitChecklist(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!driver) return
    if (!validateChecklist()) return

    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId)
    const selectedTrailer = trailers.find((trailer) => trailer.id === trailerId)

    const gpsMapLink =
      gpsLatitude && gpsLongitude
        ? `https://www.google.com/maps?q=${gpsLatitude},${gpsLongitude}`
        : null

    setSaving(true)

    try {
      const savedSections = []

      for (const section of sections) {
        const savedItems = []
        for (const checkItem of section.items) {
          const photoUrl = await uploadPhoto(checkItem.photo, checkItem.key)
          savedItems.push({
            key: checkItem.key,
            label: itemLabel(checkItem),
            status: checkItem.status,
            remarks: checkItem.remarks.trim() || null,
            photo_url: photoUrl,
          })
        }
        savedSections.push({
          key: section.key,
          title: sectionTitle(section),
          items: savedItems,
        })
      }

      const frontUrl = await uploadPhoto(vehicleFrontPhoto, 'vehicle-front')
      const rearUrl = await uploadPhoto(vehicleRearPhoto, 'vehicle-rear')
      const leftUrl = await uploadPhoto(leftSidePhoto, 'left-side')
      const rightUrl = await uploadPhoto(rightSidePhoto, 'right-side')
      const tyreUrl = await uploadPhoto(tyrePhoto, 'tyres')
      const dashboardUrl = await uploadPhoto(dashboardPhoto, 'dashboard')
      const engineUrl = await uploadPhoto(enginePhoto, 'engine')
      const extraUrl = await uploadPhoto(extraPhoto, 'extra')

      const photoUrls = [
        frontUrl,
        rearUrl,
        leftUrl,
        rightUrl,
        tyreUrl,
        dashboardUrl,
        engineUrl,
        extraUrl,
      ].filter(Boolean)

      const failItems = savedSections.flatMap((section) =>
        section.items
          .filter((checkItem) => checkItem.status === 'FAIL')
          .map((checkItem) => ({
            section: section.title,
            key: checkItem.key,
            label: checkItem.label,
            remarks: checkItem.remarks,
            photo_url: checkItem.photo_url,
          }))
      )

      const reportNo = `VDCL-${new Date().getFullYear()}-${Date.now()}`

      const { error } = await supabase.from('driver_checklists').insert([
        {
          driver_id: driver.driver_id,
          driver_name_snapshot: driver.driver_name,
          driver_mobile_snapshot: driver.mobile,
          vehicle_id: vehicleId,
          vehicle_no_snapshot: selectedVehicle?.vehicle_number || null,
          trailer_id: trailerId || null,
          trailer_no_snapshot: selectedTrailer?.trailer_number || null,
          language,
          checklist_date: new Date().toISOString().split('T')[0],
          checklist_time: new Date().toISOString(),
          checklist_data: savedSections,
          mechanical_data: savedSections.find((section) => section.key === 'mechanical')?.items || [],
          electrical_data: savedSections.find((section) => section.key === 'electrical')?.items || [],
          safety_data: savedSections.find((section) => section.key === 'safety')?.items || [],
          ppe_data: savedSections.find((section) => section.key === 'ppe')?.items || [],
          fail_items: failItems,
          fail_count: failItems.length,
          not_ok_count: failItems.length,
          status: failItems.length > 0 ? 'Attention Required' : 'OK',
          remarks: remarks.trim() || null,
          gps_latitude: gpsLatitude,
          gps_longitude: gpsLongitude,
          gps_map_link: gpsMapLink,
          signature_data: signatureData || null,
          vehicle_photo_url: frontUrl,
          tyre_photo_url: tyreUrl,
          extra_photo_url: extraUrl,
          photo_urls: photoUrls,
          report_no: reportNo,
        },
      ])

      if (error) {
        alert(error.message)
        return
      }

      alert(`Checklist submitted successfully. Report No: ${reportNo}`)

      setSections(makeSections())
      setRemarks('')
      setVehicleFrontPhoto(null)
      setVehicleRearPhoto(null)
      setLeftSidePhoto(null)
      setRightSidePhoto(null)
      setTyrePhoto(null)
      setDashboardPhoto(null)
      setEnginePhoto(null)
      setExtraPhoto(null)
      clearSignature()
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

  const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0)
  const okItems = sections.reduce(
    (sum, section) => sum + section.items.filter((checkItem) => checkItem.status === 'OK').length,
    0
  )
  const failItemsCount = sections.reduce(
    (sum, section) => sum + section.items.filter((checkItem) => checkItem.status === 'FAIL').length,
    0
  )
  const gpsReady = gpsStatus.toLowerCase().includes('captured')
  const selectedVehicleNumber =
    vehicles.find((vehicle) => vehicle.id === vehicleId)?.vehicle_number || '-'

  if (!languageSelected) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070d22] p-5 text-white">
        <div className="w-full max-w-md rounded-[34px] bg-white p-6 text-slate-900 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
            PGT Driver App
          </p>
          <h1 className="mt-3 text-3xl font-black">{L.en.chooseLanguage}</h1>

          <div className="mt-6 space-y-3">
            <button onClick={() => chooseLanguage('en')} className="h-16 w-full rounded-2xl bg-[#070d22] text-lg font-black text-white">
              🇬🇧 English
            </button>
            <button onClick={() => chooseLanguage('ur')} className="h-16 w-full rounded-2xl bg-[#070d22] text-lg font-black text-white">
              🇵🇰 اردو
            </button>
            <button onClick={() => chooseLanguage('hi')} className="h-16 w-full rounded-2xl bg-[#070d22] text-lg font-black text-white">
              🇮🇳 हिन्दी
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <div className="mx-auto max-w-md pb-8">
        <header className="rounded-b-[36px] bg-[#070d22] px-5 pb-6 pt-7 text-white shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                {t.title}
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight">
                Safety Check
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {driver?.driver_name || '-'} • {selectedVehicleNumber}
              </p>
            </div>

            <button
              onClick={goBack}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white"
            >
              {t.back}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatCard title={t.total} value={totalItems.toString()} />
            <StatCard title={t.ok} value={okItems.toString()} green />
            <StatCard title={t.issues} value={failItemsCount.toString()} red />
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
            📍 {gpsReady ? t.gpsCaptured : t.captureGps}
          </button>

          <form onSubmit={submitChecklist} className="mt-5 space-y-5">
            <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Report Information
                </p>
                <h2 className="mt-1 text-2xl font-black">{t.vehicleDetails}</h2>
              </div>

              <div className="space-y-3">
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">{t.selectVehicle}</option>
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
                  <option value="">{t.selectTrailer}</option>
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
                key={section.key}
                className="rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200"
              >
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {section.icon} Inspection
                  </p>
                  <h2 className="mt-1 text-2xl font-black">{section[language]}</h2>
                </div>

                <div className="space-y-3">
                  {section.items.map((checkItem, itemIndex) => (
                    <div
                      key={checkItem.key}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <p className="mb-3 text-sm font-black text-slate-700">
                        {checkItem[language]}
                      </p>

                      <div className="grid grid-cols-3 gap-2">
                        <StatusButton
                          label={t.ok}
                          active={checkItem.status === 'OK'}
                          color="green"
                          onClick={() => updateItem(sectionIndex, itemIndex, { status: 'OK' })}
                        />
                        <StatusButton
                          label={t.fail}
                          active={checkItem.status === 'FAIL'}
                          color="red"
                          onClick={() => updateItem(sectionIndex, itemIndex, { status: 'FAIL' })}
                        />
                        <StatusButton
                          label={t.na}
                          active={checkItem.status === 'NA'}
                          color="slate"
                          onClick={() => updateItem(sectionIndex, itemIndex, { status: 'NA' })}
                        />
                      </div>

                      {checkItem.status === 'FAIL' && (
                        <div className="mt-3 space-y-3">
                          <textarea
                            value={checkItem.remarks}
                            onChange={(e) =>
                              updateItem(sectionIndex, itemIndex, { remarks: e.target.value })
                            }
                            placeholder={t.failRemarks}
                            className="min-h-20 w-full rounded-2xl border border-red-200 bg-white p-3 text-sm font-semibold outline-none focus:border-red-500"
                          />

                          <PhotoPicker
                            title={`${t.photo} (${t.fail})`}
                            file={checkItem.photo}
                            onChange={(file) =>
                              updateItem(sectionIndex, itemIndex, { photo: file })
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {t.evidence}
                </p>
                <h2 className="mt-1 text-2xl font-black">{t.photo}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <PhotoPicker title={t.front} file={vehicleFrontPhoto} onChange={setVehicleFrontPhoto} />
                <PhotoPicker title={t.rear} file={vehicleRearPhoto} onChange={setVehicleRearPhoto} />
                <PhotoPicker title={t.left} file={leftSidePhoto} onChange={setLeftSidePhoto} />
                <PhotoPicker title={t.right} file={rightSidePhoto} onChange={setRightSidePhoto} />
                <PhotoPicker title={t.tyres} file={tyrePhoto} onChange={setTyrePhoto} />
                <PhotoPicker title={t.dashboard} file={dashboardPhoto} onChange={setDashboardPhoto} />
                <PhotoPicker title={t.engine} file={enginePhoto} onChange={setEnginePhoto} />
                <PhotoPicker title={t.extra} file={extraPhoto} onChange={setExtraPhoto} />
              </div>

              <textarea
                placeholder={t.remarks}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="mt-4 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base font-semibold outline-none focus:border-emerald-500"
              />
            </section>

            <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-slate-200">
              <h2 className="text-2xl font-black">{t.signature}</h2>

              <canvas
                ref={canvasRef}
                width={360}
                height={160}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
                className="mt-4 h-40 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50"
              />

              <button
                type="button"
                onClick={clearSignature}
                className="mt-3 h-12 w-full rounded-2xl bg-slate-800 text-sm font-black text-white"
              >
                {t.clearSignature}
              </button>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="h-16 w-full rounded-3xl bg-[#070d22] text-lg font-black text-white shadow-xl shadow-slate-300 disabled:opacity-60"
            >
              {saving ? t.submitting : `✅ ${t.submit}`}
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
