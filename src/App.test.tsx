import { StrictMode } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { createBankStatementText, createBpa1Text, createFinancingStatementText, createInitialState, filingReducer, parseBpa1Text, parseSupportingEvidenceText, type WithholdingRecord } from './lib/tax'
import * as pdf from './lib/pdf'

const navigableState = () => {
  const state = createInitialState()
  state.loggedIn = true
  state.documentName = 'LaporAI-BPA1-SAMPLE.pdf'
  state.supportingEvidence = [parseSupportingEvidenceText(createBankStatementText(state.profile)), parseSupportingEvidenceText(createFinancingStatementText(state.profile))]
  state.withholding = { ...state.withholding, reviewed: true }
  state.assets = state.assets.map((asset) => ({ ...asset, reviewed: true }))
  state.liabilities = state.liabilities.map((liability) => ({ ...liability, reviewed: true }))
  return state
}

describe('LaporAI', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('enters the portal without secret credentials', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText(/unofficial demo/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /continue to workspace/i }))
    expect(screen.getByRole('heading', { name: /annual tax return/i })).toBeInTheDocument()
  })

  it('uses the LaporAI icon and keeps WebMCP status compact', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /continue to workspace/i }))

    expect(screen.getByRole('img', { name: 'LaporAI logo' })).toHaveAttribute('src', '/assets/laporai-logo-v2.svg')
    expect(screen.queryByText('Unofficial tax demo')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Benchmark' })).not.toBeInTheDocument()
    expect(screen.getByText('WebMCP')).toBeInTheDocument()
    expect(screen.queryByText('Current tools')).not.toBeInTheDocument()
    expect(screen.queryByText(/tools available now/i)).not.toBeInTheDocument()
  })

  it('opens a reference for the WebMCP tools currently registered', async () => {
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: () => undefined } })
    const user = userEvent.setup()
    localStorage.setItem('laporai-state', JSON.stringify(navigableState()))
    try {
      render(<App />)
      await user.click(screen.getByRole('button', { name: /WebMCP connected/i }))
      const dialog = screen.getByRole('dialog', { name: 'Available WebMCP tools' })
      expect(within(dialog).getByText('upload_tax_document')).toBeInTheDocument()
      expect(within(dialog).getByText(/Import a PDF the taxpayer gave you/i)).toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: 'Close WebMCP tools' }))
      expect(dialog).not.toHaveAttribute('open')
    } finally {
      delete document.modelContext
    }
  })

  it('uses one seven-step filing workspace with documents first and activity beside it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /continue to workspace/i }))

    expect(screen.queryByRole('button', { name: 'My documents' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'File tax return' }))
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tax documents' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Activity history' })).toBeInTheDocument()
    expect(screen.getByText('Bank statement sample')).toBeInTheDocument()
    expect(screen.getByText('Financing statement sample')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create 2025 draft' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load prefilled records' })).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Documents' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '1 Documents' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Employment income' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Assets' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next: Employment income' })).toBeDisabled()
    expect(screen.getByText(/Import the BPA1/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Import BPA1 sample' }))
    await user.click(screen.getByRole('button', { name: 'Import bank statement sample' }))
    await user.click(screen.getByRole('button', { name: 'Import financing statement sample' }))
    expect(screen.getByRole('button', { name: 'Next: Employment income' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Employment income' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Assets' })).toBeDisabled()
  })

  it('lets WebMCP move directly and backward through filing steps', async () => {
    type Tool = Parameters<NonNullable<Document['modelContext']>['registerTool']>[0]
    const registry = new Map<string, Tool>()
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: (tool: Tool, { signal }: { signal: AbortSignal }) => {
      registry.set(tool.name, tool)
      signal.addEventListener('abort', () => registry.delete(tool.name), { once: true })
    } } })
    localStorage.setItem('laporai-state', JSON.stringify(navigableState()))
    try {
      render(<App />)
      await act(async () => { await registry.get('go_to_filing_step')!.execute({ step: 'liabilities' }) })
      expect(screen.getByRole('heading', { name: 'Liabilities' })).toHaveFocus()
      await act(async () => { await registry.get('previous_filing_step')!.execute({}) })
      expect(screen.getByRole('heading', { name: 'Assets' })).toHaveFocus()
    } finally {
      delete document.modelContext
    }
  })

  it('uses only the two persistent fictional-data disclosures inside the portal', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /continue to workspace/i }))
    expect(screen.getAllByText(/fictional/i)).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'File tax return' }))
    expect(screen.getAllByText(/fictional/i)).toHaveLength(2)
    expect(screen.queryByText(/fiktif/i)).not.toBeInTheDocument()
  })

  it('keeps final filing as a human-only action', async () => {
    localStorage.setItem('laporai-state', JSON.stringify({ status: 'declaration', loggedIn: true }))
    render(<App />)
    expect(screen.getByRole('button', { name: /sign and file return/i })).toBeInTheDocument()
    expect(screen.getByText(/only you can complete this action/i)).toBeInTheDocument()
  })

  it('keeps completed returns read-only when navigating back to forms', async () => {
    const state = createInitialState()
    localStorage.setItem('laporai-state', JSON.stringify({ ...state, loggedIn: true, status: 'filed', view: 'return', draft: { id: 'DEMO-SPT-2025', year: 2025, model: 'Normal', taxType: 'PPh Orang Pribadi', period: 'January to December', posted: true } }))
    const user = userEvent.setup()
    const view = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Family and PTKP' }))
    expect(screen.getByLabelText('Dependents')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Liabilities' }))
    expect(screen.getByRole('button', { name: 'Add liability' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Documents' }))
    expect(screen.getByLabelText(/choose a BPA1 PDF/i)).toBeDisabled()
    view.unmount()
    localStorage.setItem('laporai-state', JSON.stringify({ ...state, loggedIn: true, status: 'filed', view: 'review', draft: { id: 'DEMO-SPT-2025', year: 2025, model: 'Normal', taxType: 'PPh Orang Pribadi', period: 'January to December', posted: true } }))
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Run return validation' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Filing complete' })).toBeInTheDocument()
  })

  it('averages the middle two benchmark durations for an even run count', () => {
    const state = createInitialState()
    localStorage.setItem('laporai-state', JSON.stringify({ ...state, loggedIn: true, view: 'benchmark', benchmarkRuns: [1000, 2000, 4000, 9000].map((duration, index) => ({ id: String(index), mode: 'manual', startedAt: 100000, finishedAt: 100000 + duration, actions: 0, errors: 0, toolCalls: 0 })) }))
    render(<App />)
    expect(screen.getByText('3.0 s median')).toBeInTheDocument()
  })

  it('discards unfinished legacy benchmarks while preserving history and resumable current runs', async () => {
    const completed = { id: 'legacy-completed', mode: 'manual', startedAt: 100_000, finishedAt: 102_000, actions: 4, errors: 0, toolCalls: 0 }
    const unfinished = { ...completed, id: 'legacy-unfinished', finishedAt: null }
    localStorage.setItem('laporai-state', JSON.stringify({ ...createInitialState(), loggedIn: true, view: 'benchmark', benchmarkRuns: [completed, unfinished] }))
    const user = userEvent.setup()
    const view = render(<App />)

    expect(screen.queryByRole('button', { name: 'Finish run' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('laporai-state')!).benchmarkRuns).toEqual([completed])
    await user.click(screen.getByRole('button', { name: /Manual/ }))
    view.unmount()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Finish run' }))

    const runs = JSON.parse(localStorage.getItem('laporai-state')!).benchmarkRuns
    expect(runs).toHaveLength(2)
    expect(runs[0]).toEqual(completed)
    expect(runs[1].finishedAt - runs[1].startedAt).toBeGreaterThanOrEqual(0)
    expect(runs[1].finishedAt - runs[1].startedAt).toBeLessThan(60_000)
  })

  it('clears old extraction and shows progress while a replacement PDF is read', async () => {
    const user = userEvent.setup()
    let finish!: (record: WithholdingRecord) => void
    const extraction = vi.spyOn(pdf, 'extractBpa1FromPdf').mockReturnValue(new Promise((resolve) => { finish = resolve }))
    try {
      render(<App />)
      await user.click(screen.getByRole('button', { name: /continue to workspace/i }))
      await user.click(screen.getByRole('button', { name: 'File tax return' }))
      const taxpayerId = screen.getByText(/^DEMO-NPWP-/).textContent!
      await user.click(screen.getByRole('button', { name: 'Import BPA1 sample' }))
      await user.upload(screen.getByLabelText(/choose a BPA1 PDF/i), new File(['demo'], 'replacement.pdf', { type: 'application/pdf' }))
      expect(screen.queryByRole('button', { name: 'Import record' })).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('Reading PDF')
      await act(async () => { finish(parseBpa1Text(createBpa1Text({ name: 'Ayu Larasati', taxId: taxpayerId }))) })
      expect(screen.getByRole('button', { name: 'Import record' })).toBeInTheDocument()
    } finally { extraction.mockRestore() }
  })

  it('supports StrictMode, agent proposals, human decisions, and logout with abort-based registration', async () => {
    type Tool = Parameters<NonNullable<Document['modelContext']>['registerTool']>[0]
    const registry = new Map<string, Tool>()
    const registerTool = (tool: Tool, options?: { signal: AbortSignal }) => {
      if (registry.has(tool.name)) throw new Error(`Duplicate tool: ${tool.name}`)
      registry.set(tool.name, tool)
      options?.signal.addEventListener('abort', () => registry.delete(tool.name), { once: true })
    }
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool } })
    const user = userEvent.setup()
    localStorage.setItem('laporai-state', JSON.stringify({ ...createInitialState(), loggedIn: true }))
    let unmount: (() => void) | undefined
    try {
      const view = render(<StrictMode><App /></StrictMode>)
      unmount = view.unmount
      expect(screen.getByRole('heading', { name: 'Annual tax return' })).toBeInTheDocument()
      expect(registry.has('get_filing_requirements')).toBe(true)
      await act(async () => { await registry.get('go_to_filing_step')!.execute({ step: 'family' }) })
      const propose = registry.get('update_dependent_details')!
      await act(async () => { await propose.execute({ count: 2 }) })
      expect(screen.getByLabelText('Dependents')).toHaveValue('0')
      expect(screen.getByText('Change dependents from 0 to 2.')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Reject change' }))
      expect(screen.getByLabelText('Dependents')).toHaveValue('0')
      await act(async () => { await registry.get('update_dependent_details')!.execute({ count: 1 }) })
      await user.click(screen.getByRole('button', { name: 'Approve agent change' }))
      expect(screen.getByLabelText('Dependents')).toHaveValue('1')
      expect(await propose.execute({ count: 3 })).toMatchObject({ content: [{ text: expect.stringContaining('stale') }] })
      await user.click(screen.getByRole('button', { name: 'Log out' }))
      expect(screen.getByRole('button', { name: /continue to workspace/i })).toBeInTheDocument()
      expect(registry.size).toBe(0)
      await user.click(screen.getByRole('button', { name: /continue to workspace/i }))
      const readTool = registry.get('get_document_status')!
      view.unmount()
      expect(registry.size).toBe(0)
      expect(await readTool.execute({})).toMatchObject({ content: [{ text: expect.stringContaining('stale') }] })
    } finally {
      unmount?.()
      delete document.modelContext
    }
  })

  it('uses English labels and retains only specialized Indonesian tax terms', async () => {
    const user = userEvent.setup()
    const state = navigableState()
    state.assets[0] = { ...state.assets[0], reviewed: false }
    localStorage.setItem('laporai-state', JSON.stringify(state))
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'File tax return' }))
    expect(screen.getByRole('heading', { name: 'Tax documents' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Annual income-tax withholding certificate (BPA1)' })).toBeInTheDocument()
    expect(screen.getByText(/Comparable in purpose to a U\.S\. Form W-2/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Employment income' }))
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('Marital status')).toBeInTheDocument()
    expect(screen.getByText('Single')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Assets' }))
    expect(screen.getByRole('heading', { name: 'Assets' })).toBeInTheDocument()
    const reviewSavings = screen.getByRole('button', { name: 'Mark Savings account as reviewed' })
    expect(reviewSavings).toHaveTextContent('✓')
    expect(screen.getByRole('status', { name: 'Motorcycle reviewed' })).toHaveTextContent('✓')
    expect(screen.getByRole('button', { name: 'Remove Savings account' })).toHaveTextContent('×')
    await user.click(reviewSavings)
    expect(screen.getByRole('status', { name: 'Savings account reviewed' })).toHaveTextContent('✓')
    await user.click(screen.getByRole('button', { name: 'Liabilities' }))
    expect(screen.getByRole('heading', { name: 'Liabilities' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Family and PTKP' }))
    expect(screen.getByRole('heading', { name: 'Family, tax-free allowance (PTKP), and other sections' })).toBeInTheDocument()
    expect(screen.getByLabelText('Dependents').parentElement).toHaveClass('select-control')
    expect(screen.queryByText(/records may be missing a fixed deposit/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/confirm with the taxpayer/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Harta|Utang|SPT Tahunan|Posting SPT/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Review' }))
    expect(screen.getByText('Legal basis and guidance')).toBeInTheDocument()
  })

  it('adds named assets and liabilities through focused dialogs', async () => {
    const draft = filingReducer(navigableState(), { type: 'create-draft', year: 2025 })
    localStorage.setItem('laporai-state', JSON.stringify(filingReducer(draft, { type: 'post-draft' })))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Assets' }))
    await user.click(screen.getByRole('button', { name: 'Add asset' }))
    const assetDialog = screen.getByRole('dialog', { name: 'Add asset' })
    await user.type(within(assetDialog).getByLabelText('Asset name'), 'Certificate of deposit')
    await user.type(within(assetDialog).getByLabelText('Amount (Rp)'), '12500000')
    await user.click(within(assetDialog).getByRole('button', { name: 'Add asset' }))
    expect(screen.getByText('Certificate of deposit')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark Certificate of deposit as reviewed' }))

    await user.click(screen.getByRole('button', { name: 'Liabilities' }))
    await user.click(screen.getByRole('button', { name: 'Add liability' }))
    const liabilityDialog = screen.getByRole('dialog', { name: 'Add liability' })
    await user.type(within(liabilityDialog).getByLabelText('Liability name'), 'Education loan')
    await user.type(within(liabilityDialog).getByLabelText('Amount (Rp)'), '7500000')
    await user.click(within(liabilityDialog).getByRole('button', { name: 'Add liability' }))
    expect(screen.getByText('Education loan')).toBeInTheDocument()
  })

  it('moves focus to the page opened by a successful WebMCP action', async () => {
    type Tool = Parameters<NonNullable<Document['modelContext']>['registerTool']>[0]
    const registry = new Map<string, Tool>()
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: (tool: Tool, { signal }: { signal: AbortSignal }) => {
      registry.set(tool.name, tool)
      signal.addEventListener('abort', () => registry.delete(tool.name), { once: true })
    } } })
    localStorage.setItem('laporai-state', JSON.stringify({ ...createInitialState(), loggedIn: true }))
    try {
      render(<App />)
      await act(async () => { await registry.get('open_document_center')!.execute({}) })
      expect(screen.getByRole('heading', { name: 'Tax documents' })).toHaveFocus()
      expect(screen.getByRole('heading', { name: 'Tax documents' }).closest('[data-agent-target]')).toHaveClass('agent-target-highlight')
    } finally {
      delete document.modelContext
    }
  })

  it('imports a profile-matched BPA1 supplied through WebMCP', async () => {
    type Tool = Parameters<NonNullable<Document['modelContext']>['registerTool']>[0]
    const registry = new Map<string, Tool>()
    const state = createInitialState()
    state.loggedIn = true
    const extracted = parseBpa1Text(createBpa1Text(state.profile))
    const extraction = vi.spyOn(pdf, 'extractBpa1FromPdf').mockResolvedValue(extracted)
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: (tool: Tool, { signal }: { signal: AbortSignal }) => {
      registry.set(tool.name, tool)
      signal.addEventListener('abort', () => registry.delete(tool.name), { once: true })
    } } })
    localStorage.setItem('laporai-state', JSON.stringify(state))
    try {
      render(<App />)
      await act(async () => { await registry.get('upload_tax_document')!.execute({ documentType: 'bpa1', fileName: 'agent.pdf', pdfBase64: btoa('pdf') }) })
      expect(screen.getByRole('heading', { name: 'Tax documents' })).toHaveFocus()
      expect(screen.getByText(/Imported: agent\.pdf/i)).toBeInTheDocument()
    } finally {
      extraction.mockRestore()
      delete document.modelContext
    }
  })

  it('rejects a BPA1 generated for a different taxpayer', async () => {
    const state = createInitialState()
    state.profile = { ...state.profile, name: 'Ayu Larasati', taxId: 'DEMO-NPWP-AYU001' }
    localStorage.setItem('laporai-state', JSON.stringify({ ...state, loggedIn: true, view: 'documents' }))
    const otherRecord = parseBpa1Text(createBpa1Text({ ...state.profile, name: 'Bima Santoso', taxId: 'DEMO-NPWP-BIMA01' }))
    const extraction = vi.spyOn(pdf, 'extractBpa1FromPdf').mockResolvedValue(otherRecord)
    const user = userEvent.setup()
    try {
      render(<App />)
      await user.upload(screen.getByLabelText(/choose a BPA1 PDF/i), new File(['sample'], 'other.pdf', { type: 'application/pdf' }))
      expect(screen.getByRole('alert')).toHaveTextContent(/does not match this taxpayer/i)
      expect(screen.queryByRole('button', { name: 'Import record' })).not.toBeInTheDocument()
    } finally {
      extraction.mockRestore()
    }
  })

  it('loads profile-matched supporting samples and shows evidence-backed findings', async () => {
    const state = navigableState()
    state.supportingEvidence = state.supportingEvidence.filter((record) => record.kind === 'vehicle-financing')
    state.view = 'documents'
    localStorage.setItem('laporai-state', JSON.stringify(state))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Import bank statement sample' }))
    expect(screen.getByText(/Imported supporting document: LaporAI-BANK-SAMPLE.pdf/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Assets' }))
    expect(screen.getByText(/LaporAI-BANK-SAMPLE\.pdf shows a fixed deposit of/i)).toBeInTheDocument()
    expect(screen.queryByText(/records may be missing/i)).not.toBeInTheDocument()
  })
})
