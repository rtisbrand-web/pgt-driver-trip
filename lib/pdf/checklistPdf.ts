import type { LoadedPdfImage, PdfChecklistReport } from './pdfTypes'
import { drawFooter } from './pdfFooter'
import { drawHeader } from './pdfHeader'
import {
  cleanText,
  getFailedItems,
  loadLogoDataUrl,
  loadReportImages,
  makeChecklistShareMessage,
  makeQrDataUrl,
  normalizeSections,
  pdfFileName,
  pdfText,
  reportUrl,
} from './pdfUtils'

function drawStatusBadge(pdf: any, report: PdfChecklistReport, x: number, y: number) {
  const ok = report.status === 'OK'

  pdf.setFillColor(ok ? 220 : 255, ok ? 252 : 230, ok ? 231 : 230)
  pdf.setDrawColor(ok ? 5 : 185, ok ? 150 : 28, ok ? 105 : 28)
  pdf.roundedRect(x, y, 48, 8, 4, 4, 'FD')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(ok ? 5 : 185, ok ? 120 : 28, ok ? 80 : 28)
  pdf.text(ok ? 'PASS' : 'FAIL / ATTENTION', x + 24, y + 5.5, {
    align: 'center',
  })

  pdf.setTextColor(0)
}

function drawInfoCell(
  pdf: any,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number
) {
  pdf.setDrawColor(190)
  pdf.setFillColor(250, 250, 250)
  pdf.rect(x, y, width, height, 'FD')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.5)
  pdf.setTextColor(50)
  pdf.text(label.toUpperCase(), x + 2, y + 4.2)

  pdf.setFontSize(8)
  pdf.setTextColor(0)
  pdf.text(pdf.splitTextToSize(pdfText(value), width - 4).slice(0, 2), x + 2, y + 9)
}

function drawInformationTable(pdf: any, report: PdfChecklistReport, y: number) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const x = 10
  const width = pageWidth - 20
  const columnWidth = width / 3
  const rowHeight = 12

  const rows = [
    [
      ['DTR No', cleanText(report.report_no)],
      ['Date', cleanText(report.checklist_date)],
      ['Status', cleanText(report.status)],
    ],
    [
      ['Driver', cleanText(report.driver_name_snapshot)],
      ['Mobile', cleanText(report.driver_mobile_snapshot)],
      ['Language', 'English'],
    ],
    [
      ['Vehicle', cleanText(report.vehicle_no_snapshot)],
      ['Trailer', cleanText(report.trailer_no_snapshot)],
      ['GPS Location', report.gps_map_link ? 'Captured' : '-'],
    ],
    [
      [
        'Time',
        report.checklist_time
          ? new Date(report.checklist_time).toLocaleTimeString()
          : new Date(report.created_at).toLocaleTimeString(),
      ],
      ['Fail Count', cleanText(report.fail_count || 0)],
      ['Report No', cleanText(report.report_no)],
    ],
  ]

  rows.forEach((row, rowIndex) => {
    row.forEach(([label, value], columnIndex) => {
      drawInfoCell(
        pdf,
        label,
        value,
        x + columnIndex * columnWidth,
        y + rowIndex * rowHeight,
        columnWidth,
        rowHeight
      )
    })
  })

  return y + rows.length * rowHeight + 5
}

function drawMainTitle(pdf: any, title: string, y: number, red = false) {
  const pageWidth = pdf.internal.pageSize.getWidth()

  if (red) {
    pdf.setFillColor(210, 0, 0)
  } else {
    pdf.setFillColor(7, 38, 75)
  }

  pdf.rect(10, y, pageWidth - 20, 9, 'F')
  pdf.setTextColor(255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.text(title, 14, y + 6)
  pdf.setTextColor(0)
}

function drawSectionBox(
  pdf: any,
  section: ReturnType<typeof normalizeSections>[number],
  x: number,
  y: number,
  width: number
) {
  const titleHeight = 8
  const rowHeight = 5.1
  const height = titleHeight + 6 + section.items.length * rowHeight

  pdf.setDrawColor(205)
  pdf.rect(x, y, width, height)

  pdf.setFillColor(238, 246, 252)
  pdf.rect(x, y, width, titleHeight, 'F')

  pdf.setTextColor(7, 38, 75)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text(section.title, x + 3, y + 5.5)
  pdf.setTextColor(0)

  let rowY = y + titleHeight

  pdf.setFillColor(248, 248, 248)
  pdf.rect(x, rowY, width, 6, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.2)
  pdf.text('Item', x + 3, rowY + 4)
  pdf.text('OK', x + width - 33, rowY + 4)
  pdf.text('FAIL', x + width - 21, rowY + 4)
  pdf.text('N/A', x + width - 8, rowY + 4, { align: 'right' })

  rowY += 6

  section.items.forEach((item) => {
    pdf.setDrawColor(226)
    pdf.line(x, rowY, x + width, rowY)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.4)
    pdf.setTextColor(0)
    pdf.text(pdf.splitTextToSize(item.label, width - 43)[0] || item.label, x + 3, rowY + 3.7)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.2)

    pdf.setTextColor(0, 130, 50)
    pdf.text(item.status === 'OK' ? 'OK' : '', x + width - 33, rowY + 3.7)

    pdf.setTextColor(190, 0, 0)
    pdf.text(item.status === 'FAIL' ? 'X' : '', x + width - 20, rowY + 3.7)

    pdf.setTextColor(80)
    pdf.text(item.status === 'NA' ? 'NA' : '', x + width - 3, rowY + 3.7, { align: 'right' })

    pdf.setTextColor(0)
    rowY += rowHeight
  })

  return height
}

function drawChecklistGrid(pdf: any, report: PdfChecklistReport, y: number) {
  const sections = normalizeSections(report)
  const pageWidth = pdf.internal.pageSize.getWidth()

  drawMainTitle(pdf, 'INSPECTION CHECKLIST', y)
  pdf.setTextColor(255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.text('OK', 151, y + 6)
  pdf.text('FAIL', 165, y + 6)
  pdf.text('N/A', 181, y + 6)
  pdf.setTextColor(0)

  y += 12

  const leftX = 10
  const rightX = 108
  const boxWidth = 92
  let leftY = y
  let rightY = y

  sections.forEach((section, index) => {
    const targetLeft = index % 2 === 0
    const x = targetLeft ? leftX : rightX
    const sectionY = targetLeft ? leftY : rightY
    const height = drawSectionBox(pdf, section, x, sectionY, boxWidth)

    if (targetLeft) {
      leftY += height + 5
    } else {
      rightY += height + 5
    }
  })

  return Math.max(leftY, rightY) + 2
}

function drawImageBox(
  pdf: any,
  image: LoadedPdfImage | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string
) {
  pdf.setDrawColor(190)
  pdf.rect(x, y, width, height)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.5)
  pdf.setTextColor(0)
  pdf.text(label, x + 2, y + 4.5)

  if (image?.dataUrl) {
    try {
      pdf.addImage(image.dataUrl, 'JPEG', x + 2, y + 7, width - 4, height - 9)
      return
    } catch {
      try {
        pdf.addImage(image.dataUrl, 'PNG', x + 2, y + 7, width - 4, height - 9)
        return
      } catch {
        // fallback
      }
    }
  }

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6)
  pdf.setTextColor(120)
  pdf.text('No image', x + width / 2, y + height / 2, { align: 'center' })
  pdf.setTextColor(0)
}

function drawRemarksAndPhotos(
  pdf: any,
  report: PdfChecklistReport,
  images: LoadedPdfImage[],
  y: number
) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const half = (pageWidth - 24) / 2

  pdf.setDrawColor(190)
  pdf.rect(10, y, half, 34)
  pdf.rect(10 + half + 4, y, half, 34)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text('REMARKS', 14, y + 6)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.text(pdf.splitTextToSize(pdfText(report.remarks), half - 8).slice(0, 4), 14, y + 12)

  if (report.gps_map_link) {
    pdf.setTextColor(0, 60, 160)
    pdf.text('GPS link captured', 14, y + 29)
    pdf.setTextColor(0)
  }

  const photoX = 10 + half + 8
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text('PHOTO EVIDENCE', photoX, y + 6)

  const imageWidth = 28
  const imageHeight = 22

  for (let index = 0; index < Math.min(images.length, 3); index += 1) {
    drawImageBox(
      pdf,
      images[index],
      photoX + index * 30,
      y + 9,
      imageWidth,
      imageHeight,
      `Photo ${index + 1}`
    )
  }

  return y + 38
}

function drawFailedItems(pdf: any, report: PdfChecklistReport, images: LoadedPdfImage[], y: number) {
  const failed = getFailedItems(report)
  const pageWidth = pdf.internal.pageSize.getWidth()

  if (failed.length === 0) {
    return y
  }

  drawMainTitle(pdf, 'FAILED ITEMS SUMMARY', y, true)
  y += 9

  pdf.setFillColor(248, 248, 248)
  pdf.rect(10, y, pageWidth - 20, 8, 'F')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.text('Item', 14, y + 5)
  pdf.text('Remarks', 72, y + 5)
  pdf.text('Photo', 153, y + 5)

  y += 8

  failed.slice(0, 4).forEach((item, index) => {
    pdf.setDrawColor(220)
    pdf.rect(10, y, pageWidth - 20, 14)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.text(pdfText(item.label), 14, y + 8)

    pdf.setFont('helvetica', 'normal')
    pdf.text(pdf.splitTextToSize(pdfText(item.remarks), 75).slice(0, 2), 72, y + 5)

    const image = images.find((candidate) => candidate.url === item.photo_url) || images[index]

    if (image?.dataUrl) {
      try {
        pdf.addImage(image.dataUrl, 'JPEG', 153, y + 2, 20, 10)
      } catch {
        try {
          pdf.addImage(image.dataUrl, 'PNG', 153, y + 2, 20, 10)
        } catch {
          pdf.text('Attached', 153, y + 8)
        }
      }
    } else {
      pdf.text(item.photo_url ? 'Attached' : '-', 153, y + 8)
    }

    y += 14
  })

  return y + 4
}

function drawSignatureBlock(pdf: any, report: PdfChecklistReport, y: number) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const half = (pageWidth - 24) / 2

  pdf.setDrawColor(190)
  pdf.rect(10, y, half, 31)
  pdf.rect(10 + half + 4, y, half, 31)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text('Driver Signature:', 14, y + 6)

  if (report.signature_data) {
    try {
      pdf.addImage(report.signature_data, 'PNG', 14, y + 9, 55, 14)
    } catch {
      pdf.text('Signature attached', 14, y + 17)
    }
  }

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.text(pdfText(report.driver_name_snapshot), 14, y + 27)

  const inspectorX = 10 + half + 8

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text('Inspector Signature:', inspectorX, y + 6)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.text('____________________________', inspectorX, y + 20)
  pdf.text('Inspector Name:', inspectorX, y + 27)
  pdf.text('Date:', inspectorX + 70, y + 20)
  pdf.text('__/__/____', inspectorX + 70, y + 27)
}

function drawAdditionalPhotoPage(
  pdf: any,
  report: PdfChecklistReport,
  logoDataUrl: string | null,
  qrDataUrl: string,
  images: LoadedPdfImage[]
) {
  pdf.addPage()

  drawHeader(pdf, report, logoDataUrl, qrDataUrl)

  const pageWidth = pdf.internal.pageSize.getWidth()
  let y = 58

  drawMainTitle(pdf, 'ADDITIONAL PHOTO EVIDENCE', y)
  y += 13

  const imageWidth = 90
  const imageHeight = 55

  images.slice(3, 11).forEach((image, index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = 10 + column * 100
    const imageY = y + row * 65

    drawImageBox(pdf, image, x, imageY, imageWidth, imageHeight, `Photo ${index + 4}`)
  })

  drawFooter(pdf, 2, 2)
}

export async function buildChecklistPdfBlob(report: PdfChecklistReport): Promise<Blob> {
  const jsPdfModule = await import('jspdf')
  const JsPDF = jsPdfModule.default
  const pdf = new JsPDF('p', 'mm', 'a4')

  const logoDataUrl = await loadLogoDataUrl()
  const qrDataUrl = await makeQrDataUrl(reportUrl(report))
  const images = await loadReportImages(report)
  const hasSecondPage = images.length > 3

  drawHeader(pdf, report, logoDataUrl, qrDataUrl)
  drawStatusBadge(pdf, report, 81, 50)

  let y = 64

  y = drawInformationTable(pdf, report, y)
  y = drawChecklistGrid(pdf, report, y)
  y = drawRemarksAndPhotos(pdf, report, images, y)
  y = drawFailedItems(pdf, report, images, y)

  drawSignatureBlock(pdf, report, y)
  drawFooter(pdf, 1, hasSecondPage ? 2 : 1)

  if (hasSecondPage) {
    drawAdditionalPhotoPage(pdf, report, logoDataUrl, qrDataUrl, images)
  }

  return pdf.output('blob')
}

export async function downloadChecklistPdf(report: PdfChecklistReport): Promise<void> {
  const blob = await buildChecklistPdfBlob(report)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = pdfFileName(report)
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

export async function shareChecklistPdf(report: PdfChecklistReport): Promise<void> {
  const blob = await buildChecklistPdfBlob(report)
  const file = new File([blob], pdfFileName(report), { type: 'application/pdf' })

  const navigatorWithShare = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
    share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>
  }

  if (
    navigatorWithShare.share &&
    navigatorWithShare.canShare &&
    navigatorWithShare.canShare({ files: [file] })
  ) {
    await navigatorWithShare.share({
      title: 'Vehicle Daily Checklist',
      text: makeChecklistShareMessage(report),
      files: [file],
    })
    return
  }

  await downloadChecklistPdf(report)

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${makeChecklistShareMessage(report)}\n\nPDF downloaded. Please attach the downloaded PDF in WhatsApp.`
  )}`

  window.open(whatsappUrl, '_blank')
}
