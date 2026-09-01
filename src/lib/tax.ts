export const DEMO_CREDENTIALS = {
  username: 'demo@laporai.example',
  password: 'LaporAI2026!',
} as const

export type Actor = 'You' | 'Agent'
export type FilingStatus = 'ready' | 'editing' | 'validated' | 'declaration' | 'filed'
export type FilingView = 'home' | 'documents' | 'return' | 'review' | 'receipt' | 'benchmark'
export const FILING_STEPS = ['documents', 'income', 'assets', 'liabilities', 'family', 'review', 'declaration'] as const
export type FilingStep = typeof FILING_STEPS[number]

export interface TaxpayerProfile {
  name: string
  taxId: string
  email: string
  maritalStatus: 'Single' | 'Married'
}

export function createBpa1Text(profile: Pick<TaxpayerProfile, 'name' | 'taxId'>): string {
  return `LAPORAI BPA1 SAMPLE
TAXPAYER_NAME: ${profile.name}
TAXPAYER_ID: ${profile.taxId}
EMPLOYER: PT NUSANTARA TEKNOLOGI
EMPLOYER_ID: DEMO-EMPLOYER-001
PERIOD: 01-2025/12-2025
GROSS_INCOME: 180000000
DEDUCTIONS: 6000000
NET_INCOME: 174000000
TAX_DUE: 13900000
TAX_WITHHELD: 13900000`
}

export function createBankStatementText(profile: Pick<TaxpayerProfile, 'name' | 'taxId'>): string {
  return `LAPORAI SUPPORTING DOCUMENT SAMPLE
DOCUMENT_TYPE: FIXED_DEPOSIT
TAXPAYER_NAME: ${profile.name}
TAXPAYER_ID: ${profile.taxId}
INSTITUTION: Bank Nusantara
ACCOUNT_LAST_FOUR: 4821
AS_OF: 2025-12-31
YEAR_END_AMOUNT: 10000000`
}

export function createFinancingStatementText(profile: Pick<TaxpayerProfile, 'name' | 'taxId'>): string {
  return `LAPORAI SUPPORTING DOCUMENT SAMPLE
DOCUMENT_TYPE: VEHICLE_FINANCING
TAXPAYER_NAME: ${profile.name}
TAXPAYER_ID: ${profile.taxId}
INSTITUTION: Koperasi Bersama
REFERENCE: DEMO-FINANCE-2023
AS_OF: 2025-12-31
YEAR_END_AMOUNT: 8000000`
}

export function bpa1MatchesProfile(record: Pick<WithholdingRecord, 'taxpayerName' | 'taxpayerId'>, profile: Pick<TaxpayerProfile, 'name' | 'taxId'>): boolean {
  return record.taxpayerName === profile.name && record.taxpayerId === profile.taxId
}

export const SAMPLE_BPA1_TEXT = createBpa1Text({ name: 'Ayu Larasati', taxId: 'DEMO-NPWP-SAMPLE' })

export interface WithholdingRecord {
  taxpayerName: string
  taxpayerId: string
  employer: string
  employerId: string
  period: string
  grossIncome: number
  deductions: number
  netIncome: number
  taxDue: number
  taxWithheld: number
  reviewed: boolean
  source: string
}

export interface Asset {
  id: string
  category: string
  description: string
  institution: string
  country: string
  acquiredYear: number
  yearEndValue: number
  reviewed: boolean
}

export interface Liability {
  id: string
  description: string
  creditor: string
  country: string
  incurredYear: number
  yearEndBalance: number
  reviewed: boolean
}

export interface SupportingEvidence {
  kind: 'fixed-deposit' | 'vehicle-financing'
  taxpayerName: string
  taxpayerId: string
  institution: string
  reference: string
  asOf: '2025-12-31'
  amount: number
  source: string
}

export interface Draft {
  id: string
  year: number
  model: 'Normal'
  taxType: 'PPh Orang Pribadi'
  period: 'January to December'
  posted: boolean
}

export interface Activity {
  id: string
  at: string
  actor: Actor
  description: string
  previous?: string
  next?: string
}

export interface Proposal {
  id: string
  kind: 'asset' | 'asset-add' | 'asset-remove' | 'liability' | 'liability-add' | 'liability-remove' | 'dependents' | 'withholding'
  description: string
  payload: Record<string, unknown>
  baseFingerprint?: string
}

export interface BenchmarkRun {
  id: string
  mode: 'manual' | 'browser-agent' | 'webmcp'
  startedAt: number
  finishedAt: number | null
  actions: number
  errors: number
  toolCalls: number
}

export interface FilingState {
  fixtureVersion: 1
  loggedIn: boolean
  profile: TaxpayerProfile
  status: FilingStatus
  view: FilingView
  draft: Draft | null
  documentName: string | null
  supportingEvidence: SupportingEvidence[]
  withholding: WithholdingRecord
  assets: Asset[]
  liabilities: Liability[]
  dependents: number
  withholdingDependents: number
  activity: Activity[]
  pendingProposal: Proposal | null
  validatedAt: string | null
  receiptId: string | null
  benchmarkRuns: BenchmarkRun[]
  lastEdit: { assets: Asset[]; liabilities: Liability[]; dependents: number } | null
}

export interface ValidationIssue {
  field: string
  message: string
}

export interface ValidationResult {
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  taxBalance: number
}

export type FilingAction =
  | { type: 'login'; profile?: TaxpayerProfile }
  | { type: 'logout' }
  | { type: 'navigate'; view: FilingView }
  | { type: 'create-draft'; year: number }
  | { type: 'post-draft' }
  | { type: 'import-withholding'; record: WithholdingRecord; actor: Actor; documentName: string }
  | { type: 'import-supporting-evidence'; evidence: SupportingEvidence; actor: Actor; documentName: string }
  | { type: 'review-withholding'; actor: Actor }
  | { type: 'review-asset'; id: string; actor: Actor }
  | { type: 'review-liability'; id: string; actor: Actor }
  | { type: 'set-dependents'; count: number; actor: Actor }
  | { type: 'add-asset'; asset: Asset; actor: Actor }
  | { type: 'update-asset'; id: string; yearEndValue: number; reviewed?: boolean; actor: Actor }
  | { type: 'remove-asset'; id: string; actor: Actor }
  | { type: 'add-liability'; liability: Liability; actor: Actor }
  | { type: 'update-liability'; id: string; yearEndBalance: number; reviewed?: boolean; actor: Actor }
  | { type: 'remove-liability'; id: string; actor: Actor }
  | { type: 'propose'; proposal: Proposal }
  | { type: 'reject-proposal' }
  | { type: 'approve-proposal' }
  | { type: 'validate' }
  | { type: 'open-declaration' }
  | { type: 'file-return' }
  | { type: 'start-benchmark'; mode: BenchmarkRun['mode'] }
  | { type: 'count-action'; tool?: boolean; error?: boolean }
  | { type: 'finish-benchmark' }
  | { type: 'undo-last-edit' }
  | { type: 'reset' }

const emptyWithholding: WithholdingRecord = {
  taxpayerName: '',
  taxpayerId: '',
  employer: '',
  employerId: '',
  period: '',
  grossIncome: 0,
  deductions: 0,
  netIncome: 0,
  taxDue: 0,
  taxWithheld: 0,
  reviewed: false,
  source: 'No document imported',
}

const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const employeeDraft = (): Draft => ({ id: 'DEMO-SPT-2025', year: 2025, model: 'Normal', taxType: 'PPh Orang Pribadi', period: 'January to December', posted: true })

export function createSyntheticProfile(name = 'Ayu Larasati'): TaxpayerProfile {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') || 'taxpayer'
  return {
    name,
    taxId: `DEMO-NPWP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    email: `${slug}@laporai.example`,
    maritalStatus: 'Single',
  }
}

export function createInitialState(): FilingState {
  return {
    fixtureVersion: 1,
    loggedIn: false,
    profile: createSyntheticProfile(),
    status: 'ready',
    view: 'home',
    draft: null,
    documentName: null,
    supportingEvidence: [],
    withholding: { ...emptyWithholding },
    assets: [
      {
        id: 'asset-savings',
        category: 'Cash and cash equivalents',
        description: 'Savings account',
        institution: 'Bank Nusantara',
        country: 'Indonesia',
        acquiredYear: 2022,
        yearEndValue: 48_500_000,
        reviewed: false,
      },
      {
        id: 'asset-motorcycle',
        category: 'Movable property',
        description: 'Motorcycle',
        institution: 'Personal ownership',
        country: 'Indonesia',
        acquiredYear: 2023,
        yearEndValue: 24_000_000,
        reviewed: true,
      },
    ],
    liabilities: [
      {
        id: 'liability-vehicle',
        description: 'Vehicle financing',
        creditor: 'Koperasi Bersama',
        country: 'Indonesia',
        incurredYear: 2023,
        yearEndBalance: 12_000_000,
        reviewed: false,
      },
    ],
    dependents: 0,
    withholdingDependents: 0,
    activity: [],
    pendingProposal: null,
    validatedAt: null,
    receiptId: null,
    benchmarkRuns: [],
    lastEdit: null,
  }
}

export function restoreState(raw: string | null): FilingState {
  const initial = createInitialState()
  if (!raw) return initial
  try {
    const saved = JSON.parse(raw) as Partial<FilingState>
    const restoredView = saved.view ?? (saved.status === 'declaration' ? 'review' : saved.status === 'filed' ? 'receipt' : initial.view)
    const migratedDraft = saved.loggedIn && !saved.draft ? employeeDraft() : saved.draft ?? initial.draft
    const withholding = { ...initial.withholding, ...saved.withholding }
    if (withholding.employer === 'PT NUSANTARA TEKNOLOGI FIKTIF') withholding.employer = 'PT NUSANTARA TEKNOLOGI'
    if (withholding.source === 'LaporAI-BPA1-FIKTIF.pdf') withholding.source = 'LaporAI-BPA1-SAMPLE.pdf'
    const assets = Array.isArray(saved.assets) ? saved.assets.map((asset) => asset.institution === 'Bank Nusantara Fiktif' ? { ...asset, institution: 'Bank Nusantara' } : asset) : initial.assets
    const liabilities = Array.isArray(saved.liabilities) ? saved.liabilities.map((liability) => liability.creditor === 'Koperasi Fiktif Bersama' ? { ...liability, creditor: 'Koperasi Bersama' } : liability) : initial.liabilities
    const legacyActivityLabels: Record<string, string> = {
      'Loaded fictional records into the draft': 'Loaded prefilled records into the draft',
      'Posted fictional records into the draft': 'Loaded prefilled records into the draft',
      'Imported a fictional BPA1 withholding record': 'Imported a BPA1 withholding record',
      'Completed simulated signing and filing': 'Completed signing and filing',
      'LaporAI-BPA1-FIKTIF.pdf': 'LaporAI-BPA1-SAMPLE.pdf',
    }
    const restoredActivity = Array.isArray(saved.activity) ? saved.activity.map((item) => ({
      ...item,
      description: legacyActivityLabels[item.description] ?? item.description,
      previous: item.previous ? legacyActivityLabels[item.previous] ?? item.previous : item.previous,
      next: item.next ? legacyActivityLabels[item.next] ?? item.next : item.next,
    })) : initial.activity
    return {
      ...initial,
      ...saved,
      draft: migratedDraft,
      status: saved.status ?? (saved.loggedIn && !saved.draft ? 'editing' : initial.status),
      view: restoredView,
      documentName: saved.documentName === 'LaporAI-BPA1-FIKTIF.pdf' ? 'LaporAI-BPA1-SAMPLE.pdf' : saved.documentName ?? initial.documentName,
      supportingEvidence: Array.isArray(saved.supportingEvidence) ? saved.supportingEvidence : initial.supportingEvidence,
      profile: { ...initial.profile, ...saved.profile },
      withholding,
      assets,
      liabilities,
      activity: restoredActivity,
      // ponytail: starts below 1e12 identify legacy relative timers; version the format if another clock is added.
      benchmarkRuns: Array.isArray(saved.benchmarkRuns)
        ? saved.benchmarkRuns.filter((run) => run.finishedAt !== null || run.startedAt >= 1_000_000_000_000)
        : initial.benchmarkRuns,
    }
  } catch {
    return initial
  }
}

const activity = (actor: Actor, description: string, previous?: string, next?: string): Activity => ({
  id: id('activity'),
  at: new Date().toISOString(),
  actor,
  description,
  previous,
  next,
})

const edited = (state: FilingState): FilingState => ({
  ...state,
  status: state.status === 'filed' ? 'filed' : 'editing',
  pendingProposal: null,
  validatedAt: null,
})

const snapshot = (state: FilingState) => ({
  assets: state.assets,
  liabilities: state.liabilities,
  dependents: state.dependents,
})

const isEditable = (state: FilingState) => state.loggedIn && state.status !== 'declaration' && state.status !== 'filed'
const isValidAmount = (value: number) => Number.isFinite(value) && value >= 0
const proposalFingerprint = (state: FilingState) => JSON.stringify({
  loggedIn: state.loggedIn,
  status: state.status,
  draft: state.draft,
  documentName: state.documentName,
  supportingEvidence: state.supportingEvidence,
  withholding: state.withholding,
  assets: state.assets,
  liabilities: state.liabilities,
  dependents: state.dependents,
  withholdingDependents: state.withholdingDependents,
})

function applyProposal(state: FilingState, proposal: Proposal): FilingState {
  const actor: Actor = 'Agent'
  if (proposal.kind === 'dependents') {
    const count = Number(proposal.payload.count)
    if (!Number.isInteger(count) || count < 0 || count > 3) return { ...state, pendingProposal: null }
    return filingReducer({ ...state, pendingProposal: null }, { type: 'set-dependents', count, actor })
  }
  if (proposal.kind === 'asset') {
    const assetId = String(proposal.payload.id ?? '')
    const yearEndValue = Number(proposal.payload.yearEndValue)
    if (!assetId || !Number.isFinite(yearEndValue) || yearEndValue < 0) return { ...state, pendingProposal: null }
    return filingReducer(
      { ...state, pendingProposal: null },
      { type: 'update-asset', id: assetId, yearEndValue, reviewed: true, actor },
    )
  }
  if (proposal.kind === 'asset-add') {
    const value = Number(proposal.payload.yearEndValue)
    if (!Number.isFinite(value) || value < 0) return { ...state, pendingProposal: null }
    return filingReducer({ ...state, pendingProposal: null }, { type: 'add-asset', actor, asset: {
      id: id('asset'), category: String(proposal.payload.category ?? 'Other asset'),
      description: String(proposal.payload.description ?? 'Asset'),
      institution: String(proposal.payload.institution ?? 'Personal ownership'), country: 'Indonesia',
      acquiredYear: 2025, yearEndValue: value, reviewed: true,
    } })
  }
  if (proposal.kind === 'asset-remove') {
    const assetId = String(proposal.payload.id ?? '')
    return state.assets.some((item) => item.id === assetId)
      ? filingReducer({ ...state, pendingProposal: null }, { type: 'remove-asset', id: assetId, actor })
      : { ...state, pendingProposal: null }
  }
  if (proposal.kind === 'liability') {
    const liabilityId = String(proposal.payload.id ?? '')
    const yearEndBalance = Number(proposal.payload.yearEndBalance)
    if (!liabilityId || !Number.isFinite(yearEndBalance) || yearEndBalance < 0) {
      return { ...state, pendingProposal: null }
    }
    return filingReducer(
      { ...state, pendingProposal: null },
      { type: 'update-liability', id: liabilityId, yearEndBalance, reviewed: true, actor },
    )
  }
  if (proposal.kind === 'liability-add') {
    const balance = Number(proposal.payload.yearEndBalance)
    if (!Number.isFinite(balance) || balance < 0) return { ...state, pendingProposal: null }
    return filingReducer({ ...state, pendingProposal: null }, { type: 'add-liability', actor, liability: {
      id: id('liability'), description: String(proposal.payload.description ?? 'Liability'),
      creditor: String(proposal.payload.creditor ?? 'Not specified'), country: 'Indonesia',
      incurredYear: 2025, yearEndBalance: balance, reviewed: true,
    } })
  }
  if (proposal.kind === 'liability-remove') {
    const liabilityId = String(proposal.payload.id ?? '')
    return state.liabilities.some((item) => item.id === liabilityId)
      ? filingReducer({ ...state, pendingProposal: null }, { type: 'remove-liability', id: liabilityId, actor })
      : { ...state, pendingProposal: null }
  }
  if (proposal.kind === 'withholding') {
    return filingReducer({ ...state, pendingProposal: null }, { type: 'review-withholding', actor })
  }
  return { ...state, pendingProposal: null }
}

export function filingReducer(state: FilingState, action: FilingAction): FilingState {
  switch (action.type) {
    case 'login':
      return { ...state, loggedIn: true, profile: action.profile ?? state.profile, draft: state.draft ?? employeeDraft(), status: state.draft ? state.status : 'editing', view: 'home' }
    case 'logout':
      return { ...state, loggedIn: false, view: 'home', pendingProposal: null }
    case 'navigate':
      return state.loggedIn ? { ...state, view: action.view } : state
    case 'create-draft':
      if (!state.loggedIn || state.status === 'declaration' || state.status === 'filed') return state
      if (state.draft?.year === action.year) return state
      return {
        ...state,
        draft: {
          id: `DEMO-SPT-${action.year}`,
          year: action.year,
          model: 'Normal',
          taxType: 'PPh Orang Pribadi',
          period: 'January to December',
          posted: false,
        },
        status: 'ready',
        view: 'return',
        pendingProposal: null,
        activity: [...state.activity, activity('You', `Created a normal ${action.year} annual return draft`)],
      }
    case 'post-draft':
      if (!isEditable(state) || !state.draft || state.draft.posted) return state
      return {
        ...state,
        draft: { ...state.draft, posted: true },
        status: 'editing',
        pendingProposal: null,
        activity: [...state.activity, activity('You', 'Loaded prefilled records into the draft')],
      }
    case 'import-withholding':
      if (!isEditable(state) || !bpa1MatchesProfile(action.record, state.profile) || ![action.record.grossIncome, action.record.deductions, action.record.netIncome, action.record.taxDue, action.record.taxWithheld].every(isValidAmount)) return state
      return edited({
        ...state,
        withholding: { ...action.record, reviewed: false, source: action.documentName },
        documentName: action.documentName,
        activity: [
          ...state.activity,
          activity(action.actor, 'Imported a BPA1 withholding record', state.documentName ?? 'None', action.documentName),
        ],
      })
    case 'import-supporting-evidence':
      if (!isEditable(state) || !supportingEvidenceMatchesProfile(action.evidence, state.profile) || !isValidAmount(action.evidence.amount)) return state
      return edited({
        ...state,
        supportingEvidence: [
          ...state.supportingEvidence.filter((record) => record.kind !== action.evidence.kind),
          { ...action.evidence, source: action.documentName },
        ],
        activity: [...state.activity, activity(action.actor, 'Imported a supporting document', undefined, action.documentName)],
      })
    case 'review-withholding':
      if (!isEditable(state) || !state.documentName) return state
      return edited({
        ...state,
        withholding: { ...state.withholding, reviewed: true },
        activity: [...state.activity, activity(action.actor, 'Confirmed the BPA1 withholding record')],
      })
    case 'review-asset':
      if (!isEditable(state) || !state.assets.some((asset) => asset.id === action.id)) return state
      return edited({
        ...state,
        lastEdit: snapshot(state),
        assets: state.assets.map((asset) => (asset.id === action.id ? { ...asset, reviewed: true } : asset)),
        activity: [...state.activity, activity(action.actor, 'Confirmed an asset record', action.id, 'Reviewed')],
      })
    case 'review-liability':
      if (!isEditable(state) || !state.liabilities.some((item) => item.id === action.id)) return state
      return edited({
        ...state,
        lastEdit: snapshot(state),
        liabilities: state.liabilities.map((item) => (item.id === action.id ? { ...item, reviewed: true } : item)),
        activity: [...state.activity, activity(action.actor, 'Confirmed a liability record', action.id, 'Reviewed')],
      })
    case 'set-dependents': {
      if (!isEditable(state) || !Number.isInteger(action.count) || action.count < 0 || action.count > 3) return state
      const next = action.count
      return edited({
        ...state,
        lastEdit: snapshot(state),
        dependents: next,
        activity: [
          ...state.activity,
          activity(action.actor, 'Changed dependent count', String(state.dependents), String(next)),
        ],
      })
    }
    case 'add-asset':
      if (!isEditable(state) || !isValidAmount(action.asset.yearEndValue)) return state
      return edited({
        ...state,
        lastEdit: snapshot(state),
        assets: [...state.assets, action.asset],
        activity: [...state.activity, activity(action.actor, `Added asset: ${action.asset.description}`)],
      })
    case 'update-asset':
      {
      if (!isEditable(state) || !state.assets.some((asset) => asset.id === action.id) || !isValidAmount(action.yearEndValue)) return state
      const previous = state.assets.find((asset) => asset.id === action.id)?.yearEndValue
      return edited({
        ...state,
        lastEdit: snapshot(state),
        assets: state.assets.map((asset) =>
          asset.id === action.id
            ? { ...asset, yearEndValue: action.yearEndValue, reviewed: action.reviewed ?? asset.reviewed }
            : asset,
        ),
        activity: [
          ...state.activity,
          activity(action.actor, 'Updated an asset year-end value', previous === undefined ? 'Unknown' : rupiah(previous), rupiah(action.yearEndValue)),
        ],
      })
      }
    case 'remove-asset': {
      if (!isEditable(state)) return state
      const removed = state.assets.find((asset) => asset.id === action.id)
      if (!removed) return state
      return edited({
        ...state,
        lastEdit: snapshot(state),
        assets: state.assets.filter((asset) => asset.id !== action.id),
        activity: [...state.activity, activity(action.actor, `Removed asset: ${removed?.description ?? action.id}`)],
      })
    }
    case 'update-liability':
      {
      if (!isEditable(state) || !state.liabilities.some((item) => item.id === action.id) || !isValidAmount(action.yearEndBalance)) return state
      const previous = state.liabilities.find((item) => item.id === action.id)?.yearEndBalance
      return edited({
        ...state,
        lastEdit: snapshot(state),
        liabilities: state.liabilities.map((item) =>
          item.id === action.id
            ? { ...item, yearEndBalance: action.yearEndBalance, reviewed: action.reviewed ?? item.reviewed }
            : item,
        ),
        activity: [
          ...state.activity,
          activity(action.actor, 'Updated a liability year-end balance', previous === undefined ? 'Unknown' : rupiah(previous), rupiah(action.yearEndBalance)),
        ],
      })
      }
    case 'add-liability':
      if (!isEditable(state) || !isValidAmount(action.liability.yearEndBalance)) return state
      return edited({
        ...state,
        lastEdit: snapshot(state),
        liabilities: [...state.liabilities, action.liability],
        activity: [...state.activity, activity(action.actor, `Added liability: ${action.liability.description}`)],
      })
    case 'remove-liability': {
      if (!isEditable(state)) return state
      const removed = state.liabilities.find((item) => item.id === action.id)
      if (!removed) return state
      return edited({
        ...state,
        lastEdit: snapshot(state),
        liabilities: state.liabilities.filter((item) => item.id !== action.id),
        activity: [...state.activity, activity(action.actor, `Removed liability: ${removed?.description ?? action.id}`)],
      })
    }
    case 'propose':
      if (!isEditable(state) || state.pendingProposal) return state
      return { ...state, pendingProposal: { ...action.proposal, baseFingerprint: proposalFingerprint(state) } }
    case 'reject-proposal':
      if (!isEditable(state) || !state.pendingProposal) return state
      return {
        ...state,
        pendingProposal: null,
        activity: [...state.activity, activity('You', 'Rejected an agent proposal')],
      }
    case 'approve-proposal':
      if (!isEditable(state) || !state.pendingProposal) return state
      if (state.pendingProposal.baseFingerprint && state.pendingProposal.baseFingerprint !== proposalFingerprint(state)) {
        return { ...state, pendingProposal: null }
      }
      return applyProposal(state, state.pendingProposal)
    case 'validate': {
      if (!isEditable(state)) return state
      const result = validateReturn(state)
      if (result.errors.length) return { ...state, status: 'editing', validatedAt: null }
      return { ...state, status: 'validated', validatedAt: new Date().toISOString(), view: 'review', pendingProposal: null }
    }
    case 'open-declaration':
      return state.loggedIn && state.status === 'validated' && !validateReturn(state).errors.length
        ? { ...state, status: 'declaration', view: 'review', pendingProposal: null }
        : state
    case 'file-return':
      if (!state.loggedIn || state.status !== 'declaration' || validateReturn(state).errors.length) return state
      return {
        ...state,
        status: 'filed',
        view: 'receipt',
        pendingProposal: null,
        receiptId: `DEMO-BPE-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        activity: [...state.activity, activity('You', 'Completed signing and filing')],
      }
    case 'start-benchmark':
      if (state.benchmarkRuns.some((run) => run.finishedAt === null)) return state
      return {
        ...state,
        benchmarkRuns: [
          ...state.benchmarkRuns,
          {
            id: id('run'),
            mode: action.mode,
            startedAt: Date.now(),
            finishedAt: null,
            actions: 0,
            errors: 0,
            toolCalls: 0,
          },
        ],
      }
    case 'count-action':
      return {
        ...state,
        benchmarkRuns: state.benchmarkRuns.map((run, index, all) =>
          index === all.length - 1 && run.finishedAt === null
            ? {
                ...run,
                actions: run.actions + 1,
                errors: run.errors + (action.error ? 1 : 0),
                toolCalls: run.toolCalls + (action.tool ? 1 : 0),
              }
            : run,
        ),
      }
    case 'finish-benchmark':
      return {
        ...state,
        benchmarkRuns: state.benchmarkRuns.map((run, index, all) =>
          index === all.length - 1 && run.finishedAt === null ? { ...run, finishedAt: Date.now() } : run,
        ),
      }
    case 'undo-last-edit':
      if (!isEditable(state) || !state.lastEdit) return state
      return edited({
        ...state,
        ...state.lastEdit,
        lastEdit: null,
        activity: [...state.activity, activity('You', 'Undid the last editable attachment change')],
      })
    case 'reset':
      return createInitialState()
  }
}

export function parseBpa1Text(text: string): WithholdingRecord {
  if (/\b\d{16}\b/.test(text)) throw new Error('This file may contain a real NIK or NPWP. Use the supplied sample only.')
  if (!text.includes('LAPORAI BPA1 SAMPLE')) throw new Error('This PDF is not a supported LaporAI BPA1.')

  const value = (key: string) => {
    const match = text.match(new RegExp(`${key}:\\s*([^\\n\\r]+)`, 'i'))
    if (!match) throw new Error(`The BPA1 is missing ${key}.`)
    return match[1].trim()
  }
  const amount = (key: string) => {
    const raw = value(key)
    if (!/^\d+(?:\.\d+)?$/.test(raw)) throw new Error(`${key} must be a non-negative amount.`)
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${key} must be a non-negative amount.`)
    return parsed
  }

  const taxpayerId = value('TAXPAYER_ID')
  if (!/^DEMO-NPWP-[A-Z0-9]+$/i.test(taxpayerId)) throw new Error('The BPA1 taxpayer ID must be a synthetic DEMO-NPWP identifier.')

  return {
    taxpayerName: value('TAXPAYER_NAME'),
    taxpayerId,
    employer: value('EMPLOYER'),
    employerId: value('EMPLOYER_ID'),
    period: value('PERIOD'),
    grossIncome: amount('GROSS_INCOME'),
    deductions: amount('DEDUCTIONS'),
    netIncome: amount('NET_INCOME'),
    taxDue: amount('TAX_DUE'),
    taxWithheld: amount('TAX_WITHHELD'),
    reviewed: false,
    source: 'BPA1',
  }
}

export function parseSupportingEvidenceText(text: string): SupportingEvidence {
  if (/\b\d{16}\b/.test(text)) throw new Error('This file may contain a real NIK or NPWP. Use the supplied sample only.')
  if (!text.includes('LAPORAI SUPPORTING DOCUMENT SAMPLE')) throw new Error('This PDF is not a supported LaporAI supporting document.')
  const value = (key: string) => {
    const match = text.match(new RegExp(`${key}:\\s*([^\\n\\r]+)`, 'i'))
    if (!match) throw new Error(`The supporting document is missing ${key}.`)
    return match[1].trim()
  }
  const taxpayerId = value('TAXPAYER_ID')
  if (!/^DEMO-NPWP-[A-Z0-9]+$/i.test(taxpayerId)) throw new Error('The taxpayer ID must be a synthetic DEMO-NPWP identifier.')
  const rawAmount = value('YEAR_END_AMOUNT')
  if (!/^\d+(?:\.\d+)?$/.test(rawAmount) || !isValidAmount(Number(rawAmount))) throw new Error('YEAR_END_AMOUNT must be a non-negative amount.')
  const documentType = value('DOCUMENT_TYPE')
  if (documentType !== 'FIXED_DEPOSIT' && documentType !== 'VEHICLE_FINANCING') throw new Error('The supporting document type is not supported.')
  if (value('AS_OF') !== '2025-12-31') throw new Error('The supporting document must report a balance at 31 December 2025.')
  const kind = documentType === 'FIXED_DEPOSIT' ? 'fixed-deposit' : 'vehicle-financing'
  return {
    kind,
    taxpayerName: value('TAXPAYER_NAME'),
    taxpayerId,
    institution: value('INSTITUTION'),
    reference: value(kind === 'fixed-deposit' ? 'ACCOUNT_LAST_FOUR' : 'REFERENCE'),
    asOf: '2025-12-31',
    amount: Number(rawAmount),
    source: kind === 'fixed-deposit' ? 'LaporAI-BANK-SAMPLE.pdf' : 'LaporAI-FINANCING-SAMPLE.pdf',
  }
}

export function supportingEvidenceMatchesProfile(evidence: Pick<SupportingEvidence, 'taxpayerName' | 'taxpayerId'>, profile: Pick<TaxpayerProfile, 'name' | 'taxId'>): boolean {
  return evidence.taxpayerName === profile.name && evidence.taxpayerId === profile.taxId
}

export interface DocumentFinding {
  kind: Proposal['kind']
  description: string
  payload: Record<string, unknown>
  source: string
}

export function getDocumentFindings(state: FilingState): DocumentFinding[] {
  const findings: DocumentFinding[] = []
  for (const evidence of state.supportingEvidence) {
    if (evidence.kind === 'fixed-deposit') {
      const existing = state.assets.find((asset) => asset.description === 'Fixed deposit' && asset.institution === evidence.institution)
      if (!existing) findings.push({
        kind: 'asset-add',
        description: `${evidence.source} shows a fixed deposit of ${rupiah(evidence.amount)} that is missing from Assets.`,
        payload: { category: 'Cash and cash equivalents', description: 'Fixed deposit', institution: evidence.institution, yearEndValue: evidence.amount },
        source: evidence.source,
      })
      else if (existing.yearEndValue !== evidence.amount) findings.push({
        kind: 'asset',
        description: `${evidence.source} shows ${existing.description} at ${rupiah(evidence.amount)}.`,
        payload: { id: existing.id, yearEndValue: evidence.amount },
        source: evidence.source,
      })
    }
    if (evidence.kind === 'vehicle-financing') {
      const existing = state.liabilities.find((item) => item.description === 'Vehicle financing' && item.creditor === evidence.institution)
      if (!existing) findings.push({
        kind: 'liability-add',
        description: `${evidence.source} shows vehicle financing of ${rupiah(evidence.amount)} that is missing from Liabilities.`,
        payload: { description: 'Vehicle financing', creditor: evidence.institution, yearEndBalance: evidence.amount },
        source: evidence.source,
      })
      else if (existing.yearEndBalance !== evidence.amount) findings.push({
        kind: 'liability',
        description: `${evidence.source} shows a vehicle-financing balance of ${rupiah(evidence.amount)}, not ${rupiah(existing.yearEndBalance)}.`,
        payload: { id: existing.id, yearEndBalance: evidence.amount },
        source: evidence.source,
      })
    }
  }
  return findings
}

export function validateReturn(state: FilingState): ValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  const amountFields: Array<[keyof Pick<WithholdingRecord, 'grossIncome' | 'deductions' | 'netIncome' | 'taxDue' | 'taxWithheld'>, string]> = [
    ['grossIncome', 'Gross income'],
    ['deductions', 'Deductions'],
    ['netIncome', 'Net income'],
    ['taxDue', 'Tax due'],
    ['taxWithheld', 'Tax withheld'],
  ]
  amountFields.forEach(([field, label]) => {
    if (!isValidAmount(state.withholding[field])) errors.push({ field: `withholding.${field}`, message: `${label} must be a finite, non-negative amount.` })
  })

  if (!state.draft?.posted) errors.push({ field: 'draft', message: 'Post the draft before validating the return.' })
  if (!state.documentName) errors.push({ field: 'document', message: 'Import the BPA1 withholding document.' })
  if (state.withholding.taxWithheld > 0 && state.withholding.netIncome <= 0) {
    errors.push({ field: 'withholding.netIncome', message: 'Report employment income for this withholding credit.' })
  }
  if (!state.withholding.reviewed) {
    errors.push({ field: 'withholding', message: 'Review the prefilled BPA1 record.' })
  }
  if (isValidAmount(state.withholding.taxDue) && isValidAmount(state.withholding.taxWithheld)) {
    if (state.withholding.taxWithheld < state.withholding.taxDue) {
      errors.push({ field: 'taxBalance', message: 'A nonzero amount payable is outside the supported zero-balance filing scope.' })
    } else if (state.withholding.taxWithheld > state.withholding.taxDue) {
      errors.push({ field: 'taxBalance', message: 'Overpayment and refund scenarios are outside the supported filing scope.' })
    }
  }
  state.assets.forEach((asset) => {
    if (!asset.reviewed) errors.push({ field: `asset.${asset.id}`, message: `Review ${asset.description}.` })
    if (!isValidAmount(asset.yearEndValue)) errors.push({ field: `asset.${asset.id}`, message: 'Asset value must be a finite, non-negative amount.' })
  })
  state.liabilities.forEach((item) => {
    if (!item.reviewed) errors.push({ field: `liability.${item.id}`, message: `Review ${item.description}.` })
    if (!isValidAmount(item.yearEndBalance)) {
      errors.push({ field: `liability.${item.id}`, message: 'Liability balance must be a finite, non-negative amount.' })
    }
  })
  if (state.dependents !== state.withholdingDependents) {
    warnings.push({
      field: 'dependents',
      message: 'Dependent count differs from the withholding record. Confirm the PTKP status.',
    })
  }

  return {
    errors,
    warnings,
    taxBalance: isValidAmount(state.withholding.taxDue) && isValidAmount(state.withholding.taxWithheld)
      ? Math.max(0, state.withholding.taxDue - state.withholding.taxWithheld)
      : 0,
  }
}

export function rupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

/**
 * Kurs Pajak: the rate the Ministry of Finance sets for converting foreign
 * currency for tax purposes. It is published weekly by KMK and is deliberately
 * not the market rate, so a fixed value with its period is the accurate
 * representation rather than a shortcut. Fixed at build time because the app
 * has no network access at all (see the connect-src CSP directive); update this
 * when a new KMK takes effect.
 */
export const TAX_EXCHANGE_RATE = {
  idrPerUsd: 17_796,
  document: 'KMK 39/MK/EF.2/2026',
  period: '26 August to 1 September 2026',
  url: 'https://fiskal.kemenkeu.go.id/informasi-publik/kurs-pajak',
} as const

export function usd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(value / TAX_EXCHANGE_RATE.idrPerUsd)
}

export function progress(state: FilingState): { complete: number; total: number } {
  const checks = [
    Boolean(state.documentName) && state.supportingEvidence.length >= 2,
    state.withholding.reviewed,
    state.assets.every((asset) => asset.reviewed),
    state.liabilities.every((item) => item.reviewed),
    state.dependents === state.withholdingDependents,
    state.status === 'validated' || state.status === 'declaration' || state.status === 'filed',
    state.status === 'filed',
  ]
  return { complete: checks.filter(Boolean).length, total: checks.length }
}

export function getFilingStepBlocker(state: FilingState, step: FilingStep): string | null {
  if (step === 'documents') {
    if (!state.documentName) return 'Import the BPA1 withholding certificate to continue.'
    const hasBankRecord = state.supportingEvidence.some((record) => record.kind === 'fixed-deposit')
    const hasFinancingRecord = state.supportingEvidence.some((record) => record.kind === 'vehicle-financing')
    if (!hasBankRecord && !hasFinancingRecord) return 'Import the bank and financing records to continue.'
    if (!hasBankRecord) return 'Import the bank record to continue.'
    if (!hasFinancingRecord) return 'Import the financing record to continue.'
  }
  if (step === 'income' && !state.withholding.reviewed) return 'Review the employment income and withholding record to continue.'
  if (step === 'assets' && state.assets.some((asset) => !asset.reviewed)) return 'Review every asset to continue.'
  if (step === 'liabilities' && state.liabilities.some((item) => !item.reviewed)) return 'Review every liability to continue.'
  if (step === 'family' && state.dependents !== state.withholdingDependents) return 'Confirm the dependent count matches the withholding record to continue.'
  if (step === 'review' && state.status !== 'validated' && state.status !== 'declaration' && state.status !== 'filed') return 'Run return validation and clear every blocking check to continue.'
  return null
}

export function getFilingNavigationBlocker(state: FilingState, current: FilingStep, target: FilingStep): string | null {
  if (state.status === 'declaration' || state.status === 'filed') return null
  const currentIndex = FILING_STEPS.indexOf(current)
  const targetIndex = FILING_STEPS.indexOf(target)
  if (targetIndex <= currentIndex) return null
  for (const step of FILING_STEPS.slice(0, targetIndex)) {
    const blocker = getFilingStepBlocker(state, step)
    if (blocker) return blocker
  }
  return null
}
