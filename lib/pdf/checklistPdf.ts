export async function buildPdfBlobFromElement(elementId: string): Promise<Blob> {
  const element = document.getElementById(elementId)

  if (!element) {
    throw new Error('PDF report element not found.')
  }

  const html2canvasModule = await import('html2canvas')
  const jsPdfModule = await import('jspdf')

  const html2canvas = html2canvasModule.default
  const JsPDF = jsPdfModule.default

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const pdf = new JsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  let heightLeft = imgHeight
  let position = 0

  const imgData = canvas.toDataURL('image/jpeg', 0.96)
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  return pdf.output('blob')
}

export async function downloadPdfFromElement(
  elementId: string,
  fileName: string
): Promise<void> {
  const blob = await buildPdfBlobFromElement(elementId)
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}

export async function sharePdfOrWhatsAppText(
  elementId: string,
  fileName: string,
  message: string
): Promise<void> {
  const blob = await buildPdfBlobFromElement(elementId)
  const file = new File([blob], fileName, { type: 'application/pdf' })
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
      text: message,
      files: [file],
    })
    return
  }

  await downloadPdfFromElement(elementId, fileName)

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${message}\n\nPDF downloaded. Please attach the downloaded PDF in WhatsApp.`
  )}`

  window.open(whatsappUrl, '_blank')
}
