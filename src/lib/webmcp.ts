import { progress, validateReturn, type FilingAction, type FilingState, type Proposal } from './tax'

type ToolResult = { content: { type: 'text'; text: string }[]; structuredContent?: unknown }
type WebMcpTool = {
  name: string
  title: string
  description: string
  inputSchema?: Record<string, unknown>
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean }
  execute: (input: Record<string, unknown>) => ToolResult | Promise<ToolResult>
}

declare global {
  interface Document {
    modelContext?: { registerTool: (tool: WebMcpTool) => void; unregisterTool: (name: string) => void }
  }
}

const readOnly = { readOnlyHint: true }
const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false })
const result = (message: string, data?: unknown): ToolResult => ({ content: [{ type: 'text', text: message }], structuredContent: data })
const proposal = (kind: Proposal['kind'], description: string, payload: Record<string, unknown>): FilingAction => ({ type: 'propose', proposal: { id: `proposal-${Date.now()}`, kind, description, payload } })
let activeRegistration = 0

export function getAvailableToolNames(state: FilingState): string[] {
  if (!state.loggedIn) return []
  const base = ['get_filing_requirements', 'get_document_status']
  if ((state.status === 'declaration' || state.status === 'filed') && !state.draft) return [...base, 'explain_tax_result']
  if (!state.draft) return [...base, 'create_employee_return']
  const reads = [...base, 'get_return_progress', 'review_prefilled_data', 'get_section_data', 'explain_field']
  if (state.status === 'declaration' || state.status === 'filed') return [...reads, 'explain_tax_result']
  return [...reads, 'validate_return', 'explain_tax_result', 'confirm_prefilled_record', 'add_asset', 'update_asset', 'remove_asset', 'add_liability', 'update_liability', 'remove_liability', 'update_dependent_details', 'open_review_summary']
}

export function registerWebMcpTools(state: FilingState, dispatch: (action: FilingAction) => void): () => void {
  const registration = ++activeRegistration
  const api = document.modelContext
  if (!api) return () => undefined
  const propose = (kind: Proposal['kind'], description: string, payload: Record<string, unknown>) => {
    dispatch(proposal(kind, description, payload))
    return result('A visible proposal is waiting for the person. No value has changed.', { proposal: description })
  }
  const tools: Record<string, WebMcpTool> = {
    get_filing_requirements: { name: 'get_filing_requirements', title: 'Get filing requirements', description: 'List the supported fictional employee-return requirements.', annotations: readOnly, execute: () => result('Prepare the demo account, fictional BPA1, assets, liabilities, dependents, and human declaration.', { supportedYear: 2025, type: 'Normal PPh Orang Pribadi', boundary: 'Employee, zero-balance, fictional data only' }) },
    get_document_status: { name: 'get_document_status', title: 'Get document status', description: 'Read the current fictional BPA1 status.', annotations: readOnly, execute: () => result(state.documentName ? 'The fictional BPA1 is imported.' : 'No fictional BPA1 is imported.', { documentName: state.documentName, withholding: state.withholding }) },
    create_employee_return: { name: 'create_employee_return', title: 'Create employee return', description: 'Create or open the supported normal 2025 draft.', inputSchema: objectSchema({ year: { type: 'integer', const: 2025 } }, ['year']), execute: (input) => { if (input.year !== 2025) return result('Only tax year 2025 is supported.'); dispatch({ type: 'create-draft', year: 2025 }); return result('Created or opened the 2025 employee draft.') } },
    get_return_progress: { name: 'get_return_progress', title: 'Get return progress', description: 'Read completed and incomplete return steps.', annotations: readOnly, execute: () => result(`The return is ${state.status}.`, { ...progress(state), status: state.status, draft: state.draft }) },
    review_prefilled_data: { name: 'review_prefilled_data', title: 'Review prefilled data', description: 'List visible records that still need citizen review.', annotations: readOnly, execute: () => result('Returned current unreviewed records.', { withholding: state.withholding.reviewed ? [] : [state.withholding], assets: state.assets.filter((item) => !item.reviewed), liabilities: state.liabilities.filter((item) => !item.reviewed), scenarioClues: ['A fictional fixed deposit may be missing.', 'The vehicle financing balance is intentionally outdated.'] }) },
    get_section_data: { name: 'get_section_data', title: 'Get section data', description: 'Read one visible section of the fictional return.', annotations: readOnly, inputSchema: objectSchema({ section: { type: 'string', enum: ['withholding', 'assets', 'liabilities', 'dependents'] } }, ['section']), execute: (input) => { const sections = { withholding: state.withholding, assets: state.assets, liabilities: state.liabilities, dependents: { count: state.dependents, withholdingCount: state.withholdingDependents } }; const section = String(input.section) as keyof typeof sections; return section in sections ? result(`Returned ${section}.`, sections[section]) : result('Unknown or hidden section.') } },
    explain_field: { name: 'explain_field', title: 'Explain field', description: 'Explain a supported visible field and its fictional source.', annotations: readOnly, inputSchema: objectSchema({ field: { type: 'string' } }, ['field']), execute: (input) => result(`${String(input.field)} belongs to the supported fictional employee return. Confirm it against the visible source; this is not tax advice.`, { field: input.field, source: 'Visible synthetic profile, fictional BPA1, or citizen confirmation' }) },
    validate_return: { name: 'validate_return', title: 'Validate return', description: 'Run deterministic checks without signing or submitting.', annotations: readOnly, execute: () => result('Validation completed against current visible state.', validateReturn(state)) },
    explain_tax_result: { name: 'explain_tax_result', title: 'Explain tax result', description: 'Explain the current deterministic fictional balance.', annotations: readOnly, execute: () => { const validation = validateReturn(state); return result(validation.taxBalance === 0 ? 'Fictional tax due and withholding credit are equal, so the simulated balance is zero.' : 'The fictional return currently has a balance.', validation) } },
    confirm_prefilled_record: { name: 'confirm_prefilled_record', title: 'Propose record confirmation', description: 'Ask the person to confirm the imported BPA1.', inputSchema: objectSchema({ recordId: { type: 'string', const: 'withholding' } }, ['recordId']), execute: (input) => input.recordId === 'withholding' && state.documentName ? propose('withholding', 'Confirm the imported fictional BPA1 withholding record.', {}) : result('The requested visible record is unavailable or stale.') },
    add_asset: { name: 'add_asset', title: 'Propose asset addition', description: 'Propose a fictional asset for visible approval.', inputSchema: objectSchema({ description: { type: 'string' }, category: { type: 'string' }, institution: { type: 'string' }, yearEndValue: { type: 'number', minimum: 0 } }, ['description', 'yearEndValue']), execute: (input) => typeof input.description === 'string' && typeof input.yearEndValue === 'number' && input.yearEndValue >= 0 ? propose('asset-add', `Add ${input.description} at IDR ${input.yearEndValue.toLocaleString('id-ID')}.`, input) : result('Invalid asset proposal.') },
    update_asset: { name: 'update_asset', title: 'Propose asset update', description: 'Propose a year-end value for an existing visible asset.', inputSchema: objectSchema({ id: { type: 'string' }, yearEndValue: { type: 'number', minimum: 0 } }, ['id', 'yearEndValue']), execute: (input) => state.assets.some((item) => item.id === input.id) && typeof input.yearEndValue === 'number' && input.yearEndValue >= 0 ? propose('asset', `Change asset ${String(input.id)} to IDR ${input.yearEndValue.toLocaleString('id-ID')}.`, input) : result('Invalid or stale asset proposal.') },
    remove_asset: { name: 'remove_asset', title: 'Propose asset removal', description: 'Propose removing a visible fictional asset with a reason.', annotations: { destructiveHint: true }, inputSchema: objectSchema({ id: { type: 'string' }, reason: { type: 'string' } }, ['id', 'reason']), execute: (input) => state.assets.some((item) => item.id === input.id) && typeof input.reason === 'string' && input.reason.trim() ? propose('asset-remove', `Remove asset ${String(input.id)} because: ${input.reason}`, input) : result('Invalid or stale asset removal.') },
    add_liability: { name: 'add_liability', title: 'Propose liability addition', description: 'Propose a fictional liability for visible approval.', inputSchema: objectSchema({ description: { type: 'string' }, creditor: { type: 'string' }, yearEndBalance: { type: 'number', minimum: 0 } }, ['description', 'creditor', 'yearEndBalance']), execute: (input) => typeof input.description === 'string' && typeof input.creditor === 'string' && typeof input.yearEndBalance === 'number' && input.yearEndBalance >= 0 ? propose('liability-add', `Add ${input.description} with balance IDR ${input.yearEndBalance.toLocaleString('id-ID')}.`, input) : result('Invalid liability proposal.') },
    update_liability: { name: 'update_liability', title: 'Propose liability update', description: 'Propose a year-end balance for an existing visible liability.', inputSchema: objectSchema({ id: { type: 'string' }, yearEndBalance: { type: 'number', minimum: 0 } }, ['id', 'yearEndBalance']), execute: (input) => state.liabilities.some((item) => item.id === input.id) && typeof input.yearEndBalance === 'number' && input.yearEndBalance >= 0 ? propose('liability', `Change liability ${String(input.id)} to IDR ${input.yearEndBalance.toLocaleString('id-ID')}.`, input) : result('Invalid or stale liability proposal.') },
    remove_liability: { name: 'remove_liability', title: 'Propose liability removal', description: 'Propose removing a visible fictional liability with a reason.', annotations: { destructiveHint: true }, inputSchema: objectSchema({ id: { type: 'string' }, reason: { type: 'string' } }, ['id', 'reason']), execute: (input) => state.liabilities.some((item) => item.id === input.id) && typeof input.reason === 'string' && input.reason.trim() ? propose('liability-remove', `Remove liability ${String(input.id)} because: ${input.reason}`, input) : result('Invalid or stale liability removal.') },
    update_dependent_details: { name: 'update_dependent_details', title: 'Propose dependent count', description: 'Propose a fictional dependent count from zero to three.', inputSchema: objectSchema({ count: { type: 'integer', minimum: 0, maximum: 3 } }, ['count']), execute: (input) => Number.isInteger(input.count) && Number(input.count) >= 0 && Number(input.count) <= 3 ? propose('dependents', `Change dependents from ${state.dependents} to ${String(input.count)}.`, input) : result('Dependent count must be an integer from zero to three.') },
    open_review_summary: { name: 'open_review_summary', title: 'Open review summary', description: 'Navigate the visible portal to its review summary.', execute: () => { dispatch({ type: 'navigate', view: 'review' }); return result('Opened the visible review summary.') } },
  }
  const names = getAvailableToolNames(state)
  names.forEach((name) => {
    const tool = tools[name]
    api.registerTool({ ...tool, execute: (input) => registration === activeRegistration ? tool.execute(input) : result('This tool call is stale. Refresh the available tools and try again.') })
  })
  return () => names.forEach((name) => api.unregisterTool(name))
}
