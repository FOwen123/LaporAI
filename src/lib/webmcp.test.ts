import { createBankStatementText, createFinancingStatementText, createInitialState, filingReducer, parseSupportingEvidenceText, type FilingState } from './tax'
import { getAvailableToolNames, getRegisteredToolHelp, registerWebMcpTools } from './webmcp'

function setupTools(state: FilingState, currentStep: Parameters<typeof registerWebMcpTools>[5] = 'documents') {
  type Tool = Parameters<NonNullable<Document['modelContext']>['registerTool']>[0]
  const registry = new Map<string, Tool>()
  const dispatch = vi.fn()
  const orient = vi.fn()
  const openControl = vi.fn()
  const uploadDocument = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'Imported agent.pdf.' }] })
  const navigateStep = vi.fn()
  document.modelContext = { registerTool: (tool, { signal }) => {
    registry.set(tool.name, tool)
    signal.addEventListener('abort', () => registry.delete(tool.name), { once: true })
  } }
  const cleanup = registerWebMcpTools(state, dispatch, orient, openControl, uploadDocument, currentStep, navigateStep)
  return { registry, dispatch, orient, openControl, uploadDocument, navigateStep, cleanup }
}

afterEach(() => { delete document.modelContext })

describe('Native tool workflow', () => {
  const draft = () => filingReducer({ ...createInitialState(), loggedIn: true }, { type: 'create-draft', year: 2025 })

  it('counts read calls and rejected inputs in an active benchmark', async () => {
    const state = filingReducer(filingReducer(draft(), { type: 'post-draft' }), { type: 'start-benchmark', mode: 'webmcp' })
    const { registry, dispatch, cleanup } = setupTools(state)
    await registry.get('get_document_status')!.execute({})
    expect(dispatch).toHaveBeenCalledWith({ type: 'count-action', tool: true, error: false })
    const invalid = await registry.get('add_asset')!.execute({ description: '', yearEndValue: -1 })
    expect(invalid).toMatchObject({ isError: true })
    expect(dispatch).toHaveBeenCalledWith({ type: 'count-action', tool: true, error: true })
    cleanup()
  })

  it('exposes loading before editing and advances validation through the same reducer as the UI', async () => {
    const before = setupTools(draft())
    expect(before.registry.has('add_asset')).toBe(false)
    await before.registry.get('load_prefilled_records')!.execute({})
    expect(before.dispatch).toHaveBeenCalledWith({ type: 'post-draft' })
    before.cleanup()
    const after = setupTools(filingReducer(draft(), { type: 'post-draft' }))
    await after.registry.get('validate_return')!.execute({})
    expect(after.dispatch).toHaveBeenCalledWith({ type: 'validate' })
    expect(after.registry.get('validate_return')!.annotations?.readOnlyHint).not.toBe(true)
    after.cleanup()
  })

  it('explains real fields and rejects unsupported fields and malformed proposals', async () => {
    const { registry, dispatch, cleanup } = setupTools(filingReducer(draft(), { type: 'post-draft' }))
    expect(await registry.get('explain_tax_result')!.execute({})).toMatchObject({ content: [{ text: expect.stringContaining('incomplete') }] })
    expect(await registry.get('explain_field')!.execute({ field: 'PTKP' })).toMatchObject({ content: [{ text: expect.stringContaining('allowance') }] })
    expect(await registry.get('explain_field')!.execute({ field: 'made-up' })).toMatchObject({ content: [{ text: expect.stringContaining('Unknown') }] })
    for (const input of [{ description: '', yearEndValue: 2 }, { description: 'Demo', yearEndValue: Infinity }, { description: 'Demo', yearEndValue: 2, institution: {} }]) {
      await registry.get('add_asset')!.execute(input)
    }
    expect(dispatch).not.toHaveBeenCalled()
    cleanup()
  })

  it('does not replace a pending human decision with another agent proposal', async () => {
    const state = filingReducer(draft(), { type: 'post-draft' })
    state.pendingProposal = { id: 'pending', kind: 'dependents', description: 'First decision', payload: { count: 1 } }
    const { registry, dispatch, cleanup } = setupTools(state)
    expect(await registry.get('update_dependent_details')!.execute({ count: 2 })).toMatchObject({ content: [{ text: expect.stringContaining('pending') }] })
    expect(dispatch).not.toHaveBeenCalled()
    cleanup()
  })

  it('orients successful mutations but not reads or rejected inputs', async () => {
    const state = filingReducer(draft(), { type: 'post-draft' })
    const { registry, orient, cleanup } = setupTools(state)
    await registry.get('get_document_status')!.execute({})
    expect(orient).not.toHaveBeenCalled()

    await registry.get('add_asset')!.execute({ description: '', yearEndValue: -1 })
    expect(orient).not.toHaveBeenCalled()

    await registry.get('update_asset')!.execute({ id: 'asset-savings', yearEndValue: 49_000_000 })
    expect(orient).toHaveBeenLastCalledWith('agent-proposal')
    cleanup()
  })

  it('opens the asset, liability, and dependent controls for the taxpayer', async () => {
    const state = filingReducer(draft(), { type: 'post-draft' })
    const { registry, dispatch, orient, openControl, cleanup } = setupTools(state)

    await registry.get('open_add_asset_form')!.execute({})
    expect(openControl).toHaveBeenLastCalledWith('asset')
    expect(orient).toHaveBeenLastCalledWith('asset-form')
    await registry.get('open_add_liability_form')!.execute({})
    expect(openControl).toHaveBeenLastCalledWith('liability')
    expect(orient).toHaveBeenLastCalledWith('liability-form')
    await registry.get('open_dependents_picker')!.execute({})
    expect(openControl).toHaveBeenLastCalledWith('dependents')
    expect(orient).toHaveBeenLastCalledWith('dependents-picker')
    await registry.get('add_liability')!.execute({ description: 'Education loan', yearEndBalance: 7_500_000 })
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'propose', proposal: expect.objectContaining({ kind: 'liability-add' }) }))
    expect(openControl).toHaveBeenCalledTimes(3)
    expect(registry.get('add_liability')!.inputSchema).toMatchObject({ required: ['description', 'yearEndBalance'] })
    cleanup()
  })

  it('moves directly, forward, and backward through filing steps', async () => {
    const state = filingReducer(draft(), { type: 'post-draft' })
    state.documentName = 'LaporAI-BPA1-SAMPLE.pdf'
    state.supportingEvidence = [parseSupportingEvidenceText(createBankStatementText(state.profile)), parseSupportingEvidenceText(createFinancingStatementText(state.profile))]
    state.withholding = { ...state.withholding, reviewed: true }
    state.assets = state.assets.map((asset) => ({ ...asset, reviewed: true }))
    state.liabilities = state.liabilities.map((liability) => ({ ...liability, reviewed: true }))
    const { registry, navigateStep, cleanup } = setupTools(state, 'assets')
    await registry.get('go_to_filing_step')!.execute({ step: 'family' })
    expect(navigateStep).toHaveBeenLastCalledWith('family')
    await registry.get('next_filing_step')!.execute({})
    expect(navigateStep).toHaveBeenLastCalledWith('liabilities')
    await registry.get('previous_filing_step')!.execute({})
    expect(navigateStep).toHaveBeenLastCalledWith('income')
    expect(await registry.get('go_to_filing_step')!.execute({ step: 'declaration' })).toMatchObject({ isError: true })
    cleanup()
  })

  it('blocks next-page navigation until the current filing page is complete', async () => {
    const state = filingReducer(draft(), { type: 'post-draft' })
    const { registry, navigateStep, cleanup } = setupTools(state, 'documents')

    expect(await registry.get('next_filing_step')!.execute({})).toMatchObject({
      isError: true,
      content: [{ text: expect.stringMatching(/BPA1/i) }],
    })
    expect(navigateStep).not.toHaveBeenCalled()
    expect(await registry.get('go_to_filing_step')!.execute({ step: 'liabilities' })).toMatchObject({ isError: true })
    expect(navigateStep).not.toHaveBeenCalled()
    cleanup()
  })

  it('tells the agent what the current step still requires', async () => {
    const state = filingReducer(draft(), { type: 'post-draft' })
    state.documentName = 'LaporAI-BPA1-SAMPLE.pdf'
    const documents = setupTools(state, 'documents')

    expect(await documents.registry.get('get_current_step_requirements')!.execute({})).toMatchObject({
      content: [{ text: expect.stringMatching(/bank record and financing record/i) }],
      structuredContent: {
        currentStep: 'documents',
        required: ['BPA1 withholding certificate', 'bank record', 'financing record'],
        completed: ['BPA1 withholding certificate'],
        missing: ['bank record', 'financing record'],
        canContinue: false,
        nextAction: expect.stringMatching(/ask the taxpayer.*bank record and financing record/i),
      },
    })
    expect(documents.registry.get('get_current_step_requirements')!.annotations?.readOnlyHint).toBe(true)
    documents.cleanup()

    const income = setupTools(state, 'income')
    expect(await income.registry.get('get_current_step_requirements')!.execute({})).toMatchObject({
      structuredContent: {
        currentStep: 'income',
        missing: ['Review the employment income and withholding record'],
        canContinue: false,
      },
    })
    income.cleanup()
  })

  it('asks for a document source, then opens uploads or imports all samples', async () => {
    const state = filingReducer(draft(), { type: 'post-draft' })
    const tools = setupTools(state, 'documents')

    expect(await tools.registry.get('choose_document_source')!.execute({})).toMatchObject({
      content: [{ text: expect.stringMatching(/own documents.*sample documents/i) }],
      structuredContent: { question: expect.any(String), options: ['own_documents', 'sample_documents'] },
    })

    await tools.registry.get('choose_document_source')!.execute({ choice: 'own_documents' })
    expect(tools.orient).toHaveBeenLastCalledWith('document-center')

    expect(await tools.registry.get('choose_document_source')!.execute({ choice: 'sample_documents' })).toMatchObject({
      structuredContent: { imported: ['LaporAI-BPA1-SAMPLE.pdf', 'LaporAI-BANK-SAMPLE.pdf', 'LaporAI-FINANCING-SAMPLE.pdf'] },
    })
    expect(tools.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'import-withholding', actor: 'Agent' }))
    expect(tools.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'import-supporting-evidence', actor: 'Agent', evidence: expect.objectContaining({ kind: 'fixed-deposit' }) }))
    expect(tools.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'import-supporting-evidence', actor: 'Agent', evidence: expect.objectContaining({ kind: 'vehicle-financing' }) }))
    tools.cleanup()
  })

  it('imports an agent-provided PDF and opens the visible document status', async () => {
    const state = { ...createInitialState(), loggedIn: true }
    const { registry, orient, uploadDocument, cleanup } = setupTools(state)

    const output = await registry.get('upload_tax_document')!.execute({
      documentType: 'bpa1',
      fileName: 'agent.pdf',
      pdfBase64: 'JVBERi0xLjQ=',
    })

    expect(output).not.toMatchObject({ isError: true })
    expect(uploadDocument).toHaveBeenCalledWith({ documentType: 'bpa1', fileName: 'agent.pdf', pdfBase64: 'JVBERi0xLjQ=' })
    expect(orient).toHaveBeenLastCalledWith('document-center')
    expect(registry.get('upload_tax_document')!.annotations?.destructiveHint).toBe(true)
    expect(await registry.get('upload_tax_document')!.execute({ documentType: 'bpa1', fileName: 'agent.txt', pdfBase64: 'JVBERi0xLjQ=' })).toMatchObject({ isError: true })
    expect(uploadDocument).toHaveBeenCalledTimes(1)
    cleanup()
  })

  it('proposes the next correction found in imported supporting documents', async () => {
    const state = filingReducer(draft(), { type: 'post-draft' })
    state.supportingEvidence = [
      parseSupportingEvidenceText(createBankStatementText(state.profile)),
      parseSupportingEvidenceText(createFinancingStatementText(state.profile)),
    ]
    const { registry, dispatch, orient, cleanup } = setupTools(state)

    expect(registry.has('reconcile_supporting_documents')).toBe(true)
    expect(await registry.get('review_supporting_documents')!.execute({})).toMatchObject({
      structuredContent: { findings: [{ kind: 'asset-add' }, { kind: 'liability' }] },
    })
    await registry.get('reconcile_supporting_documents')!.execute({})
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'propose',
      proposal: expect.objectContaining({ kind: 'asset-add', payload: expect.objectContaining({ yearEndValue: 10_000_000 }) }),
    }))
    expect(orient).toHaveBeenLastCalledWith('agent-proposal')
    cleanup()
  })
})

describe('WebMCP registration states', () => {
  it('publishes help for the tools registered in the current page state', () => {
    const { cleanup } = setupTools({ ...createInitialState(), loggedIn: true })
    expect(getRegisteredToolHelp()).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'upload_tax_document', title: 'Upload tax document', description: expect.any(String) }),
    ]))
    cleanup()
    expect(getRegisteredToolHelp()).toEqual([])
  })

  it('exposes no taxpayer tools before demo login', () => {
    expect(getAvailableToolNames(createInitialState())).toEqual([])
  })

  it('exposes document and requirement tools after login', () => {
    const state = { ...createInitialState(), loggedIn: true }
    expect(getAvailableToolNames(state)).toEqual(
      expect.arrayContaining(['get_filing_requirements', 'get_document_status', 'get_current_step_requirements', 'choose_document_source']),
    )
  })

  it('removes mutation tools at declaration', () => {
    const state = { ...createInitialState(), loggedIn: true, status: 'declaration' as const }
    const names = getAvailableToolNames(state)
    expect(names).toContain('explain_tax_result')
    expect(names).not.toContain('update_asset')
    expect(names).not.toContain('update_liability')
    expect(names).not.toContain('upload_tax_document')
  })
})
