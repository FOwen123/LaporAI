import { parseBpa1Text, type WithholdingRecord } from './tax'

const MAX_PDF_BYTES = 2_000_000

export function validatePdfFile(file: File): void {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Choose a text-based PDF file.')
  }
  if (file.size > MAX_PDF_BYTES) throw new Error('The PDF must be 2 MB or smaller.')
  if (!file.size) throw new Error('The PDF is empty.')
}

export async function extractBpa1FromPdf(file: File): Promise<WithholdingRecord> {
  validatePdfFile(file)
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ])
  ;(globalThis as typeof globalThis & { pdfjsWorker?: unknown }).pdfjsWorker = worker
  const buffer = typeof file.arrayBuffer === 'function'
    ? await file.arrayBuffer()
    : await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('The PDF could not be read locally.'))
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.readAsArrayBuffer(file)
      })
  const bytes = new Uint8Array(buffer)
  const pdf = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise
  let text = ''
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    text += `${content.items.map((item) => ('str' in item ? item.str : '')).join('\n')}\n`
  }
  return parseBpa1Text(text)
}

const escapePdf = (value: string) => value.replace(/([\\()])/g, '\\$1')

export function createSampleBpa1Pdf(text: string): Uint8Array {
  const stream = [
    'BT',
    '/F1 10 Tf',
    '50 790 Td',
    ...text.split('\n').flatMap((line, index) => [index ? '0 -18 Td' : '', `(${escapePdf(line)}) Tj`]).filter(Boolean),
    'ET',
  ].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = new TextEncoder().encode(pdf).length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(pdf)
}
