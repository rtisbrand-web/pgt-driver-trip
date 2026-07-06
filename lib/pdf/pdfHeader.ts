import type { PdfChecklistReport } from './pdfTypes'
import {
  COMPANY_NAME,
  REPORT_SUBTITLE,
  REPORT_TITLE,
  pdfText,
} from './pdfUtils'

export function drawHeader(
  pdf: any,
  report: PdfChecklistReport,
  logoDataUrl: string | null,
  qrDataUrl: string
) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const x = 10
  const y = 9
  const width = pageWidth - 20
  const height = 40

  pdf.setDrawColor(190)
  pdf.setLineWidth(0.2)
  pdf.rect(x, y, width, height)

  // Left logo area
  pdf.setDrawColor(225)
  pdf.line(55, y + 4, 55, y + height - 4)

  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, 'PNG', 15, 15, 35, 26)
    } catch {
      drawFallbackLogo(pdf)
    }
  } else {
    drawFallbackLogo(pdf)
  }

  // Right QR dedicated area
  const qrX = pageWidth - 42
  const qrY = 12
  pdf.setDrawColor(7, 38, 75)
  pdf.rect(qrX, qrY, 29, 33)

  if (qrDataUrl) {
    try {
      pdf.addImage(qrDataUrl, 'PNG', qrX + 4.5, qrY + 3, 20, 20)
    } catch {
      // ignore QR image errors
    }
  }

  pdf.setFillColor(7, 38, 75)
  pdf.rect(qrX, qrY + 24, 29, 9, 'F')
  pdf.setTextColor(255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.5)
  pdf.text('SCAN REPORT', qrX + 14.5, qrY + 29.8, { align: 'center' })

  // Main title area
  pdf.setTextColor(7, 38, 75)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text(COMPANY_NAME.toUpperCase(), pageWidth / 2, 18, { align: 'center' })

  pdf.setDrawColor(7, 38, 75)
  pdf.line(65, 22, pageWidth - 56, 22)

  pdf.setFontSize(13)
  pdf.text(REPORT_TITLE, pageWidth / 2, 30, { align: 'center' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(80)
  pdf.text(REPORT_SUBTITLE, pageWidth / 2, 36, { align: 'center' })

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.5)
  pdf.setTextColor(0)
  pdf.text(`DTR No: ${pdfText(report.report_no)}`, pageWidth / 2, 42, { align: 'center' })
  pdf.text(
    `Date: ${pdfText(report.checklist_date)}     |     Status: ${pdfText(report.status)}`,
    pageWidth / 2,
    47,
    { align: 'center' }
  )

  pdf.setTextColor(0)
}

function drawFallbackLogo(pdf: any) {
  pdf.setFillColor(7, 38, 75)
  pdf.circle(29, 28, 8, 'F')
  pdf.setTextColor(255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('PGT', 29, 31, { align: 'center' })
  pdf.setTextColor(0)
}
