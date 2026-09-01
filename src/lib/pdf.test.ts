import { SAMPLE_BPA1_TEXT, createBankStatementText, createBpa1Text, createFinancingStatementText, createSyntheticProfile } from './tax'
import { createSampleBpa1Pdf, extractBpa1FromPdf, extractSupportingEvidenceFromPdf, validatePdfFile } from './pdf'

describe('fictional BPA1 PDF boundary', () => {
  it('creates a local PDF containing the fictional fixture', () => {
    const bytes = createSampleBpa1Pdf(SAMPLE_BPA1_TEXT)
    expect(new TextDecoder().decode(bytes)).toContain('%PDF-1.4')
    expect(new TextDecoder().decode(bytes)).toContain('LAPORAI BPA1 SAMPLE')
  })

  it('extracts the supplied generated PDF end to end', async () => {
    const profile = { ...createSyntheticProfile('Ayu Larasati'), taxId: 'DEMO-NPWP-AYU001' }
    const file = new File([createSampleBpa1Pdf(createBpa1Text(profile))], 'LaporAI-BPA1-SAMPLE.pdf', { type: 'application/pdf' })
    const record = await extractBpa1FromPdf(file)
    expect(record.taxpayerName).toBe(profile.name)
    expect(record.taxpayerId).toBe(profile.taxId)
    expect(record.employer).toBe('PT NUSANTARA TEKNOLOGI')
    expect(record.taxWithheld).toBe(13_900_000)
  })

  it('extracts profile-matched bank and financing PDFs end to end', async () => {
    const profile = { ...createSyntheticProfile('Ayu Larasati'), taxId: 'DEMO-NPWP-AYU001' }
    const bank = await extractSupportingEvidenceFromPdf(new File([createSampleBpa1Pdf(createBankStatementText(profile))], 'bank.pdf', { type: 'application/pdf' }))
    const financing = await extractSupportingEvidenceFromPdf(new File([createSampleBpa1Pdf(createFinancingStatementText(profile))], 'financing.pdf', { type: 'application/pdf' }))
    expect(bank).toMatchObject({ kind: 'fixed-deposit', taxpayerId: profile.taxId, amount: 10_000_000 })
    expect(financing).toMatchObject({ kind: 'vehicle-financing', taxpayerId: profile.taxId, amount: 8_000_000 })
  })

  it('rejects non-PDF and oversized files before parsing', () => {
    expect(() => validatePdfFile(new File(['x'], 'fixture.txt', { type: 'text/plain' }))).toThrow(/PDF/i)
    expect(() =>
      validatePdfFile(new File([new Uint8Array(2_000_001)], 'large.pdf', { type: 'application/pdf' })),
    ).toThrow(/2 MB/i)
  })
})
