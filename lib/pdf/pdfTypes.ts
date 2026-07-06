export type PdfChecklistItem = {
  key: string
  label: string
  status: string
  remarks: string | null
  photo_url: string | null
}

export type PdfChecklistSection = {
  key: string
  title: string
  items: PdfChecklistItem[]
}

export type PdfChecklistReport = {
  id: string
  report_no: string | null
  created_at: string
  checklist_date: string
  checklist_time: string | null
  language: string | null
  status: string
  fail_count: number | null
  not_ok_count: number | null
  remarks: string | null
  gps_map_link: string | null
  driver_name_snapshot: string | null
  driver_mobile_snapshot: string | null
  vehicle_no_snapshot: string | null
  trailer_no_snapshot: string | null
  checklist_data: PdfChecklistSection[] | null
  fail_items: any[] | null
  photo_urls: string[] | null
  vehicle_photo_url: string | null
  tyre_photo_url: string | null
  extra_photo_url: string | null
  signature_data: string | null
}

export type NormalizedChecklistItem = PdfChecklistItem & {
  label: string
  remarks: string
}

export type NormalizedChecklistSection = {
  key: string
  title: string
  items: NormalizedChecklistItem[]
}

export type LoadedPdfImage = {
  url: string
  dataUrl: string | null
}
