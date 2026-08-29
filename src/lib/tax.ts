export const DEMO_CREDENTIALS = {
  username: 'demo@laporai.example',
  password: 'LaporAI2026!',
} as const

export const SAMPLE_BPA1_TEXT = `LAPORAI BPA1 FIKTIF
EMPLOYER: PT NUSANTARA TEKNOLOGI FIKTIF
EMPLOYER_ID: DEMO-EMPLOYER-001
PERIOD: 01-2025/12-2025
GROSS_INCOME: 180000000
DEDUCTIONS: 6000000
NET_INCOME: 174000000
TAX_DUE: 13900000
TAX_WITHHELD: 13900000`

export type Actor = 'You' | 'Agent'
export type FilingStatus = 'ready' | 'editing' | 'validated' | 'declaration' | 'filed'
export type FilingView = 'home' | 'documents' | 'return' | 'review' | 'receipt' | 'benchmark'

export interface TaxpayerProfile {
  name: string
  taxId: string
  email: string
  maritalStatus: 'Single' | 'Married'
}

export interface WithholdingRecord {
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
    withholding: { ...emptyWithholding },
    assets: [
      {
        id: 'asset-savings',
        category: 'Cash and cash equivalents',
        description: 'Savings account',
        institution: 'Bank Nusantara Fiktif',
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
        creditor: 'Koperasi Fiktif Bersama',
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
    return {
      ...initial,
      ...saved,
      view: restoredView,
      profile: { ...initial.profile, ...saved.profile },
      withholding: { ...initial.withholding, ...saved.withholding },
      assets: Array.isArray(saved.assets) ? saved.assets : initial.assets,
      liabilities: Array.isArray(saved.liabilities) ? saved.liabilities : initial.liabilities,
      activity: Array.isArray(saved.activity) ? saved.activity : initial.activity,
      benchmarkRuns: Array.isArray(saved.benchmarkRuns) ? saved.benchmarkRuns : initial.benchmarkRuns,
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
  validatedAt: null,
})

const snapshot = (state: FilingState) => ({
  assets: state.assets,
  liabilities: state.liabilities,
  dependents: state.dependents,
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
      description: String(proposal.payload.description ?? 'Fictional asset'),
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
      id: id('liability'), description: String(proposal.payload.description ?? 'Fictional liability'),
      creditor: String(proposal.payload.creditor ?? 'Fictional creditor'), country: 'Indonesia',
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
      return { ...state, loggedIn: true, profile: action.profile ?? state.profile, view: 'home' }
    case 'logout':
      return { ...state, loggedIn: false, view: 'home', pendingProposal: null }
    case 'navigate':
      return { ...state, view: action.view }
    case 'create-draft':
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
        activity: [...state.activity, activity('You', `Created a normal ${action.year} annual return draft`)],
      }
    case 'post-draft':
      if (!state.draft) return state
      return {
        ...state,
        draft: { ...state.draft, posted: true },
        status: 'editing',
        activity: [...state.activity, activity('You', 'Posted fictional records into the draft')],
      }
    case 'import-withholding':
      return edited({
        ...state,
        withholding: { ...action.record, reviewed: false, source: action.documentName },
        documentName: action.documentName,
        activity: [
          ...state.activity,
          activity(action.actor, 'Imported a fictional BPA1 withholding record', state.documentName ?? 'None', action.documentName),
        ],
      })
    case 'review-withholding':
      return edited({
        ...state,
        withholding: { ...state.withholding, reviewed: true },
        activity: [...state.activity, activity(action.actor, 'Confirmed the BPA1 withholding record')],
      })
    case 'review-asset':
      return edited({
        ...state,
        lastEdit: snapshot(state),
        assets: state.assets.map((asset) => (asset.id === action.id ? { ...asset, reviewed: true } : asset)),
        activity: [...state.activity, activity(action.actor, 'Confirmed an asset record', action.id, 'Reviewed')],
      })
    case 'review-liability':
      return edited({
        ...state,
        lastEdit: snapshot(state),
        liabilities: state.liabilities.map((item) => (item.id === action.id ? { ...item, reviewed: true } : item)),
        activity: [...state.activity, activity(action.actor, 'Confirmed a liability record', action.id, 'Reviewed')],
      })
    case 'set-dependents': {
      const next = Math.min(3, Math.max(0, Math.round(action.count)))
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
      return edited({
        ...state,
        lastEdit: snapshot(state),
        assets: [...state.assets, action.asset],
        activity: [...state.activity, activity(action.actor, `Added asset: ${action.asset.description}`)],
      })
    case 'update-asset':
      {
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
      const removed = state.assets.find((asset) => asset.id === action.id)
      return edited({
        ...state,
        lastEdit: snapshot(state),
        assets: state.assets.filter((asset) => asset.id !== action.id),
        activity: [...state.activity, activity(action.actor, `Removed asset: ${removed?.description ?? action.id}`)],
      })
    }
    case 'update-liability':
      {
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
      return edited({
        ...state,
        lastEdit: snapshot(state),
        liabilities: [...state.liabilities, action.liability],
        activity: [...state.activity, activity(action.actor, `Added liability: ${action.liability.description}`)],
      })
    case 'remove-liability': {
      const removed = state.liabilities.find((item) => item.id === action.id)
      return edited({
        ...state,
        lastEdit: snapshot(state),
        liabilities: state.liabilities.filter((item) => item.id !== action.id),
        activity: [...state.activity, activity(action.actor, `Removed liability: ${removed?.description ?? action.id}`)],
      })
    }
    case 'propose':
      return { ...state, pendingProposal: action.proposal }
    case 'reject-proposal':
      return {
        ...state,
        pendingProposal: null,
        activity: [...state.activity, activity('You', 'Rejected an agent proposal')],
      }
    case 'approve-proposal':
      return state.pendingProposal ? applyProposal(state, state.pendingProposal) : state
    case 'validate': {
      const result = validateReturn(state)
      if (result.errors.length) return { ...state, status: 'editing', validatedAt: null }
      return { ...state, status: 'validated', validatedAt: new Date().toISOString(), view: 'review' }
    }
    case 'open-declaration':
      return state.status === 'validated' ? { ...state, status: 'declaration', view: 'review' } : state
    case 'file-return':
      if (state.status !== 'declaration') return state
      return {
        ...state,
        status: 'filed',
        view: 'receipt',
        receiptId: `DEMO-BPE-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        activity: [...state.activity, activity('You', 'Completed simulated signing and filing')],
      }
    case 'start-benchmark':
      return {
        ...state,
        benchmarkRuns: [
          ...state.benchmarkRuns,
          {
            id: id('run'),
            mode: action.mode,
            startedAt: performance.now(),
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
          index === all.length - 1 && run.finishedAt === null ? { ...run, finishedAt: performance.now() } : run,
        ),
      }
    case 'undo-last-edit':
      if (!state.lastEdit || state.status === 'filed') return state
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
  if (/\b\d{16}\b/.test(text)) throw new Error('This file may contain a real NIK or NPWP. Use the fictional sample only.')
  if (!text.includes('LAPORAI BPA1 FIKTIF')) throw new Error('This PDF is not a supported fictional LaporAI BPA1.')

  const value = (key: string) => {
    const match = text.match(new RegExp(`${key}:\\s*([^\\n\\r]+)`, 'i'))
    if (!match) throw new Error(`The fictional BPA1 is missing ${key}.`)
    return match[1].trim()
  }
  const amount = (key: string) => {
    const parsed = Number(value(key).replace(/[^0-9.-]/g, ''))
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${key} must be a positive fictional amount.`)
    return parsed
  }

  return {
    employer: value('EMPLOYER'),
    employerId: value('EMPLOYER_ID'),
    period: value('PERIOD'),
    grossIncome: amount('GROSS_INCOME'),
    deductions: amount('DEDUCTIONS'),
    netIncome: amount('NET_INCOME'),
    taxDue: amount('TAX_DUE'),
    taxWithheld: amount('TAX_WITHHELD'),
    reviewed: false,
    source: 'Fictional BPA1',
  }
}

export function validateReturn(state: FilingState): ValidationResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  if (!state.draft?.posted) errors.push({ field: 'draft', message: 'Post the draft before validating the return.' })
  if (!state.documentName) errors.push({ field: 'document', message: 'Import the fictional BPA1 withholding document.' })
  if (state.withholding.taxWithheld > 0 && state.withholding.netIncome <= 0) {
    errors.push({ field: 'withholding.netIncome', message: 'Report employment income for this withholding credit.' })
  }
  if (!state.withholding.reviewed) {
    errors.push({ field: 'withholding', message: 'Review the prefilled BPA1 record.' })
  }
  state.assets.forEach((asset) => {
    if (!asset.reviewed) errors.push({ field: `asset.${asset.id}`, message: `Review ${asset.description}.` })
    if (asset.yearEndValue < 0) errors.push({ field: `asset.${asset.id}`, message: 'Asset value cannot be negative.' })
  })
  state.liabilities.forEach((item) => {
    if (!item.reviewed) errors.push({ field: `liability.${item.id}`, message: `Review ${item.description}.` })
    if (item.yearEndBalance < 0) {
      errors.push({ field: `liability.${item.id}`, message: 'Liability balance cannot be negative.' })
    }
  })
  if (state.dependents !== state.withholdingDependents) {
    warnings.push({
      field: 'dependents',
      message: 'Dependent count differs from the fictional withholding record. Confirm the PTKP status.',
    })
  }

  return {
    errors,
    warnings,
    taxBalance: Math.max(0, state.withholding.taxDue - state.withholding.taxWithheld),
  }
}

export function rupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

export function progress(state: FilingState): { complete: number; total: number } {
  const checks = [
    Boolean(state.documentName),
    Boolean(state.draft),
    Boolean(state.draft?.posted),
    state.withholding.reviewed,
    state.assets.every((asset) => asset.reviewed),
    state.liabilities.every((item) => item.reviewed),
    state.status === 'validated' || state.status === 'declaration' || state.status === 'filed',
    state.status === 'filed',
  ]
  return { complete: checks.filter(Boolean).length, total: checks.length }
}
