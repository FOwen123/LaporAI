import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createSampleBpa1Pdf, extractBpa1FromPdf, extractSupportingEvidenceFromPdf } from './lib/pdf'
import {
  DEMO_CREDENTIALS,
  FILING_STEPS,
  TAX_EXCHANGE_RATE,
  bpa1MatchesProfile,
  createBankStatementText,
  createBpa1Text,
  createFinancingStatementText,
  createSyntheticProfile,
  filingReducer,
  getDocumentFindings,
  getFilingNavigationBlocker,
  getFilingStepBlocker,
  parseBpa1Text,
  parseSupportingEvidenceText,
  progress,
  restoreState,
  rupiah,
  usd,
  validateReturn,
  type FilingState,
  type FilingStep,
  type Proposal,
  type SupportingEvidence,
  type WithholdingRecord,
} from './lib/tax'
import { getRegisteredToolHelp, registerWebMcpTools, type AgentPdfUpload, type ToolResult, type WebMcpToolHelp } from './lib/webmcp'

const STORAGE_KEY = 'laporai-state'
const filingStepLabels: Record<FilingStep, string> = { documents: 'Documents', income: 'Employment income', assets: 'Assets', liabilities: 'Liabilities', family: 'Family and PTKP', review: 'Review', declaration: 'Declaration' }
const legalSources = [
  ['Coretaxpedia: Individual Annual Return', 'https://www.pajak.go.id/coretaxpedia/lapor-spt-tahunan-orang-pribadi'],
  ['DJP employee filing guide (PDF)', 'https://www.pajak.go.id/sites/default/files/2025-12/Panduan%20SPT%20OP%20Karyawan_2025.pdf'],
  ['PER-11/PJ/2025 reporting regulation', 'https://jdih.kemenkeu.go.id/dok/per-11pj2025/overview'],
  ['2025 individual annual return form', 'https://www.pajak.go.id/index.php/id/formulir-pajak/formulir-spt-tahunan-wajib-pajak-orang-pribadi'],
  ['Kurs Pajak, the weekly tax exchange rate (KMK)', TAX_EXCHANGE_RATE.url],
]

function Login({ onLogin }: { onLogin: (state?: FilingState['profile']) => void }) {
  const [email, setEmail] = useState<string>(DEMO_CREDENTIALS.username)
  const [password, setPassword] = useState<string>(DEMO_CREDENTIALS.password)
  const [name, setName] = useState('Ayu Larasati')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (/^\d{16}$/.test(email.trim())) return setError('Use the sample credentials below. Never enter a real NIK or NPWP.')
    if (email !== DEMO_CREDENTIALS.username || password !== DEMO_CREDENTIALS.password) {
      return setError('Use the public credentials shown below.')
    }
    onLogin()
  }

  return (
    <main className="login-page">
      <section className="login-intro" aria-labelledby="login-title">
        <img className="brand-logo" src="/assets/laporai-logo-v2.svg" alt="LaporAI logo" />
        <span className="chip">Unofficial demo, fictional data</span>
        <h1 id="login-title">LaporAI</h1>
        <p className="lead">A cooperative tax-filing prototype where a person and a browser agent review the same visible return.</p>
        <div className="safety-note"><strong>No real taxpayer data.</strong> Everything stays in this browser, and reset removes the draft.</div>
      </section>
      <section className="login-panel" aria-labelledby="demo-login-title">
        <h2 id="demo-login-title">Open the Coretax workspace</h2>
        <p>Use the public credentials below. Do not enter personal tax information.</p>
        <form onSubmit={submit}>
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="primary wide" type="submit">Continue to workspace</button>
        </form>
        <dl className="credentials"><div><dt>Email</dt><dd>{DEMO_CREDENTIALS.username}</dd></div><div><dt>Password</dt><dd>{DEMO_CREDENTIALS.password}</dd></div></dl>
        <div className="divider"><span>or</span></div>
        <div className="synthetic">
          <label>Taxpayer name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <button className="secondary wide" onClick={() => onLogin(createSyntheticProfile(name))}>Create synthetic taxpayer</button>
        </div>
      </section>
    </main>
  )
}

const statusChips: Record<FilingState['status'], { label: string; tone: string }> = {
  ready: { label: 'Not started', tone: 'chip-quiet' },
  editing: { label: 'In progress', tone: 'chip-info' },
  validated: { label: 'Validated', tone: 'chip-ok' },
  declaration: { label: 'Awaiting you', tone: 'chip-todo' },
  filed: { label: 'Filed', tone: 'chip-ok' },
}

function StatusChip({ state }: { state: FilingState }) {
  const { label, tone } = statusChips[state.status]
  return <span className={`chip ${tone}`}>{label}</span>
}

/** Whether this browser exposes agent tools at all. State reads as text and shape, not colour alone. */
function McpStatus() {
  const connected = Boolean(document.modelContext)
  const dialog = useRef<HTMLDialogElement>(null)
  const [tools, setTools] = useState<WebMcpToolHelp[]>([])
  const close = () => typeof dialog.current?.close === 'function' ? dialog.current.close() : dialog.current?.removeAttribute('open')
  const open = () => {
    setTools(getRegisteredToolHelp())
    if (typeof dialog.current?.showModal === 'function') dialog.current.showModal()
    else dialog.current?.setAttribute('open', '')
  }
  return <>
    <button type="button" className={connected ? 'mcp-status connected' : 'mcp-status'} aria-haspopup="dialog" onClick={open}>
      <span className="dot" aria-hidden="true" />
      <strong>WebMCP</strong>
      <span className="state">{connected ? 'connected' : 'not detected'}</span>
    </button>
    <dialog ref={dialog} className="tools-dialog" aria-labelledby="tools-dialog-title" onCancel={close}>
      <header><div><h2 id="tools-dialog-title">Available WebMCP tools</h2><p>Tools update with the current filing state.</p></div><button type="button" className="icon-remove" aria-label="Close WebMCP tools" onClick={close}>×</button></header>
      {tools.length ? <ul>{tools.map((tool) => <li key={tool.name}><div><code>{tool.name}</code><strong>{tool.title}</strong></div><p>{tool.description}</p></li>)}</ul> : <p className="tools-empty">No WebMCP tools are available in the current page state.</p>}
    </dialog>
  </>
}

function Overview({ state, onStartFiling }: { state: FilingState; onStartFiling: () => void }) {
  const steps = progress(state)
  const next = !state.documentName ? 'Add tax documents' : 'Continue reviewing the return'
  return <section className="page-stack">
    <div className="page-heading">
      <div>
        <p className="page-context">Tax year 2025, individual return</p>
        <h2>Annual tax return</h2>
        <p>Complete an employee zero-balance annual tax return with help from your browser agent.</p>
      </div>
      <StatusChip state={state} />
    </div>
    <div className="panel progress-block">
      <div><strong>{steps.complete} of {steps.total} steps complete</strong><span>{Math.round(steps.complete / steps.total * 100)}%</span></div>
      <progress max={steps.total} value={steps.complete} />
    </div>
    <div className="directive">
      <div>
        <h3>{next}</h3>
        <p>The page and its agent tools update together, so an agent only sees the actions that are valid right now.</p>
      </div>
      <button className="primary" onClick={onStartFiling}>Open tax return</button>
    </div>
    <section className="panel">
      <h3>Supported filing scope</h3>
      <div className="facts">
        <div><span>Return type</span><strong>Normal annual return</strong></div>
        <div><span>Taxpayer</span><strong>Employee only</strong></div>
        <div><span>Expected result</span><strong>Rp0 balance</strong></div>
      </div>
      <p className="muted">Business income, foreign income, corrections, refunds, and payment are outside the supported filing scope.</p>
    </section>
  </section>
}

type AppProps = { state: FilingState; dispatch: React.Dispatch<Parameters<typeof filingReducer>[1]> }
type AddRecordKind = 'asset' | 'liability'

/**
 * One downloadable sample. The visible label stays "Download PDF" so the three
 * buttons share a width and hold a single right edge; the accessible name adds
 * the document title, which the visible label alone would not distinguish.
 */
function DocumentRow({ title, detail, onDownload, onLoad, loadLabel, loadDisabled }: {
  title: string
  detail: string
  onDownload: () => void
  onLoad: () => void
  loadLabel: string
  loadDisabled?: boolean
}) {
  return <li className="document-row">
    <span className="document-icon" aria-hidden="true">PDF</span>
    <span className="document-meta">
      <strong>{title}</strong>
      <small>{detail}</small>
      <button type="button" className="link-button" disabled={loadDisabled} onClick={onLoad}>{loadLabel}</button>
    </span>
    <button type="button" className="secondary" aria-label={`Download PDF: ${title}`} onClick={onDownload}>Download PDF</button>
  </li>
}

function Documents({ state, dispatch }: AppProps) {
  const locked = state.status === 'declaration' || state.status === 'filed'
  const [reading, setReading] = useState(false)
  const [record, setRecord] = useState<WithholdingRecord | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [supportingRecord, setSupportingRecord] = useState<SupportingEvidence | null>(null)
  const [supportingFileName, setSupportingFileName] = useState('')
  const [supportingError, setSupportingError] = useState('')
  const sampleText = createBpa1Text(state.profile)
  const bankText = createBankStatementText(state.profile)
  const financingText = createFinancingStatementText(state.profile)
  const download = (text: string, name: string) => {
    const url = URL.createObjectURL(new Blob([createSampleBpa1Pdf(text)], { type: 'application/pdf' }))
    const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url)
  }
  const selectFile = async (file?: File) => {
    if (!file) return
    setRecord(null); setFileName(''); setError(''); setReading(true)
    try {
      const extracted = await extractBpa1FromPdf(file)
      if (!bpa1MatchesProfile(extracted, state.profile)) throw new Error('This BPA1 does not match this taxpayer. Download a new BPA1 for the active profile.')
      setRecord(extracted); setFileName(file.name); setError('')
    }
    catch (reason) { setRecord(null); setError(reason instanceof Error ? reason.message : 'The PDF could not be read.') }
    finally { setReading(false) }
  }
  const selectSupportingFile = async (file?: File) => {
    if (!file) return
    setSupportingRecord(null); setSupportingFileName(''); setSupportingError(''); setReading(true)
    try {
      const extracted = await extractSupportingEvidenceFromPdf(file)
      if (extracted.taxpayerName !== state.profile.name || extracted.taxpayerId !== state.profile.taxId) throw new Error('This supporting document does not match this taxpayer. Download a new sample for the active profile.')
      setSupportingRecord(extracted); setSupportingFileName(file.name)
    }
    catch (reason) { setSupportingError(reason instanceof Error ? reason.message : 'The PDF could not be read.') }
    finally { setReading(false) }
  }
  return <section className="page-stack" data-agent-target="document-center">
    <div className="page-heading">
      <div>
        <p className="page-context">Step 1</p>
        <h2 tabIndex={-1} data-agent-focus>Tax documents</h2>
        <p>Import an annual income-tax withholding certificate (BPA1) and the supporting records used by this return. Raw PDF bytes stay in memory and are never saved.</p>
      </div>
      <span className="chip chip-ok">Local processing only</span>
    </div>
    {locked && <p className="notice notice-info">This return is read-only. Reset the data to start another filing.</p>}
    <div className="document-pack">
      <section className="panel document-panel">
        <div className="section-head">
          <div><div><h3>Annual income-tax withholding certificate (BPA1)</h3><p>Issued by your employer. Comparable in purpose to a U.S. Form W-2.</p></div></div>
        </div>
        <ul className="document-list">
          <DocumentRow
            title="BPA1 sample"
            detail={`${state.profile.name}, PT Nusantara Teknologi, January to December 2025.`}
            onDownload={() => download(sampleText, 'LaporAI-BPA1-SAMPLE.pdf')}
            onLoad={() => dispatch({ type: 'import-withholding', record: parseBpa1Text(sampleText), actor: 'You', documentName: 'LaporAI-BPA1-SAMPLE.pdf' })}
            loadLabel="Import BPA1 sample"
            loadDisabled={locked || reading || state.documentName === 'LaporAI-BPA1-SAMPLE.pdf'}
          />
        </ul>
        <div className="document-status">
          {state.documentName && <p className="notice notice-ok"><span><strong>Imported: {state.documentName}.</strong>{!locked && ' Importing another supported file replaces it.'}</span></p>}
        </div>
        <fieldset className="upload-field" disabled={locked || reading}>
          <label className="file-field" htmlFor="bpa1-file">
            Choose a BPA1 PDF
            <span className="hint">Text-based PDF, maximum 2 MB. Never upload a real tax document.</span>
            <input id="bpa1-file" type="file" accept="application/pdf,.pdf" onChange={(event) => void selectFile(event.target.files?.[0])} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          {reading && <div className="skeleton-rows" role="status"><span className="muted">Reading PDF…</span><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>}
          {record && <section className="confirm-panel" aria-labelledby="extraction-title">
            <div className="section-head">
              <div><div><h3 id="extraction-title">Confirm before import</h3><p>Extracted from {fileName}</p></div></div>
              <span className="chip chip-todo">Needs your check</span>
            </div>
            <dl className="record-grid">
              <div><dt>Taxpayer</dt><dd>{record.taxpayerName}</dd></div>
              <div><dt>Tax ID</dt><dd>{record.taxpayerId}</dd></div>
              <div><dt>Employer</dt><dd>{record.employer}</dd></div>
              <div><dt>Period</dt><dd>{record.period}</dd></div>
              <div><dt>Gross income</dt><dd>{rupiah(record.grossIncome)}</dd></div>
              <div><dt>Deductions</dt><dd>{rupiah(record.deductions)}</dd></div>
              <div><dt>Net income</dt><dd>{rupiah(record.netIncome)}</dd></div>
              <div><dt>Tax withheld</dt><dd>{rupiah(record.taxWithheld)}</dd></div>
            </dl>
            <button className="primary" onClick={() => dispatch({ type: 'import-withholding', record, actor: 'You', documentName: fileName })}>Import record</button>
          </section>}
        </fieldset>
      </section>
      <section className="panel document-panel">
        <div className="section-head">
          <div><div><h3>Supporting documents</h3><p>Use these records to check assets and liabilities against the return.</p></div></div>
        </div>
        <ul className="document-list">
          <DocumentRow
            title="Bank statement sample"
            detail={`${state.profile.name}, fixed deposit balance at 31 December 2025.`}
            onDownload={() => download(bankText, 'LaporAI-BANK-SAMPLE.pdf')}
            onLoad={() => dispatch({ type: 'import-supporting-evidence', evidence: parseSupportingEvidenceText(bankText), actor: 'You', documentName: 'LaporAI-BANK-SAMPLE.pdf' })}
            loadLabel="Import bank statement sample"
            loadDisabled={locked || reading || state.supportingEvidence.some((record) => record.kind === 'fixed-deposit')}
          />
          <DocumentRow
            title="Financing statement sample"
            detail={`${state.profile.name}, vehicle-financing balance at 31 December 2025.`}
            onDownload={() => download(financingText, 'LaporAI-FINANCING-SAMPLE.pdf')}
            onLoad={() => dispatch({ type: 'import-supporting-evidence', evidence: parseSupportingEvidenceText(financingText), actor: 'You', documentName: 'LaporAI-FINANCING-SAMPLE.pdf' })}
            loadLabel="Import financing statement sample"
            loadDisabled={locked || reading || state.supportingEvidence.some((record) => record.kind === 'vehicle-financing')}
          />
        </ul>
        <div className="document-status">
          {state.supportingEvidence.map((evidence) => <p className="notice notice-ok" key={evidence.kind}><span>Imported supporting document: {evidence.source}.</span></p>)}
        </div>
        <fieldset className="upload-field" disabled={locked || reading}>
          <label className="file-field" htmlFor="supporting-file">
            Choose a supporting PDF
            <span className="hint">Bank statement or financing statement, maximum 2 MB.</span>
            <input id="supporting-file" type="file" accept="application/pdf,.pdf" onChange={(event) => void selectSupportingFile(event.target.files?.[0])} />
          </label>
          {supportingError && <p className="error" role="alert">{supportingError}</p>}
          {supportingRecord && <section className="confirm-panel" aria-labelledby="supporting-extraction-title">
            <div className="section-head"><div><div><h3 id="supporting-extraction-title">Confirm supporting record</h3><p>Extracted from {supportingFileName}</p></div></div><span className="chip chip-todo">Needs your check</span></div>
            <dl className="record-grid">
              <div><dt>Taxpayer</dt><dd>{supportingRecord.taxpayerName}</dd></div>
              <div><dt>Tax ID</dt><dd>{supportingRecord.taxpayerId}</dd></div>
              <div><dt>Record</dt><dd>{supportingRecord.kind === 'fixed-deposit' ? 'Fixed deposit' : 'Vehicle financing'}</dd></div>
              <div><dt>Institution</dt><dd>{supportingRecord.institution}</dd></div>
              <div><dt>As of</dt><dd>31 December 2025</dd></div>
              <div><dt>Amount</dt><dd>{rupiah(supportingRecord.amount)}</dd></div>
            </dl>
            <button className="primary" onClick={() => { dispatch({ type: 'import-supporting-evidence', evidence: supportingRecord, actor: 'You', documentName: supportingFileName }); setSupportingRecord(null) }}>Import supporting record</button>
          </section>}
        </fieldset>
      </section>
    </div>
  </section>
}

/**
 * Rupiah entry. Deliberately a text input rather than type="number": a number
 * input rewrites its value on wheel and arrow keys, cannot group thousands, and
 * turns a cleared field into a committed zero. Grouping is applied only while
 * the field is idle, so reformatting never fights the caret mid-edit.
 */
function AmountField({ label, value, usdId, onChange }: {
  label: string; value: number; usdId: string; onChange: (next: number) => void
}) {
  const [typed, setTyped] = useState<string | null>(null)
  return <label className="amount-field">
    {label}
    <span className="amount-input">
      <span className="prefix" aria-hidden="true">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-describedby={usdId}
        value={typed ?? value.toLocaleString('id-ID')}
        onFocus={() => setTyped(String(value))}
        onBlur={() => setTyped(null)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, 15)
          setTyped(digits)
          if (digits) onChange(Number(digits))
        }}
      />
    </span>
    <small className="amount-usd" id={usdId}>≈ {usd(value)}</small>
  </label>
}

function RecordRow({ title, meta, value, reviewed, onReview, edit, onRemove, proposal }: {
  title: string; meta: string; value: string; reviewed: boolean; onReview: () => void
  edit?: ReactNode; onRemove?: () => void; proposal?: ReactNode
}) {
  return <div className="record-row">
    <div className="record-main"><strong>{title}</strong><span>{meta}</span></div>
    <div className="record-money">
      <div className="money-row">
        {edit ?? <span className="money">{value}</span>}
      </div>
    </div>
    <div className="record-controls">
      {onRemove && <button type="button" className="icon-remove" aria-label={`Remove ${title}`} title={`Remove ${title}`} onClick={onRemove}>×</button>}
      {reviewed
        ? <span className="review-control reviewed" role="status" aria-label={`${title} reviewed`} title="Reviewed">✓</span>
        : <button type="button" className="review-control" aria-label={`Mark ${title} as reviewed`} title="Mark reviewed" onClick={onReview}>✓</button>}
    </div>
    {proposal}
  </div>
}

/** Which visible record a pending proposal belongs beside. */
function proposalAnchor(proposal: Proposal | null): { section: 'withholding' | 'assets' | 'liabilities' | 'family'; recordId?: string } | null {
  if (!proposal) return null
  const recordId = typeof proposal.payload.id === 'string' ? proposal.payload.id : undefined
  if (proposal.kind === 'withholding') return { section: 'withholding' }
  if (proposal.kind === 'dependents') return { section: 'family' }
  if (proposal.kind.startsWith('asset')) return { section: 'assets', recordId }
  if (proposal.kind.startsWith('liability')) return { section: 'liabilities', recordId }
  return null
}

function AgentProposal({ state, dispatch, docked = false }: AppProps & { docked?: boolean }) {
  if (!state.pendingProposal) return null
  return <aside className={docked ? 'proposal proposal-docked' : 'proposal'} aria-live="polite" data-agent-target="agent-proposal">
    <span className="proposal-label">Agent proposes</span>
    <strong>{state.pendingProposal.description}</strong>
    <p>Nothing changes until you approve it.</p>
    <div className="proposal-actions">
      <button className="primary" data-agent-focus onClick={() => dispatch({ type: 'approve-proposal' })}>Approve agent change</button>
      <button className="secondary" onClick={() => dispatch({ type: 'reject-proposal' })}>Reject change</button>
    </div>
  </aside>
}

function AddRecordDialog({ kind, onClose, onAdd }: {
  kind: AddRecordKind
  onClose: () => void
  onAdd: (name: string, amount: number) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const title = kind === 'asset' ? 'Add asset' : 'Add liability'

  useEffect(() => {
    if (!dialog.current?.open && typeof dialog.current?.showModal === 'function') dialog.current.showModal()
    else dialog.current?.setAttribute('open', '')
  }, [])

  return <dialog
    ref={dialog}
    className="record-dialog"
    aria-labelledby={`${kind}-dialog-title`}
    data-agent-target={`${kind}-form`}
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
  >
    <form onSubmit={(event) => { event.preventDefault(); onAdd(name.trim(), Number(amount)); onClose() }}>
      <div className="dialog-heading">
        <div><h3 id={`${kind}-dialog-title`}>{title}</h3><p>Enter the record as it stood on 31 December 2025.</p></div>
      </div>
      <div className="dialog-fields">
        <label>{kind === 'asset' ? 'Asset name' : 'Liability name'}<input data-agent-focus autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Amount (Rp)<span className="amount-input"><span className="prefix" aria-hidden="true">Rp</span><input aria-label="Amount (Rp)" required inputMode="numeric" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, '').slice(0, 15))} /></span></label>
      </div>
      <div className="dialog-actions">
        <button type="button" className="secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="primary" disabled={!name.trim() || !amount}>{title}</button>
      </div>
    </form>
  </dialog>
}

function AnnualReturn({ state, dispatch, step, addDialog, onOpenAddDialog }: AppProps & {
  step: 'income' | 'assets' | 'liabilities' | 'family'
  addDialog: AddRecordKind | null
  onOpenAddDialog: (kind: AddRecordKind | null) => void
}) {
  const locked = state.status === 'declaration' || state.status === 'filed'
  if (!state.draft) return null

  const anchor = proposalAnchor(state.pendingProposal)
  const documentFindings = getDocumentFindings(state)
  const assetFinding = documentFindings.find((finding) => finding.kind.startsWith('asset'))
  const liabilityFinding = documentFindings.find((finding) => finding.kind.startsWith('liability'))
  const sectionProposal = (section: string, recordId?: string) =>
    anchor?.section === section && anchor.recordId === recordId ? <AgentProposal state={state} dispatch={dispatch} /> : null

  return <section className="page-stack" data-agent-target={`${step}-step`}>
    {locked && <p className="notice notice-info">This return is read-only. Reset the data to start another filing.</p>}
    <fieldset className="page-stack bare" disabled={locked}>
      {step === 'income' && <>
        <section className="return-section">
          <div className="section-head">
            <div><span className="section-index" aria-hidden="true">01</span><div><h3>Identity and filing status</h3><p>Source: Taxpayer profile</p></div></div>
            <span className="chip chip-ok">Complete</span>
          </div>
          <dl className="record-grid">
            <div><dt>Name</dt><dd>{state.profile.name}</dd></div>
            <div><dt>Tax ID</dt><dd>{state.profile.taxId}</dd></div>
            <div><dt>Filing model</dt><dd>Normal</dd></div>
            <div><dt>Marital status</dt><dd>{state.profile.maritalStatus}</dd></div>
          </dl>
        </section>

        <section className="return-section">
          <div className="section-head">
            <div><span className="section-index" aria-hidden="true">02</span><div><h3 tabIndex={-1} data-agent-focus>Employment income and withholding</h3><p>Source: {state.withholding.source}</p></div></div>
          </div>
          {state.documentName
            ? <div className="record-list"><RecordRow
                title={state.withholding.employer}
                meta={`${state.withholding.period} · BPA1`}
                value={rupiah(state.withholding.taxWithheld)}
                reviewed={state.withholding.reviewed}
                onReview={() => dispatch({ type: 'review-withholding', actor: 'You' })}
                proposal={sectionProposal('withholding')}
              /></div>
            : <p className="empty">Import the BPA1 on the Documents step.</p>}
          <div className="calc-strip">
            <div><span>Net income</span><strong>{rupiah(state.withholding.netIncome)}</strong></div>
            <div><span>Tax due</span><strong>{rupiah(state.withholding.taxDue)}</strong></div>
            <div><span>Tax credit</span><strong>{rupiah(state.withholding.taxWithheld)}</strong></div>
            <div className="total"><span>Balance</span><strong>{rupiah(Math.max(0, state.withholding.taxDue - state.withholding.taxWithheld))}</strong></div>
          </div>
          <small className="rate-note">US$1 = {rupiah(TAX_EXCHANGE_RATE.idrPerUsd)} · Source: <a href={TAX_EXCHANGE_RATE.url} target="_blank" rel="noreferrer" title={`Kurs Pajak, the weekly tax exchange rate. Valid ${TAX_EXCHANGE_RATE.period}.`}>{TAX_EXCHANGE_RATE.document}</a></small>
        </section>
      </>}

      {step === 'assets' &&
        <section className="return-section">
          <div className="section-head">
            <div><span className="section-index" aria-hidden="true">03</span><div><h3 tabIndex={-1} data-agent-focus>Assets</h3><p>Values at 31 December 2025</p></div></div>
            <button className="secondary" onClick={() => onOpenAddDialog('asset')}>Add asset</button>
          </div>
          {assetFinding && <p className="notice notice-warn"><span>{assetFinding.description}</span></p>}
          {sectionProposal('assets')}
          <div className="record-list">{state.assets.map((asset) => <RecordRow
            key={asset.id}
            title={asset.description}
            meta={`${asset.category} · ${asset.institution}`}
            value={rupiah(asset.yearEndValue)}
            reviewed={asset.reviewed}
            onReview={() => dispatch({ type: 'review-asset', id: asset.id, actor: 'You' })}
            onRemove={() => dispatch({ type: 'remove-asset', id: asset.id, actor: 'You' })}
            proposal={sectionProposal('assets', asset.id)}
            edit={<AmountField label="Year-end value" value={asset.yearEndValue} usdId={`${asset.id}-usd`} onChange={(yearEndValue) => dispatch({ type: 'update-asset', id: asset.id, yearEndValue, actor: 'You' })} />}
          />)}</div>
        </section>}

      {step === 'liabilities' &&
        <section className="return-section">
          <div className="section-head">
            <div><span className="section-index" aria-hidden="true">04</span><div><h3 tabIndex={-1} data-agent-focus>Liabilities</h3><p>Balances at 31 December 2025</p></div></div>
            <button className="secondary" onClick={() => onOpenAddDialog('liability')}>Add liability</button>
          </div>
          {liabilityFinding && <p className="notice notice-warn"><span>{liabilityFinding.description}</span></p>}
          {sectionProposal('liabilities')}
          <div className="record-list">{state.liabilities.map((item) => <RecordRow
            key={item.id}
            title={item.description}
            meta={`${item.creditor} · ${item.country}`}
            value={rupiah(item.yearEndBalance)}
            reviewed={item.reviewed}
            onReview={() => dispatch({ type: 'review-liability', id: item.id, actor: 'You' })}
            onRemove={() => dispatch({ type: 'remove-liability', id: item.id, actor: 'You' })}
            proposal={sectionProposal('liabilities', item.id)}
            edit={<AmountField label="Year-end balance" value={item.yearEndBalance} usdId={`${item.id}-usd`} onChange={(yearEndBalance) => dispatch({ type: 'update-liability', id: item.id, yearEndBalance, actor: 'You' })} />}
          />)}</div>
        </section>}

      {step === 'family' &&
        <section className="return-section">
          <div className="section-head">
            <div><span className="section-index" aria-hidden="true">05</span><div><h3 tabIndex={-1} data-agent-focus>Family, tax-free allowance (PTKP), and other sections</h3><p>Required zero-value groups stay visible</p></div></div>
          </div>
          <label className="compact-field" data-agent-target="dependents-picker">Dependents<span className="select-control"><select data-agent-focus value={state.dependents} onChange={(event) => dispatch({ type: 'set-dependents', count: Number(event.target.value), actor: 'You' })}>{[0, 1, 2, 3].map((count) => <option key={count}>{count}</option>)}</select></span></label>
          {sectionProposal('family')}
          <dl className="zero-groups">
            <div><dt>Other income</dt><dd>{rupiah(0)}</dd></div>
            <div><dt>Income tax installments (PPh Pasal 25)</dt><dd>{rupiah(0)}</dd></div>
            <div><dt>Tax payments</dt><dd>{rupiah(0)}</dd></div>
            <div><dt>Attachments</dt><dd>None required</dd></div>
          </dl>
          <p className="muted">Correction, refund, business, and foreign-income branches are outside the supported filing scope.</p>
        </section>}
    </fieldset>
    {addDialog && <AddRecordDialog
      kind={addDialog}
      onClose={() => onOpenAddDialog(null)}
      onAdd={(name, amount) => dispatch(addDialog === 'asset'
        ? { type: 'add-asset', actor: 'You', asset: { id: `asset-${Date.now()}`, category: 'Other asset', description: name, institution: 'Personal ownership', country: 'Indonesia', acquiredYear: 2025, yearEndValue: amount, reviewed: false } }
        : { type: 'add-liability', actor: 'You', liability: { id: `liability-${Date.now()}`, description: name, creditor: 'Not specified', country: 'Indonesia', incurredYear: 2025, yearEndBalance: amount, reviewed: false } }
      )}
    />}
  </section>
}

function Review({ state, dispatch, step, onNavigateStep }: AppProps & { step: 'review' | 'declaration'; onNavigateStep: (step: FilingStep) => void }) {
  const validation = validateReturn(state)
  const [acknowledged, setAcknowledged] = useState(false)
  if (state.status === 'filed') return <Receipt state={state} />
  if (step === 'declaration') return <section className="page-stack" data-agent-target="declaration-step">
    <div className="page-heading">
      <div><p className="page-context">Final step</p><h2 tabIndex={-1} data-agent-focus>Declaration</h2><p>Review the declaration and complete the human-only filing action.</p></div>
      <StatusChip state={state} />
    </div>
    {state.status === 'declaration' ? <section className="declaration">
      <div><span className="chip chip-danger">Human-only control</span><h3>I declare this return is ready</h3></div>
      <p>Only you can complete this action. No data is sent to DJP or any server.</p>
      <label className="checkbox"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> I have reviewed the return and understand no government submission will occur.</label>
      <button className="danger" disabled={!acknowledged} onClick={() => dispatch({ type: 'file-return' })}>Sign and file return</button>
    </section> : <section className="directive">
      <div><h3>{state.status === 'validated' ? 'Open your declaration' : 'Complete validation first'}</h3><p>{state.status === 'validated' ? 'An agent cannot accept, sign, or submit this declaration.' : 'Return to review and clear every blocking validation check.'}</p></div>
      {state.status === 'validated'
        ? <button className="primary" onClick={() => dispatch({ type: 'open-declaration' })}>Open declaration</button>
        : <button className="secondary" onClick={() => onNavigateStep('review')}>Back to review</button>}
    </section>}
  </section>
  const awaitingValidation = state.status !== 'declaration' && state.status !== 'validated'
  return <section className="page-stack" data-agent-target="review-summary">
    <div className="page-heading">
      <div><p className="page-context">Step 6</p><h2 tabIndex={-1} data-agent-focus>Review and validate</h2><p>Validation checks compare the visible records. This is not tax advice.</p></div>
      <StatusChip state={state} />
    </div>
    <section className="result-panel">
      <p>Amount payable</p>
      <strong>{rupiah(validation.taxBalance)}</strong>
      <span>Tax due {rupiah(state.withholding.taxDue)} less credit {rupiah(state.withholding.taxWithheld)}</span>
    </section>
    <section className="panel">
      <h3>Validation checks</h3>
      {!validation.errors.length && !validation.warnings.length && <p className="notice notice-ok"><span>All validation checks pass.</span></p>}
      <div className="check-list">
        {validation.errors.map((issue) => <button key={issue.field} type="button" className="check check-blocking" onClick={() => onNavigateStep(issue.field === 'document' || issue.field === 'draft' ? 'documents' : issue.field.startsWith('asset') ? 'assets' : issue.field.startsWith('liability') ? 'liabilities' : issue.field === 'dependents' ? 'family' : 'income')}>
          <span className="chip chip-danger">Blocking</span><span>{issue.message}</span><span className="go">Go to record</span>
        </button>)}
        {validation.warnings.map((issue) => <div key={issue.field} className="check check-review">
          <span className="chip chip-todo">Review</span><span>{issue.message}</span><span />
        </div>)}
      </div>
      {awaitingValidation && <div className="panel-actions">
        <button className="primary" disabled={validation.errors.length > 0} onClick={() => dispatch({ type: 'validate' })}>Run return validation</button>
        {validation.errors.length > 0 && <span className="muted">Clear the blocking checks above to continue.</span>}
      </div>}
    </section>
    {state.status === 'validated' && <section className="directive">
      <div><h3>Ready for your declaration</h3><p>An agent cannot open, accept, sign, or submit the declaration.</p></div>
      <button className="primary" onClick={() => { dispatch({ type: 'open-declaration' }); onNavigateStep('declaration') }}>Open declaration</button>
    </section>}
    <details className="legal">
      <summary>Legal basis and guidance</summary>
      <p>Official terms are represented for educational demonstration only. References checked 30 August 2026.</p>
      <ul>{legalSources.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer">{label}</a></li>)}</ul>
    </details>
  </section>
}

function ActivityHistory({ state }: { state: FilingState }) {
  return <aside className="activity-rail" aria-labelledby="activity-title">
    <div><h2 id="activity-title">Activity history</h2><span>{state.activity.length}</span></div>
    {!state.activity.length ? <p>No human or agent changes yet.</p> : <ol aria-live="polite">{[...state.activity].reverse().map((item) => <li key={item.id}>
      <div><span className={item.actor === 'Agent' ? 'actor-agent' : 'actor-you'}>{item.actor}</span><time>{new Date(item.at).toLocaleTimeString()}</time></div>
      <p>{item.description}</p>
      {item.previous !== undefined && <small>{item.previous} → {item.next}</small>}
    </li>)}</ol>}
  </aside>
}

function FilingWorkspace({ state, dispatch, step, onNavigateStep, addDialog, onOpenAddDialog }: AppProps & {
  step: FilingStep
  onNavigateStep: (step: FilingStep) => void
  addDialog: AddRecordKind | null
  onOpenAddDialog: (kind: AddRecordKind | null) => void
}) {
  const index = FILING_STEPS.indexOf(step)
  const declarationReady = state.status === 'validated' || state.status === 'declaration' || state.status === 'filed'
  const previous = index > 0 ? FILING_STEPS[index - 1] : null
  const next = index < FILING_STEPS.length - 1 ? FILING_STEPS[index + 1] : null
  const nextBlocker = getFilingStepBlocker(state, step)
  const goNext = () => {
    if (!next || nextBlocker) return
    if (next === 'declaration' && state.status === 'validated') dispatch({ type: 'open-declaration' })
    onNavigateStep(next)
  }
  return <section className="filing-workspace">
    <header className="filing-progress" data-agent-target="filing-progress">
      <div className="filing-progress-heading"><div><span>Step {index + 1} of {FILING_STEPS.length}</span><h1>File tax return</h1></div><StatusChip state={state} /></div>
      <progress aria-label="Filing progress" max={FILING_STEPS.length} value={index + 1} />
      <ol>{FILING_STEPS.map((item) => { const blocker = getFilingNavigationBlocker(state, step, item); return <li key={item}><button type="button" aria-current={item === step ? 'step' : undefined} disabled={Boolean(blocker) || (item === 'declaration' && !declarationReady)} title={blocker ?? undefined} onClick={() => onNavigateStep(item)}>{filingStepLabels[item]}</button></li> })}</ol>
    </header>
    <div className="filing-layout">
      <div className="filing-page">
        {step === 'documents' && <Documents state={state} dispatch={dispatch} />}
        {(step === 'income' || step === 'assets' || step === 'liabilities' || step === 'family') && <AnnualReturn state={state} dispatch={dispatch} step={step} addDialog={addDialog} onOpenAddDialog={onOpenAddDialog} />}
        {(step === 'review' || step === 'declaration') && <Review state={state} dispatch={dispatch} step={step} onNavigateStep={onNavigateStep} />}
        <nav className="step-actions" aria-label="Filing step navigation">
          {previous ? <button className="secondary" onClick={() => onNavigateStep(previous)}>Previous: {filingStepLabels[previous]}</button> : <span />}
          {next && <div className="step-next">{nextBlocker && <span id={`step-blocker-${step}`}>{nextBlocker}</span>}<button className="primary" aria-describedby={nextBlocker ? `step-blocker-${step}` : undefined} disabled={Boolean(nextBlocker) || (next === 'declaration' && !declarationReady)} onClick={goNext}>Next: {filingStepLabels[next]}</button></div>}
        </nav>
      </div>
      <ActivityHistory state={state} />
    </div>
  </section>
}

function Receipt({ state }: { state: FilingState }) {
  return <section className="receipt">
    <div className="receipt-seal" aria-hidden="true">✓</div>
    <h3>Filing complete</h3>
    <p>No return was submitted to the Indonesian government.</p>
    <dl>
      <div><dt>Receipt</dt><dd>{state.receiptId}</dd></div>
      <div><dt>Tax year</dt><dd>2025</dd></div>
      <div><dt>Result</dt><dd>{rupiah(0)}</dd></div>
      <div><dt>Taxpayer</dt><dd>{state.profile.name}</dd></div>
    </dl>
  </section>
}

function Benchmark({ state, dispatch }: AppProps) {
  const active = state.benchmarkRuns.at(-1)?.finishedAt === null
  const modes = [
    ['manual', 'Manual', 'Visible UI controls'],
    ['browser-agent', 'Screen-operated agent', 'Pixels and clicks'],
    ['webmcp', 'WebMCP agent', 'Native, state-aware tools'],
  ] as const
  const summaries = modes.map(([mode, label, blurb]) => {
    const durations = state.benchmarkRuns.filter((run) => run.mode === mode && run.finishedAt !== null).map((run) => run.finishedAt! - run.startedAt).sort((a, b) => a - b)
    return { mode, label, blurb, runs: durations.length, median: durations.length >= 3 ? (durations[Math.floor((durations.length - 1) / 2)] + durations[Math.floor(durations.length / 2)]) / 2 : null }
  })
  return <section className="page-stack">
    <div className="page-heading"><div><p className="page-context">Evaluation</p><h2>Benchmark modes</h2><p>Compare interaction methods from the same test fixture. Record at least three runs before reporting a median.</p></div></div>
    <div className="mode-grid">{summaries.map((item) => <article key={item.mode} className="mode-card">
      <h3>{item.label}</h3>
      <p>{item.blurb}</p>
      {item.median === null
        ? <span className="median pending">{item.runs} of 3 runs recorded</span>
        : <span className="median">{`${(item.median / 1000).toFixed(1)} s median`}<small>from {item.runs} runs</small></span>}
      <button className="secondary" onClick={() => dispatch({ type: 'start-benchmark', mode: item.mode })} disabled={active}>Start {item.label} run</button>
    </article>)}</div>
    {active && <div className="benchmark-bar">
      <span>Run in progress. Complete the workflow, then finish the measurement.</span>
      <button className="primary" onClick={() => dispatch({ type: 'finish-benchmark' })}>Finish run</button>
    </div>}
    <div className="table-wrap">
      <table>
        <caption>Local benchmark log</caption>
        <thead><tr><th>Mode</th><th className="num">Duration</th><th className="num">Actions</th><th className="num">Errors</th><th className="num">Tool calls</th></tr></thead>
        <tbody>{state.benchmarkRuns.map((run) => <tr key={run.id}>
          <td>{modes.find(([mode]) => mode === run.mode)?.[1] ?? run.mode}</td>
          <td className="num">{run.finishedAt === null ? 'Running' : `${((run.finishedAt - run.startedAt) / 1000).toFixed(1)} s`}</td>
          <td className="num">{run.actions}</td>
          <td className="num">{run.errors}</td>
          <td className="num">{run.toolCalls}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <details className="legal">
      <summary>How to read these numbers</summary>
      <p>Fixture v{state.fixtureVersion}. Results describe these disclosed local runs only; they are not universal performance claims.</p>
      <p className="muted">Browser: {navigator.userAgent}</p>
    </details>
  </section>
}

export default function App() {
  const [state, dispatch] = useReducer(filingReducer, null, () => {
    try { return restoreState(localStorage.getItem(STORAGE_KEY)) } catch { return restoreState(null) }
  })
  const [filingStep, setFilingStep] = useState<FilingStep>(() => state.view === 'documents' ? 'documents' : state.view === 'review' ? (state.status === 'declaration' ? 'declaration' : 'review') : state.view === 'receipt' ? 'declaration' : 'documents')
  const [agentTarget, setAgentTarget] = useState<{ target: string; sequence: number } | null>(null)
  const [addDialog, setAddDialog] = useState<AddRecordKind | null>(null)
  const orientAgent = useCallback((target: string) => {
    setAgentTarget((current) => ({ target, sequence: (current?.sequence ?? 0) + 1 }))
  }, [])
  const runActive = state.benchmarkRuns.at(-1)?.finishedAt === null
  const trackedDispatch = useCallback((action: Parameters<typeof filingReducer>[1]) => {
    dispatch(action)
    if (runActive && action.type !== 'count-action' && action.type !== 'finish-benchmark') dispatch({ type: 'count-action' })
  }, [runActive])
  const navigateFilingStep = useCallback((step: FilingStep) => { setFilingStep(step); trackedDispatch({ type: 'navigate', view: 'return' }) }, [trackedDispatch])
  const setAgentFilingStep = useCallback((step: FilingStep) => setFilingStep(step), [])
  useEffect(() => { try { if (state.loggedIn) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); else localStorage.removeItem(STORAGE_KEY) } catch { /* Current session remains usable when storage is blocked. */ } }, [state])
  const openAgentControl = useCallback((control: 'asset' | 'liability' | 'dependents') => setAddDialog(control === 'dependents' ? null : control), [])
  const uploadAgentDocument = useCallback(async (upload: AgentPdfUpload): Promise<ToolResult> => {
    try {
      const binary = atob(upload.pdfBase64)
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
      const file = new File([bytes], upload.fileName, { type: 'application/pdf' })
      if (upload.documentType === 'bpa1') {
        const record = await extractBpa1FromPdf(file)
        if (!bpa1MatchesProfile(record, state.profile)) throw new Error('This BPA1 does not match the active taxpayer.')
        dispatch({ type: 'import-withholding', record, actor: 'Agent', documentName: upload.fileName })
      } else {
        const evidence = await extractSupportingEvidenceFromPdf(file)
        if (evidence.taxpayerName !== state.profile.name || evidence.taxpayerId !== state.profile.taxId) throw new Error('This supporting document does not match the active taxpayer.')
        dispatch({ type: 'import-supporting-evidence', evidence, actor: 'Agent', documentName: upload.fileName })
      }
      return { content: [{ type: 'text', text: `Imported ${upload.fileName} and opened its visible document status.` }], structuredContent: { documentType: upload.documentType, fileName: upload.fileName } }
    } catch (error) {
      return { content: [{ type: 'text', text: error instanceof Error ? error.message : 'The PDF could not be imported.' }], isError: true }
    }
  }, [state.profile])
  useEffect(() => registerWebMcpTools(state, dispatch, orientAgent, openAgentControl, uploadAgentDocument, filingStep, setAgentFilingStep), [state, orientAgent, openAgentControl, uploadAgentDocument, filingStep, setAgentFilingStep])
  useEffect(() => { if (state.view !== 'return' || state.status === 'declaration' || state.status === 'filed') setAddDialog(null) }, [state.view, state.status])
  useEffect(() => {
    if (state.view === 'documents') setFilingStep('documents')
    if (state.view === 'review') setFilingStep(state.status === 'declaration' ? 'declaration' : 'review')
    if (state.view === 'receipt') setFilingStep('declaration')
  }, [state.view, state.status])
  useEffect(() => {
    if (!agentTarget) return
    const target = document.querySelector<HTMLElement>(`[data-agent-target="${agentTarget.target}"]`)
    if (!target) return
    const focusTarget = target.querySelector<HTMLElement>('[data-agent-focus]') ?? target
    target.classList.add('agent-target-highlight')
    target.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
    focusTarget.focus({ preventScroll: true })
    if (focusTarget instanceof HTMLSelectElement) {
      try { focusTarget.showPicker?.() } catch { /* Focus is the fallback when programmatic opening is unavailable. */ }
    }
    const timeout = window.setTimeout(() => target.classList.remove('agent-target-highlight'), 1800)
    return () => { window.clearTimeout(timeout); target.classList.remove('agent-target-highlight') }
  }, [agentTarget])
  const login = (profile?: FilingState['profile']) => { sessionStorage.setItem('laporai-demo-session', 'active'); dispatch({ type: 'login', profile }) }
  if (!state.loggedIn) return <Login onLogin={login} />
  const reset = () => { localStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem('laporai-demo-session'); dispatch({ type: 'reset' }) }
  const views = {
    home: <Overview state={state} onStartFiling={() => navigateFilingStep('documents')} />,
    documents: <FilingWorkspace state={state} dispatch={trackedDispatch} step={filingStep} onNavigateStep={navigateFilingStep} addDialog={addDialog} onOpenAddDialog={setAddDialog} />,
    return: <FilingWorkspace state={state} dispatch={trackedDispatch} step={filingStep} onNavigateStep={navigateFilingStep} addDialog={addDialog} onOpenAddDialog={setAddDialog} />,
    review: <FilingWorkspace state={state} dispatch={trackedDispatch} step={filingStep} onNavigateStep={navigateFilingStep} addDialog={addDialog} onOpenAddDialog={setAddDialog} />,
    receipt: <FilingWorkspace state={state} dispatch={trackedDispatch} step={filingStep} onNavigateStep={navigateFilingStep} addDialog={addDialog} onOpenAddDialog={setAddDialog} />,
    benchmark: <Benchmark state={state} dispatch={trackedDispatch} />,
  }
  // The return view anchors a pending proposal beside the record it changes;
  // everywhere else it docks so an agent change is never hidden.
  const proposalStep = proposalAnchor(state.pendingProposal)?.section
  const anchored = state.view === 'return' && Boolean(state.draft?.posted) && (proposalStep === 'withholding' ? filingStep === 'income' : proposalStep === 'assets' ? filingStep === 'assets' : proposalStep === 'liabilities' ? filingStep === 'liabilities' : proposalStep === 'family' ? filingStep === 'family' : false)
  return <div className="app-shell">
    <header className="topbar">
      <div className="topbar-left">
        <a className="brand" href="#main" onClick={() => trackedDispatch({ type: 'navigate', view: 'home' })}>
          <img className="brand-logo" src="/assets/laporai-logo-v2.svg" alt="LaporAI logo" />
          <span>LaporAI</span>
        </a>
        <McpStatus />
        <span className="demo-badge">Fictional data only</span>
      </div>
      <div className="top-actions">
        <button className="quiet reset" onClick={reset}>Reset all data</button>
        <button className="quiet" onClick={() => trackedDispatch({ type: 'logout' })}>Log out</button>
      </div>
    </header>
    <div className="workspace">
      <aside className="sidebar">
        <div className="taxpayer">
          <span>{state.profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
          <div><strong>{state.profile.name}</strong><small>{state.profile.taxId}</small></div>
        </div>
        <nav aria-label="Portal navigation"><button className={state.view === 'home' ? 'active' : ''} onClick={() => trackedDispatch({ type: 'navigate', view: 'home' })}>My Portal</button><button className={state.view !== 'home' && state.view !== 'benchmark' ? 'active' : ''} onClick={() => navigateFilingStep('documents')}>File tax return</button></nav>
        <p className="sidebar-note">Fictional data only. Nothing here reaches a government system.</p>
      </aside>
      <main id="main" className={`content ${state.view !== 'home' && state.view !== 'benchmark' ? 'content-filing' : ''}`}>
        {views[state.view]}
      </main>
    </div>
    {!anchored && <AgentProposal state={state} dispatch={trackedDispatch} docked />}
  </div>
}
