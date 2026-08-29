import { createInitialState } from './tax'
import { getAvailableToolNames } from './webmcp'

describe('WebMCP registration states', () => {
  it('exposes no taxpayer tools before demo login', () => {
    expect(getAvailableToolNames(createInitialState())).toEqual([])
  })

  it('exposes document and requirement tools after login', () => {
    const state = { ...createInitialState(), loggedIn: true }
    expect(getAvailableToolNames(state)).toEqual(
      expect.arrayContaining(['get_filing_requirements', 'get_document_status']),
    )
  })

  it('removes mutation tools at declaration', () => {
    const state = { ...createInitialState(), loggedIn: true, status: 'declaration' as const }
    const names = getAvailableToolNames(state)
    expect(names).toContain('explain_tax_result')
    expect(names).not.toContain('update_asset')
    expect(names).not.toContain('update_liability')
  })
})
