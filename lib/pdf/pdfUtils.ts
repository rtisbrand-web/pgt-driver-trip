import type {
  LoadedPdfImage,
  NormalizedChecklistSection,
  PdfChecklistReport,
} from './pdfTypes'

export const COMPANY_NAME = 'PGT Logistic and Transport Services LLC'
export const REPORT_TITLE = 'EHS VEHICLE DAILY CHECKLIST'
export const REPORT_SUBTITLE = 'Professional Safety Inspection Report'
export const REPORT_URL_BASE = 'https://pgt-driver-trip.vercel.app/checklist-history'
export const LOGO_PATH = '/pgt-logo.png'

const SECTION_NAMES: Record<string, string> = {
  mechanical: 'MECHANICAL',
  electrical: 'ELECTRICAL',
  safety: 'SAFETY',
  ppe: 'PPE',
  cargo_securement: 'CARGO & SECUREMENT',
  documents: 'DOCUMENTS',
}

const ITEM_NAMES: Record<string, string> = {
  brakes: 'BRAKES',
  clutch: 'CLUTCH',
  gear: 'GEAR',
  tires: 'TIRES',
  engine_fluids: 'ENGINE FLUIDS',
  mirrors: 'MIRRORS',
  doors: 'DOORS',
  air_system: 'AIR SYSTEM',

  lights: 'Lights',
  horn: 'Horn',
  wiper: 'Wiper',
  indicator: 'Indicator',
  reverse_horn: 'Reverse horn',
  reverse_light: 'Reverse Light',
  fan_belt: 'Fan Belt',
  starter: 'Starter',

  lashing_belts: 'Lashing belts',
  side_safety_angle: 'Side Safety Angle',
  wheel_choker: 'Wheel Choker',
  triangle: 'Triangle',
  first_aid_kit: 'First AID KIT',
  fire_extinguisher: 'Fire Extinguisher',
  trailer_head: 'Trailer Head',

  safety_helmet: 'SAFETY HELMET',
  safety_gloves: 'SAFETY GLOVES',
  safety_glasses: 'SAFETY GLASSES',
  safety_jacket: 'SAFETY JACKET',
  safety_shoes: 'SAFETY SHOES',

  // Compatibility with earlier generated checklist keys.
  first_aid: 'First Aid Box',
  safety_cones: 'Safety Cones',
  seat_belt: 'Seat Belt',
  number_plate: 'Number Plate / Reflector',
  reflective_jacket: 'Reflective Jacket',
}

export function cleanText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export function pdfText(value: string | number | null | undefined) {
  return cleanText(value)
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || '-'
}

export function reportUrl(report: PdfChecklistReport) {
  return `${REPORT_URL_BASE}?report=${report.id}`
}

export function pdfFileName(report: PdfChecklistReport) {
  const reportNo = (report.report_no || 'VDCL-REPORT').replace(/[^a-zA-Z0-9-_]/g, '-')
  const vehicle = (report.vehicle_no_snapshot || 'VEHICLE').replace(/[^a-zA-Z0-9-_]/g, '-')
  return `${reportNo}-${vehicle}.pdf`
}

export function makeChecklistShareMessage(report: PdfChecklistReport) {
  return [
    REPORT_TITLE,
    COMPANY_NAME,
    `Report No: ${cleanText(report.report_no)}`,
    `Driver: ${cleanText(report.driver_name_snapshot)}`,
    `Mobile: ${cleanText(report.driver_mobile_snapshot)}`,
    `Vehicle: ${cleanText(report.vehicle_no_snapshot)}`,
    `Trailer: ${cleanText(report.trailer_no_snapshot)}`,
    `Date: ${cleanText(report.checklist_date)}`,
    `Status: ${cleanText(report.status)}`,
    `Fail Count: ${cleanText(report.fail_count || 0)}`,
    report.gps_map_link ? `GPS: ${report.gps_map_link}` : '',
    `Report URL: ${reportUrl(report)}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function normalizeSections(report: PdfChecklistReport): NormalizedChecklistSection[] {
  const sections = Array.isArray(report.checklist_data) ? report.checklist_data : []

  return sections.map((section) => ({
    key: section.key,
    title: SECTION_NAMES[section.key] || pdfText(section.title),
    items: section.items.map((item) => ({
      ...item,
      label: ITEM_NAMES[item.key] || pdfText(item.label),
      remarks: pdfText(item.remarks),
    })),
  }))
}

export function getFailedItems(report: PdfChecklistReport) {
  return normalizeSections(report).flatMap((section) =>
    section.items
      .filter((item) => item.status === 'FAIL')
      .map((item) => ({
        section: section.title,
        key: item.key,
        label: item.label,
        status: item.status,
        remarks: item.remarks,
        photo_url: item.photo_url,
      }))
  )
}

export function collectPhotoUrls(report: PdfChecklistReport) {
  return [
    ...(Array.isArray(report.photo_urls) ? report.photo_urls : []),
    report.vehicle_photo_url,
    report.tyre_photo_url,
    report.extra_photo_url,
    ...getFailedItems(report).map((item) => item.photo_url),
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index) as string[]
}

export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' })
    const blob = await response.blob()

    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function loadLogoDataUrl(): Promise<string | null> {
  return urlToDataUrl(LOGO_PATH)
}

export async function loadReportImages(report: PdfChecklistReport): Promise<LoadedPdfImage[]> {
  const urls = collectPhotoUrls(report).slice(0, 12)
  const loaded: LoadedPdfImage[] = []

  for (const url of urls) {
    loaded.push({
      url,
      dataUrl: await urlToDataUrl(url),
    })
  }

  return loaded
}

export async function makeQrDataUrl(value: string): Promise<string> {
  try {
    // @ts-ignore qrcode package may not expose local TypeScript declarations in all installs
    const qrcode = await import('qrcode')
    const qr = qrcode.default || qrcode

    return await qr.toDataURL(value, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#07264b',
        light: '#ffffff',
      },
    })
  } catch {
    return ''
  }
}
