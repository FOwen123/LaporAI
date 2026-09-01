import { FILING_STEPS, createBankStatementText, createBpa1Text, createFinancingStatementText, getDocumentFindings, getFilingNavigationBlocker, getFilingStepBlocker, parseBpa1Text, parseSupportingEvidenceText, progress, validateReturn, type FilingAction, type FilingState, type FilingStep, type Proposal } from './tax'

export type ToolResult = { content: { type: 'text'; text: string }[]; structuredContent?: unknown; isError?: boolean }
export type AgentPdfUpload = { documentType: 'bpa1' | 'supporting'; fileName: string; pdfBase64: string }
type WebMcpTool = {
  name: string
  title: string
  description: string
  inputSchema?: Record<string, unknown>
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean }
  execute: (input: Record<string, unknown>) => ToolResult | Promise<ToolResult>
}
export type WebMcpToolHelp = Pick<WebMcpTool, 'name' | 'title' | 'description'>

declare global {
  interface Document {
    modelContext?: { registerTool: (tool: WebMcpTool, options: { signal: AbortSignal }) => void | Promise<void> }
  }
}

const readOnly = { readOnlyHint: true }
const validText = (value: unknown) => typeof value === 'string' && value.trim().length > 0 && value.length <= 500 && !/\b\d{16}\b/.test(value)
const validAmount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
const fieldHelp: Record<string, string> = {
  PTKP: 'PTKP is the personal tax-free allowance. Compare the dependent count with the withholding record; changing it does not recalculate taxes.',
  dependents: 'Number of qualifying dependents, from zero to three. Ask the taxpayer to compare the count with the imported withholding record.',
  yearEndValue: 'Asset value at 31 December 2025 in Indonesian rupiah. Confirm the amount from the asset record before proposing a change.',
  yearEndBalance: 'Debt outstanding at 31 December 2025 in Indonesian rupiah, not the original loan amount.',
  grossIncome: 'Employment income before deductions, read from the BPA1.',
  netIncome: 'Employment income after the deductions shown in the BPA1.',
  taxWithheld: 'Income tax already withheld by the employer, credited against the tax liability.',
  taxDue: 'Tax liability provided by the BPA1. LaporAI compares it with withholding; it is not a tax calculator.',
}
const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false })
const result = (message: string, data?: unknown): ToolResult => ({ content: [{ type: 'text', text: message }], structuredContent: data })
const failure = (message: string, data?: unknown): ToolResult => ({ ...result(message, data), isError: true })
const proposal = (kind: Proposal['kind'], description: string, payload: Record<string, unknown>): FilingAction => ({ type: 'propose', proposal: { id: `proposal-${Date.now()}`, kind, description, payload } })
let activeRegistration = 0
let registeredToolHelp: WebMcpToolHelp[] = []

export function getRegisteredToolHelp(): WebMcpToolHelp[] {
  return registeredToolHelp.map((tool) => ({ ...tool }))
}

export function getAvailableToolNames(state: FilingState): string[] {
  if (!state.loggedIn) return []
  const base = ['get_filing_requirements', 'get_document_status', 'get_current_step_requirements', 'open_document_center', 'go_to_filing_step', 'next_filing_step', 'previous_filing_step']
  if (state.status !== 'declaration' && state.status !== 'filed') base.push('choose_document_source', 'upload_tax_document')
  if ((state.status === 'declaration' || state.status === 'filed') && !state.draft) return [...base, 'explain_tax_result']
  if (!state.draft) return [...base, 'create_employee_return']
  if (!state.draft.posted && state.status !== 'declaration' && state.status !== 'filed') return [...base, 'get_return_progress', 'load_prefilled_records']
  const reads = [...base, 'get_return_progress', 'review_prefilled_data', 'get_section_data', 'explain_field']
  if (state.supportingEvidence.length) reads.push('review_supporting_documents')
  if (state.status === 'declaration' || state.status === 'filed') return [...reads, 'explain_tax_result']
  const mutations = ['validate_return', 'explain_tax_result', 'confirm_prefilled_record', 'open_add_asset_form', 'add_asset', 'update_asset', 'remove_asset', 'open_add_liability_form', 'add_liability', 'update_liability', 'remove_liability', 'open_dependents_picker', 'update_dependent_details', 'open_review_summary']
  if (getDocumentFindings(state).length) mutations.push('reconcile_supporting_documents')
  return [...reads, ...mutations]
}

export function registerWebMcpTools(
  state: FilingState,
  dispatch: (action: FilingAction) => void,
  onOrient: (target: string) => void = () => undefined,
  onOpenControl: (control: 'asset' | 'liability' | 'dependents') => void = () => undefined,
  onUploadDocument: (upload: AgentPdfUpload) => Promise<ToolResult> = async () => failure('Document upload is unavailable.'),
  currentStep: FilingStep = 'documents',
  onNavigateStep: (step: FilingStep) => void = () => undefined,
): () => void {
  const registration = ++activeRegistration
  const api = document.modelContext
  if (!api) {
    registeredToolHelp = []
    return () => undefined
  }
  const controller = new AbortController()
  const orient = (view: FilingState['view'], target: string) => {
    dispatch({ type: 'navigate', view })
    onOrient(target)
  }
  const stepTarget: Record<FilingStep, string> = { documents: 'document-center', income: 'income-step', assets: 'assets-step', liabilities: 'liabilities-step', family: 'family-step', review: 'review-summary', declaration: 'declaration-step' }
  const goStep = (step: FilingStep) => {
    const blocker = getFilingNavigationBlocker(state, currentStep, step)
    if (blocker) return failure(blocker, { currentStep, targetStep: step })
    if (step === 'declaration' && state.status !== 'validated' && state.status !== 'declaration' && state.status !== 'filed') return failure('Validate the return before opening the declaration step.')
    onNavigateStep(step)
    orient('return', stepTarget[step])
    return result(`Opened the ${step} step.`, { step })
  }
  const currentStepRequirements = () => {
    const hasBankRecord = state.supportingEvidence.some((record) => record.kind === 'fixed-deposit')
    const hasFinancingRecord = state.supportingEvidence.some((record) => record.kind === 'vehicle-financing')
    const requirements: Record<FilingStep, { required: string[]; completed: string[]; missing: string[]; nextAction: string }> = {
      documents: {
        required: ['BPA1 withholding certificate', 'bank record', 'financing record'],
        completed: [state.documentName && 'BPA1 withholding certificate', hasBankRecord && 'bank record', hasFinancingRecord && 'financing record'].filter((item): item is string => Boolean(item)),
        missing: [!state.documentName && 'BPA1 withholding certificate', !hasBankRecord && 'bank record', !hasFinancingRecord && 'financing record'].filter((item): item is string => Boolean(item)),
        nextAction: '',
      },
      income: { required: ['Review the employment income and withholding record'], completed: state.withholding.reviewed ? ['Review the employment income and withholding record'] : [], missing: state.withholding.reviewed ? [] : ['Review the employment income and withholding record'], nextAction: state.withholding.reviewed ? 'Move to the next step.' : 'Use confirm_prefilled_record with recordId "withholding", then wait for the taxpayer to approve it.' },
      assets: { required: ['Review every asset'], completed: state.assets.every((asset) => asset.reviewed) ? ['Review every asset'] : [], missing: state.assets.some((asset) => !asset.reviewed) ? state.assets.filter((asset) => !asset.reviewed).map((asset) => `Review asset: ${asset.description}`) : [], nextAction: state.assets.some((asset) => !asset.reviewed) ? 'Use confirm_prefilled_record for each unreviewed asset, then wait for taxpayer approval.' : 'Move to the next step.' },
      liabilities: { required: ['Review every liability'], completed: state.liabilities.every((item) => item.reviewed) ? ['Review every liability'] : [], missing: state.liabilities.some((item) => !item.reviewed) ? state.liabilities.filter((item) => !item.reviewed).map((item) => `Review liability: ${item.description}`) : [], nextAction: state.liabilities.some((item) => !item.reviewed) ? 'Use confirm_prefilled_record for each unreviewed liability, then wait for taxpayer approval.' : 'Move to the next step.' },
      family: { required: ['Confirm the dependent count matches the withholding record'], completed: state.dependents === state.withholdingDependents ? ['Confirm the dependent count matches the withholding record'] : [], missing: state.dependents === state.withholdingDependents ? [] : ['Confirm the dependent count matches the withholding record'], nextAction: state.dependents === state.withholdingDependents ? 'Move to the next step.' : 'Ask the taxpayer for the correct dependent count, then use update_dependent_details.' },
      review: { required: ['Validate the return and clear every blocking check'], completed: state.status === 'validated' || state.status === 'declaration' || state.status === 'filed' ? ['Validate the return and clear every blocking check'] : [], missing: state.status === 'validated' || state.status === 'declaration' || state.status === 'filed' ? [] : ['Validate the return and clear every blocking check'], nextAction: state.status === 'validated' || state.status === 'declaration' || state.status === 'filed' ? 'Move to the declaration step.' : 'Use validate_return, then resolve any reported errors.' },
      declaration: { required: ['Taxpayer declaration and submission'], completed: state.status === 'filed' ? ['Taxpayer declaration and submission'] : [], missing: state.status === 'filed' ? [] : ['Taxpayer declaration and submission'], nextAction: state.status === 'filed' ? 'The return is filed.' : 'Ask the taxpayer to review the declaration and submit the return in the visible page.' },
    }
    const status = requirements[currentStep]
    if (currentStep === 'documents') status.nextAction = status.missing.length ? `Ask the taxpayer to attach the missing ${status.missing.join(' and ')}, or tell them to import ${status.missing.length === 1 ? 'it' : 'them'} on the Documents page.` : 'Move to the next step.'
    return status
  }
  const propose = (kind: Proposal['kind'], description: string, payload: Record<string, unknown>) => {
    if (state.pendingProposal) return failure('A proposal is pending. Wait for the taxpayer to approve or reject it before proposing another change.')
    dispatch(proposal(kind, description, payload))
    onNavigateStep(kind === 'withholding' ? 'income' : kind === 'dependents' ? 'family' : kind.startsWith('asset') ? 'assets' : 'liabilities')
    orient('return', 'agent-proposal')
    return result('A visible proposal is waiting for the taxpayer. No value has changed.', { proposal: description })
  }
  const tools: Record<string, WebMcpTool> = {
    open_document_center: { name: 'open_document_center', title: 'Open document center', description: 'Open the document step to inspect or import tax documents.', execute: () => goStep('documents') },
    go_to_filing_step: { name: 'go_to_filing_step', title: 'Go to filing step', description: 'Open a specific visible page in the guided tax-return workflow.', inputSchema: objectSchema({ step: { type: 'string', enum: FILING_STEPS } }, ['step']), execute: (input) => FILING_STEPS.includes(input.step as FilingStep) ? goStep(input.step as FilingStep) : failure('Choose a supported filing step.', { steps: FILING_STEPS }) },
    next_filing_step: { name: 'next_filing_step', title: 'Next filing step', description: 'Move forward one page after the current filing step is complete.', execute: () => { const index = FILING_STEPS.indexOf(currentStep); const blocker = getFilingStepBlocker(state, currentStep); return blocker ? failure(blocker, { step: currentStep }) : index < FILING_STEPS.length - 1 ? goStep(FILING_STEPS[index + 1]) : failure('The declaration is the final filing step.') } },
    previous_filing_step: { name: 'previous_filing_step', title: 'Previous filing step', description: 'Move back one page in the guided tax-return workflow.', execute: () => { const index = FILING_STEPS.indexOf(currentStep); return index > 0 ? goStep(FILING_STEPS[index - 1]) : failure('Documents is the first filing step.') } },
    get_current_step_requirements: { name: 'get_current_step_requirements', title: 'Get current step requirements', description: 'Call before acting and after each upload or change. Returns the current page, completed work, missing work, whether Next is unlocked, and the next action. Ask the taxpayer for missing documents or information instead of inventing it.', annotations: readOnly, execute: () => { const status = currentStepRequirements(); const canContinue = status.missing.length === 0 && currentStep !== 'declaration'; return result(canContinue ? `The ${currentStep} step is complete. Next is available.` : `${status.missing.join(', ')} still required. ${status.nextAction}`, { currentStep, ...status, canContinue, nextStep: canContinue ? FILING_STEPS[FILING_STEPS.indexOf(currentStep) + 1] : null }) } },
    choose_document_source: {
      name: 'choose_document_source',
      title: 'Choose document source',
      description: 'Call without a choice first, then ask the taxpayer the returned question. After they answer, call again with their choice. Use own_documents to open the PDF upload area or sample_documents to import all three profile-matched sample records.',
      annotations: { destructiveHint: true },
      inputSchema: objectSchema({ choice: { type: 'string', enum: ['own_documents', 'sample_documents'] } }),
      execute: (input) => {
        const question = 'Do you want to use your own documents or the sample documents?'
        if (input.choice === undefined) return result(question, { question, options: ['own_documents', 'sample_documents'] })
        if (input.choice === 'own_documents') { goStep('documents'); return result('Opened the Documents page. Ask the taxpayer to attach a BPA1, bank record, and financing record in chat, or import them with the visible file controls.', { choice: input.choice }) }
        if (input.choice !== 'sample_documents') return failure('Choose own_documents or sample_documents.')
        dispatch({ type: 'import-withholding', record: parseBpa1Text(createBpa1Text(state.profile)), actor: 'Agent', documentName: 'LaporAI-BPA1-SAMPLE.pdf' })
        dispatch({ type: 'import-supporting-evidence', evidence: parseSupportingEvidenceText(createBankStatementText(state.profile)), actor: 'Agent', documentName: 'LaporAI-BANK-SAMPLE.pdf' })
        dispatch({ type: 'import-supporting-evidence', evidence: parseSupportingEvidenceText(createFinancingStatementText(state.profile)), actor: 'Agent', documentName: 'LaporAI-FINANCING-SAMPLE.pdf' })
        goStep('documents')
        return result('Imported the BPA1, bank, and financing samples for the active taxpayer.', { choice: input.choice, imported: ['LaporAI-BPA1-SAMPLE.pdf', 'LaporAI-BANK-SAMPLE.pdf', 'LaporAI-FINANCING-SAMPLE.pdf'] })
      },
    },
    upload_tax_document: {
      name: 'upload_tax_document',
      title: 'Upload tax document',
      description: 'Import a PDF the taxpayer gave you. The Documents step requires one BPA1 plus both supporting records: a bank or fixed-deposit record and a vehicle-financing record. Ask for any missing PDF or tell the taxpayer to import it in the page. Base64-encode the exact attached bytes and never invent contents. Maximum 2 MB.',
      annotations: { destructiveHint: true },
      inputSchema: objectSchema({
        documentType: { type: 'string', enum: ['bpa1', 'supporting'] },
        fileName: { type: 'string', description: 'Original PDF file name ending in .pdf.' },
        pdfBase64: { type: 'string', maxLength: 2_700_000, description: 'Base64-encoded PDF bytes without a data URL prefix.' },
      }, ['documentType', 'fileName', 'pdfBase64']),
      execute: async (input) => {
        if ((input.documentType !== 'bpa1' && input.documentType !== 'supporting') || !validText(input.fileName) || !String(input.fileName).toLowerCase().endsWith('.pdf') || typeof input.pdfBase64 !== 'string' || !input.pdfBase64.length || input.pdfBase64.length > 2_700_000) return failure('Provide a BPA1 or supporting PDF up to 2 MB as base64.')
        try {
          const output = await onUploadDocument(input as AgentPdfUpload)
          if (!output.isError) goStep('documents')
          return output
        } catch (error) {
          return failure(error instanceof Error ? error.message : 'The PDF could not be imported.')
        }
      },
    },
    load_prefilled_records: { name: 'load_prefilled_records', title: 'Load prefilled records', description: 'Load the prefilled records into the current draft before reviewing or editing.', execute: () => { dispatch({ type: 'post-draft' }); orient('return', 'return-summary'); return result('Loaded prefilled records.') } },
    get_filing_requirements: { name: 'get_filing_requirements', title: 'Get filing requirements', description: 'List the supported employee-return requirements.', annotations: readOnly, execute: () => result('Prepare the account, BPA1, assets, liabilities, dependents, and human declaration.', { supportedYear: 2025, type: 'Normal individual income tax', boundary: 'Employee, zero-balance filing only' }) },
    get_document_status: { name: 'get_document_status', title: 'Get document status', description: 'Read imported withholding and supporting-document status.', annotations: readOnly, execute: () => result(state.documentName ? 'The BPA1 status and supporting documents are available.' : 'No BPA1 is imported.', { documentName: state.documentName, withholding: state.withholding, supportingEvidence: state.supportingEvidence }) },
    create_employee_return: { name: 'create_employee_return', title: 'Create employee return', description: 'Create or open the supported normal 2025 draft.', inputSchema: objectSchema({ year: { type: 'integer', const: 2025 } }, ['year']), execute: (input) => { if (input.year !== 2025) return failure('Only tax year 2025 is supported.'); dispatch({ type: 'create-draft', year: 2025 }); orient('return', 'return-summary'); return result('Created or opened the 2025 employee draft.') } },
    get_return_progress: { name: 'get_return_progress', title: 'Get return progress', description: 'Read completed and incomplete return steps.', annotations: readOnly, execute: () => result(`The return is ${state.status}.`, { ...progress(state), status: state.status, draft: state.draft }) },
    review_prefilled_data: { name: 'review_prefilled_data', title: 'Review prefilled data', description: 'List visible records that still need taxpayer review.', annotations: readOnly, execute: () => result('Returned current unreviewed records.', { withholding: state.withholding.reviewed ? [] : [state.withholding], assets: state.assets.filter((item) => !item.reviewed), liabilities: state.liabilities.filter((item) => !item.reviewed), documentFindings: getDocumentFindings(state) }) },
    review_supporting_documents: { name: 'review_supporting_documents', title: 'Review supporting documents', description: 'Compare imported supporting documents with the visible assets and liabilities.', annotations: readOnly, execute: () => { const findings = getDocumentFindings(state); return result(findings.length ? `Found ${findings.length} document-backed difference${findings.length === 1 ? '' : 's'}.` : 'The imported supporting documents match the visible return.', { findings }) } },
    reconcile_supporting_documents: { name: 'reconcile_supporting_documents', title: 'Propose next document correction', description: 'Propose the next correction supported by an imported document. The taxpayer must approve it.', execute: () => { const finding = getDocumentFindings(state)[0]; return finding ? propose(finding.kind, finding.description, finding.payload) : result('The imported supporting documents match the visible return.', { findings: [] }) } },
    get_section_data: { name: 'get_section_data', title: 'Get section data', description: 'Read one visible section of the return.', annotations: readOnly, inputSchema: objectSchema({ section: { type: 'string', enum: ['withholding', 'assets', 'liabilities', 'dependents'] } }, ['section']), execute: (input) => { const sections = { withholding: state.withholding, assets: state.assets, liabilities: state.liabilities, dependents: { count: state.dependents, withholdingCount: state.withholdingDependents } }; const section = String(input.section) as keyof typeof sections; return Object.hasOwn(sections, section) ? result(`Returned ${section}.`, sections[section]) : failure('Unknown or hidden section.') } },
    explain_field: { name: 'explain_field', title: 'Explain field', description: 'Explain a supported field using its source.', annotations: readOnly, inputSchema: objectSchema({ field: { type: 'string', enum: Object.keys(fieldHelp) } }, ['field']), execute: (input) => typeof input.field === 'string' && Object.hasOwn(fieldHelp, input.field) ? result(fieldHelp[input.field], { field: input.field }) : failure('Unknown field. Use one of the supported field names.', { fields: Object.keys(fieldHelp) }) },
    validate_return: { name: 'validate_return', title: 'Validate return', description: 'Validate the draft and update the visible review state. The taxpayer must still declare and submit.', execute: () => { const validation = validateReturn(state); dispatch({ type: 'validate' }); goStep('review'); return result('Validation completed against current visible state.', validation) } },
    explain_tax_result: { name: 'explain_tax_result', title: 'Explain tax result', description: 'Explain the current calculated balance.', annotations: readOnly, execute: () => { const validation = validateReturn(state); return result(validation.errors.length ? 'The return is incomplete or outside the supported zero-balance filing scope. Resolve the reported issues before filing.' : validation.taxBalance === 0 ? 'Tax due and withholding credit are equal, so the balance is zero.' : 'The return currently has a balance.', validation) } },
    confirm_prefilled_record: { name: 'confirm_prefilled_record', title: 'Propose record confirmation', description: 'Ask the taxpayer to confirm withholding or an existing asset or liability by record ID.', inputSchema: objectSchema({ recordId: { type: 'string', enum: ['withholding', ...state.assets.map((item) => item.id), ...state.liabilities.map((item) => item.id)] } }, ['recordId']), execute: (input) => {
      if (input.recordId === 'withholding' && state.documentName) return propose('withholding', 'Confirm the imported BPA1 withholding record.', {})
      const asset = state.assets.find((item) => item.id === input.recordId)
      if (asset) return propose('asset', `Confirm ${asset.description} at IDR ${asset.yearEndValue.toLocaleString('id-ID')}.`, { id: asset.id, yearEndValue: asset.yearEndValue })
      const liability = state.liabilities.find((item) => item.id === input.recordId)
      if (liability) return propose('liability', `Confirm ${liability.description} at IDR ${liability.yearEndBalance.toLocaleString('id-ID')}.`, { id: liability.id, yearEndBalance: liability.yearEndBalance })
      return failure('The requested record is unavailable or stale.')
    } },
    open_add_asset_form: { name: 'open_add_asset_form', title: 'Open asset form', description: 'Open the visible form where the taxpayer can enter an asset name and year-end amount.', execute: () => { onNavigateStep('assets'); onOpenControl('asset'); orient('return', 'asset-form'); return result('Opened the asset form for the taxpayer.') } },
    add_asset: { name: 'add_asset', title: 'Propose asset addition', description: 'Propose an asset for visible approval.', inputSchema: objectSchema({ description: { type: 'string' }, category: { type: 'string' }, institution: { type: 'string' }, yearEndValue: { type: 'number', minimum: 0 } }, ['description', 'yearEndValue']), execute: (input) => validText(input.description) && validAmount(input.yearEndValue) && (input.category === undefined || validText(input.category)) && (input.institution === undefined || validText(input.institution)) ? propose('asset-add', `Add ${input.description} at IDR ${Number(input.yearEndValue).toLocaleString('id-ID')}.`, input) : failure('Invalid asset proposal.') },
    update_asset: { name: 'update_asset', title: 'Propose asset update', description: 'Propose a year-end value for an existing visible asset.', inputSchema: objectSchema({ id: { type: 'string' }, yearEndValue: { type: 'number', minimum: 0 } }, ['id', 'yearEndValue']), execute: (input) => state.assets.some((item) => item.id === input.id) && validAmount(input.yearEndValue) ? propose('asset', `Change asset ${String(input.id)} to IDR ${Number(input.yearEndValue).toLocaleString('id-ID')}.`, input) : failure('Invalid or stale asset proposal.') },
    remove_asset: { name: 'remove_asset', title: 'Propose asset removal', description: 'Propose removing a visible asset with a reason.', annotations: { destructiveHint: true }, inputSchema: objectSchema({ id: { type: 'string' }, reason: { type: 'string' } }, ['id', 'reason']), execute: (input) => state.assets.some((item) => item.id === input.id) && validText(input.reason) ? propose('asset-remove', `Remove asset ${String(input.id)} because: ${input.reason}`, input) : failure('Invalid or stale asset removal.') },
    open_add_liability_form: { name: 'open_add_liability_form', title: 'Open liability form', description: 'Open the visible form where the taxpayer can enter a liability name and year-end amount.', execute: () => { onNavigateStep('liabilities'); onOpenControl('liability'); orient('return', 'liability-form'); return result('Opened the liability form for the taxpayer.') } },
    add_liability: { name: 'add_liability', title: 'Propose liability addition', description: 'Propose a liability for visible approval.', inputSchema: objectSchema({ description: { type: 'string' }, creditor: { type: 'string' }, yearEndBalance: { type: 'number', minimum: 0 } }, ['description', 'yearEndBalance']), execute: (input) => validText(input.description) && (input.creditor === undefined || validText(input.creditor)) && validAmount(input.yearEndBalance) ? propose('liability-add', `Add ${input.description} with balance IDR ${Number(input.yearEndBalance).toLocaleString('id-ID')}.`, input) : failure('Invalid liability proposal.') },
    update_liability: { name: 'update_liability', title: 'Propose liability update', description: 'Propose a year-end balance for an existing visible liability.', inputSchema: objectSchema({ id: { type: 'string' }, yearEndBalance: { type: 'number', minimum: 0 } }, ['id', 'yearEndBalance']), execute: (input) => state.liabilities.some((item) => item.id === input.id) && validAmount(input.yearEndBalance) ? propose('liability', `Change liability ${String(input.id)} to IDR ${Number(input.yearEndBalance).toLocaleString('id-ID')}.`, input) : failure('Invalid or stale liability proposal.') },
    remove_liability: { name: 'remove_liability', title: 'Propose liability removal', description: 'Propose removing a visible liability with a reason.', annotations: { destructiveHint: true }, inputSchema: objectSchema({ id: { type: 'string' }, reason: { type: 'string' } }, ['id', 'reason']), execute: (input) => state.liabilities.some((item) => item.id === input.id) && validText(input.reason) ? propose('liability-remove', `Remove liability ${String(input.id)} because: ${input.reason}`, input) : failure('Invalid or stale liability removal.') },
    open_dependents_picker: { name: 'open_dependents_picker', title: 'Open dependents picker', description: 'Open or focus the visible dependent-count picker for the taxpayer.', execute: () => { onNavigateStep('family'); onOpenControl('dependents'); orient('return', 'dependents-picker'); return result('Opened the dependent-count picker for the taxpayer.') } },
    update_dependent_details: { name: 'update_dependent_details', title: 'Propose dependent count', description: 'Propose a dependent count from zero to three.', inputSchema: objectSchema({ count: { type: 'integer', minimum: 0, maximum: 3 } }, ['count']), execute: (input) => Number.isInteger(input.count) && Number(input.count) >= 0 && Number(input.count) <= 3 ? propose('dependents', `Change dependents from ${state.dependents} to ${String(input.count)}.`, input) : failure('Dependent count must be an integer from zero to three.') },
    open_review_summary: { name: 'open_review_summary', title: 'Open review summary', description: 'Navigate the visible portal to its review summary.', execute: () => goStep('review') },
  }
  const names = getAvailableToolNames(state)
  registeredToolHelp = names.map((name) => {
    const { title, description } = tools[name]
    return { name, title, description }
  })
  names.forEach((name) => {
    const tool = tools[name]
    Promise.resolve(api.registerTool({ ...tool, inputSchema: tool.inputSchema ?? objectSchema({}), execute: async (input) => {
      if (controller.signal.aborted || registration !== activeRegistration) return failure('This tool call is stale. Refresh the available tools and try again.')
      const output = await tool.execute(input)
      if (state.benchmarkRuns.at(-1)?.finishedAt === null) dispatch({ type: 'count-action', tool: true, error: output.isError === true })
      return output
    } }, { signal: controller.signal })).catch((error: unknown) => {
      if (!controller.signal.aborted) console.error(`Could not register WebMCP tool ${name}`, error)
    })
  })
  return () => {
    controller.abort()
    if (registration === activeRegistration) registeredToolHelp = []
  }
}
