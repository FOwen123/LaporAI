import {
  DEMO_CREDENTIALS,
  createInitialState,
  createSyntheticProfile,
  filingReducer,
  parseBpa1Text,
  validateReturn,
} from './tax'

describe('synthetic filing state', () => {
  it('creates identifiers that cannot be mistaken for NIK or NPWP', () => {
    const profile = createSyntheticProfile('Ayu Larasati')
    expect(profile.taxId).toMatch(/^DEMO-NPWP-/)
    expect(profile.email).toMatch(/\.example$/)
    expect(profile.taxId).not.toMatch(/^\d{16}$/)
  })

  it('uses public demo credentials without storing a real account', () => {
    expect(DEMO_CREDENTIALS).toEqual({
      username: 'demo@laporai.example',
      password: 'LaporAI2026!',
    })
  })

  it('does not create duplicate drafts for one tax year', () => {
    const state = createInitialState()
    const once = filingReducer(state, { type: 'create-draft', year: 2025 })
    const twice = filingReducer(once, { type: 'create-draft', year: 2025 })
    expect(twice.draft).toBe(once.draft)
  })

  it('invalidates validation when a citizen edits dependent data', () => {
    const state = {
      ...createInitialState(),
      status: 'validated' as const,
      validatedAt: '2026-08-30T00:00:00.000Z',
    }
    const next = filingReducer(state, { type: 'set-dependents', count: 1, actor: 'You' })
    expect(next.status).toBe('editing')
    expect(next.validatedAt).toBeNull()
    expect(next.activity.at(-1)?.actor).toBe('You')
  })

  it('restores the last editable attachment change', () => {
    const state = { ...createInitialState(), draft: { id: 'DEMO-SPT-2025', year: 2025, model: 'Normal' as const, taxType: 'PPh Orang Pribadi' as const, period: 'January to December' as const, posted: true } }
    const edited = filingReducer(state, { type: 'update-asset', id: 'asset-savings', yearEndValue: 50_000_000, actor: 'You' })
    const undone = filingReducer(edited, { type: 'undo-last-edit' })
    expect(undone.assets.find((asset) => asset.id === 'asset-savings')?.yearEndValue).toBe(48_500_000)
  })
})

describe('BPA1 parsing', () => {
  it('extracts the supported fictional text format', () => {
    const parsed = parseBpa1Text(`
      LAPORAI BPA1 FIKTIF
      EMPLOYER: PT NUSANTARA TEKNOLOGI FIKTIF
      EMPLOYER_ID: DEMO-EMPLOYER-001
      PERIOD: 01-2025/12-2025
      GROSS_INCOME: 180000000
      DEDUCTIONS: 6000000
      NET_INCOME: 174000000
      TAX_DUE: 13900000
      TAX_WITHHELD: 13900000
    `)
    expect(parsed.netIncome).toBe(174_000_000)
    expect(parsed.taxWithheld).toBe(13_900_000)
  })

  it('rejects content that looks like a real government identifier', () => {
    expect(() => parseBpa1Text('NIK: 3174010101010001')).toThrow(/real NIK or NPWP/i)
  })
})

describe('return validation', () => {
  it('blocks a withholding credit without matching income', () => {
    const state = {
      ...createInitialState(),
      withholding: { ...createInitialState().withholding, taxWithheld: 5_000_000, netIncome: 0 },
    }
    expect(validateReturn(state).errors).toContainEqual(
      expect.objectContaining({ field: 'withholding.netIncome' }),
    )
  })

  it('warns when dependent count differs from the withholding record', () => {
    const state = { ...createInitialState(), dependents: 1 }
    expect(validateReturn(state).warnings).toContainEqual(
      expect.objectContaining({ field: 'dependents' }),
    )
  })
})
