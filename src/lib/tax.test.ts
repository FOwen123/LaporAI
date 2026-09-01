import {
  DEMO_CREDENTIALS,
  SAMPLE_BPA1_TEXT,
  createBankStatementText,
  createBpa1Text,
  createFinancingStatementText,
  createInitialState,
  createSyntheticProfile,
  filingReducer,
  getFilingStepBlocker,
  getFilingNavigationBlocker,
  getDocumentFindings,
  parseBpa1Text,
  parseSupportingEvidenceText,
  restoreState,
  validateReturn,
  type FilingAction,
} from './tax'

const loggedInState = () => ({ ...createInitialState(), loggedIn: true })

const postedReturn = () => {
  const withDraft = filingReducer(loggedInState(), { type: 'create-draft', year: 2025 })
  return filingReducer(withDraft, { type: 'post-draft' })
}

const reviewableReturn = () => {
  const state = postedReturn()
  return {
    ...state,
    documentName: 'LaporAI-BPA1-SAMPLE.pdf',
    withholding: {
      ...state.withholding,
      employer: 'PT Nusantara Teknologi Fiktif',
      employerId: 'DEMO-EMPLOYER-001',
      period: '01-2025/12-2025',
      grossIncome: 180_000_000,
      deductions: 6_000_000,
      netIncome: 174_000_000,
      taxDue: 13_900_000,
      taxWithheld: 13_900_000,
      reviewed: true,
    },
    assets: state.assets.map((asset) => ({ ...asset, reviewed: true })),
    liabilities: state.liabilities.map((liability) => ({ ...liability, reviewed: true })),
  }
}

describe('synthetic filing state', () => {
  it('blocks the next filing page until the current page is complete', () => {
    const state = postedReturn()
    expect(getFilingStepBlocker(state, 'documents')).toMatch(/BPA1/i)

    state.documentName = 'LaporAI-BPA1-SAMPLE.pdf'
    state.supportingEvidence = [
      parseSupportingEvidenceText(createBankStatementText(state.profile)),
      parseSupportingEvidenceText(createFinancingStatementText(state.profile)),
    ]
    expect(getFilingStepBlocker(state, 'documents')).toBeNull()
    expect(getFilingStepBlocker(state, 'income')).toMatch(/withholding/i)
    expect(getFilingNavigationBlocker(state, 'documents', 'assets')).toMatch(/withholding/i)
    expect(getFilingNavigationBlocker(state, 'assets', 'documents')).toBeNull()
  })

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
    const state = loggedInState()
    const once = filingReducer(state, { type: 'create-draft', year: 2025 })
    const twice = filingReducer(once, { type: 'create-draft', year: 2025 })
    expect(twice.draft).toBe(once.draft)
  })

  it('can post an unposted draft after importing withholding', () => {
    const draft = filingReducer(loggedInState(), { type: 'create-draft', year: 2025 })
    const imported = filingReducer(draft, {
      type: 'import-withholding',
      record: parseBpa1Text(createBpa1Text(draft.profile)),
      actor: 'You',
      documentName: 'LaporAI-BPA1-SAMPLE.pdf',
    })
    expect(imported.status).toBe('editing')
    const posted = filingReducer(imported, { type: 'post-draft' })
    expect(posted.draft?.posted).toBe(true)
  })

  it('generates a BPA1 for the active taxpayer and rejects a different taxpayer', () => {
    const state = { ...loggedInState(), profile: { ...loggedInState().profile, name: 'Ayu Larasati', taxId: 'DEMO-NPWP-AYU001' } }
    const matching = parseBpa1Text(createBpa1Text(state.profile))
    expect(matching.taxpayerName).toBe('Ayu Larasati')
    expect(matching.taxpayerId).toBe('DEMO-NPWP-AYU001')
    expect(filingReducer(state, { type: 'import-withholding', record: matching, actor: 'You', documentName: 'ayu-bpa1.pdf' })).not.toBe(state)

    const other = parseBpa1Text(createBpa1Text({ ...state.profile, name: 'Bima Santoso', taxId: 'DEMO-NPWP-BIMA01' }))
    expect(filingReducer(state, { type: 'import-withholding', record: other, actor: 'You', documentName: 'bima-bpa1.pdf' })).toBe(state)
  })

  it('generates supporting evidence for the active taxpayer and rejects another taxpayer', () => {
    const state = { ...loggedInState(), profile: { ...loggedInState().profile, name: 'Ayu Larasati', taxId: 'DEMO-NPWP-AYU001' } }
    const bank = parseSupportingEvidenceText(createBankStatementText(state.profile))
    const financing = parseSupportingEvidenceText(createFinancingStatementText(state.profile))

    const withBank = filingReducer(state, { type: 'import-supporting-evidence', evidence: bank, actor: 'You', documentName: 'bank.pdf' })
    const withBoth = filingReducer(withBank, { type: 'import-supporting-evidence', evidence: financing, actor: 'You', documentName: 'financing.pdf' })
    expect(withBoth.supportingEvidence).toHaveLength(2)
    expect(withBoth.supportingEvidence.every((record) => record.taxpayerId === state.profile.taxId)).toBe(true)

    const other = parseSupportingEvidenceText(createBankStatementText({ name: 'Bima Santoso', taxId: 'DEMO-NPWP-BIMA01' }))
    expect(filingReducer(withBoth, { type: 'import-supporting-evidence', evidence: other, actor: 'You', documentName: 'other.pdf' })).toBe(withBoth)
  })

  it('finds only document-backed differences in the return', () => {
    const state = postedReturn()
    const bank = parseSupportingEvidenceText(createBankStatementText(state.profile))
    const financing = parseSupportingEvidenceText(createFinancingStatementText(state.profile))
    const withEvidence = { ...state, supportingEvidence: [bank, financing] }

    expect(getDocumentFindings(withEvidence)).toMatchObject([
      { kind: 'asset-add', source: 'LaporAI-BANK-SAMPLE.pdf', payload: { description: 'Fixed deposit', yearEndValue: 10_000_000 } },
      { kind: 'liability', source: 'LaporAI-FINANCING-SAMPLE.pdf', payload: { id: 'liability-vehicle', yearEndBalance: 8_000_000 } },
    ])
  })

  it('invalidates validation when a citizen edits dependent data', () => {
    const state = {
      ...createInitialState(),
      loggedIn: true,
      status: 'validated' as const,
      validatedAt: '2026-08-30T00:00:00.000Z',
    }
    const next = filingReducer(state, { type: 'set-dependents', count: 1, actor: 'You' })
    expect(next.status).toBe('editing')
    expect(next.validatedAt).toBeNull()
    expect(next.activity.at(-1)?.actor).toBe('You')
  })

  it('restores the last editable attachment change', () => {
    const state = { ...loggedInState(), draft: { id: 'DEMO-SPT-2025', year: 2025, model: 'Normal' as const, taxType: 'PPh Orang Pribadi' as const, period: 'January to December' as const, posted: true }, status: 'editing' as const }
    const edited = filingReducer(state, { type: 'update-asset', id: 'asset-savings', yearEndValue: 50_000_000, actor: 'You' })
    const undone = filingReducer(edited, { type: 'undo-last-edit' })
    expect(undone.assets.find((asset) => asset.id === 'asset-savings')?.yearEndValue).toBe(48_500_000)
  })

  it('rejects mutations while logged out or after declaration', () => {
    const actions: FilingAction[] = [
      { type: 'create-draft', year: 2025 },
      { type: 'post-draft' },
      { type: 'import-withholding', record: loggedInState().withholding, actor: 'You', documentName: 'demo.pdf' },
      { type: 'review-withholding', actor: 'You' },
      { type: 'review-asset', id: 'asset-savings', actor: 'You' },
      { type: 'review-liability', id: 'liability-vehicle', actor: 'You' },
      { type: 'set-dependents', count: 1, actor: 'You' },
      { type: 'add-asset', actor: 'You', asset: { id: 'asset-new', category: 'Other', description: 'New', institution: 'Fictional', country: 'Indonesia', acquiredYear: 2025, yearEndValue: 1, reviewed: false } },
      { type: 'update-asset', id: 'asset-savings', yearEndValue: 1, actor: 'You' },
      { type: 'remove-asset', id: 'asset-savings', actor: 'You' },
      { type: 'add-liability', actor: 'You', liability: { id: 'liability-new', description: 'New', creditor: 'Fictional', country: 'Indonesia', incurredYear: 2025, yearEndBalance: 1, reviewed: false } },
      { type: 'update-liability', id: 'liability-vehicle', yearEndBalance: 1, actor: 'You' },
      { type: 'remove-liability', id: 'liability-vehicle', actor: 'You' },
      { type: 'propose', proposal: { id: 'proposal-1', kind: 'asset', description: 'Change asset', payload: { id: 'asset-savings', yearEndValue: 1 } } },
      { type: 'approve-proposal' },
      { type: 'validate' },
      { type: 'open-declaration' },
      { type: 'file-return' },
      { type: 'undo-last-edit' },
    ]
    const loggedOut = createInitialState()
    actions.forEach((action) => expect(filingReducer(loggedOut, action)).toBe(loggedOut))

    for (const status of ['declaration', 'filed'] as const) {
      const terminal = { ...postedReturn(), status }
      actions.forEach((action) => expect(filingReducer(terminal, action)).toBe(terminal))
    }
  })

  it('does not overwrite or apply a proposal after a manual change', () => {
    const first = { id: 'proposal-1', kind: 'asset' as const, description: 'Change asset', payload: { id: 'asset-savings', yearEndValue: 60_000_000 } }
    const second = { id: 'proposal-2', kind: 'asset' as const, description: 'Change asset again', payload: { id: 'asset-savings', yearEndValue: 70_000_000 } }
    const pending = filingReducer(postedReturn(), { type: 'propose', proposal: first })
    const notOverwritten = filingReducer(pending, { type: 'propose', proposal: second })
    expect(notOverwritten.pendingProposal?.id).toBe('proposal-1')

    const manuallyChanged = filingReducer(notOverwritten, { type: 'update-asset', id: 'asset-savings', yearEndValue: 50_000_000, actor: 'You' })
    const approved = filingReducer(manuallyChanged, { type: 'approve-proposal' })
    expect(approved.assets.find((asset) => asset.id === 'asset-savings')?.yearEndValue).toBe(50_000_000)
    expect(approved.pendingProposal).toBeNull()
  })

  it('rejects invalid numeric mutations instead of coercing them', () => {
    const state = postedReturn()
    expect(filingReducer(state, { type: 'set-dependents', count: Number.NaN, actor: 'You' })).toBe(state)
    expect(filingReducer(state, { type: 'set-dependents', count: 1.5, actor: 'You' })).toBe(state)
    expect(filingReducer(state, { type: 'update-asset', id: 'asset-savings', yearEndValue: Number.NaN, actor: 'You' })).toBe(state)
    expect(filingReducer(state, { type: 'update-asset', id: 'asset-savings', yearEndValue: -1, actor: 'You' })).toBe(state)
    expect(filingReducer(state, { type: 'update-liability', id: 'liability-vehicle', yearEndBalance: Number.POSITIVE_INFINITY, actor: 'You' })).toBe(state)
    expect(filingReducer(state, { type: 'add-asset', actor: 'You', asset: { id: 'asset-invalid', category: 'Other', description: 'Invalid', institution: 'Fictional', country: 'Indonesia', acquiredYear: 2025, yearEndValue: Number.NaN, reviewed: false } })).toBe(state)
    expect(filingReducer(state, { type: 'add-liability', actor: 'You', liability: { id: 'liability-invalid', description: 'Invalid', creditor: 'Fictional', country: 'Indonesia', incurredYear: 2025, yearEndBalance: -1, reviewed: false } })).toBe(state)
  })

  it('persists benchmark timestamps and prevents duplicate active runs', () => {
    const started = filingReducer(loggedInState(), { type: 'start-benchmark', mode: 'webmcp' })
    expect(started.benchmarkRuns.at(-1)?.startedAt).toBeGreaterThan(1_000_000_000_000)
    expect(filingReducer(started, { type: 'start-benchmark', mode: 'manual' })).toBe(started)

    const restored = restoreState(JSON.stringify(started))
    const finished = filingReducer(restored, { type: 'finish-benchmark' })
    expect(finished.benchmarkRuns.at(-1)?.finishedAt).toBeGreaterThanOrEqual(started.benchmarkRuns.at(-1)!.startedAt)
  })

  it('updates legacy sample labels when restoring saved state', () => {
    const saved = {
      ...createInitialState(),
      documentName: 'LaporAI-BPA1-FIKTIF.pdf',
      withholding: { ...createInitialState().withholding, employer: 'PT NUSANTARA TEKNOLOGI FIKTIF', source: 'LaporAI-BPA1-FIKTIF.pdf' },
      assets: [{ ...createInitialState().assets[0], institution: 'Bank Nusantara Fiktif' }],
      liabilities: [{ ...createInitialState().liabilities[0], creditor: 'Koperasi Fiktif Bersama' }],
      activity: [
        { id: 'activity-1', at: '2026-01-01T00:00:00.000Z', actor: 'You' as const, description: 'Loaded fictional records into the draft' },
        { id: 'activity-2', at: '2026-01-01T00:00:01.000Z', actor: 'You' as const, description: 'Imported a fictional BPA1 withholding record', previous: 'None', next: 'LaporAI-BPA1-FIKTIF.pdf' },
        { id: 'activity-3', at: '2026-01-01T00:00:02.000Z', actor: 'You' as const, description: 'Posted fictional records into the draft' },
        { id: 'activity-4', at: '2026-01-01T00:00:03.000Z', actor: 'You' as const, description: 'Completed simulated signing and filing' },
      ],
    }

    const restored = restoreState(JSON.stringify(saved))
    expect(restored.documentName).toBe('LaporAI-BPA1-SAMPLE.pdf')
    expect(restored.withholding.employer).toBe('PT NUSANTARA TEKNOLOGI')
    expect(restored.withholding.source).toBe('LaporAI-BPA1-SAMPLE.pdf')
    expect(restored.assets[0].institution).toBe('Bank Nusantara')
    expect(restored.liabilities[0].creditor).toBe('Koperasi Bersama')
    expect(restored.activity.map((item) => item.description)).toEqual([
      'Loaded prefilled records into the draft',
      'Imported a BPA1 withholding record',
      'Loaded prefilled records into the draft',
      'Completed signing and filing',
    ])
    expect(restored.activity[1].next).toBe('LaporAI-BPA1-SAMPLE.pdf')
  })
})

describe('BPA1 parsing', () => {
  it('extracts the supported text format', () => {
    const parsed = parseBpa1Text(`
      LAPORAI BPA1 SAMPLE
      TAXPAYER_NAME: Ayu Larasati
      TAXPAYER_ID: DEMO-NPWP-SAMPLE
      EMPLOYER: PT NUSANTARA TEKNOLOGI
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

  it('rejects malformed numeric amounts instead of stripping non-numeric text', () => {
    expect(() => parseBpa1Text(SAMPLE_BPA1_TEXT.replace('GROSS_INCOME: 180000000', 'GROSS_INCOME: 180oops'))).toThrow(/GROSS_INCOME/i)
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

  it('blocks unsupported underpayment and overpayment results', () => {
    const state = reviewableReturn()
    const underpaid = { ...state, withholding: { ...state.withholding, taxWithheld: 13_000_000 } }
    const overpaid = { ...state, withholding: { ...state.withholding, taxWithheld: 14_000_000 } }
    expect(validateReturn(underpaid).errors).toContainEqual(expect.objectContaining({ field: 'taxBalance' }))
    expect(validateReturn(overpaid).errors).toContainEqual(expect.objectContaining({ field: 'taxBalance' }))
    expect(filingReducer({ ...overpaid, status: 'declaration' as const }, { type: 'file-return' })).toEqual({ ...overpaid, status: 'declaration' as const })
  })
})
