import { useCallback, useEffect, useMemo, useReducer, useState, type FormEvent } from 'react'
import { createSampleBpa1Pdf, extractBpa1FromPdf } from './lib/pdf'
import {
  DEMO_CREDENTIALS,
  SAMPLE_BPA1_TEXT,
  createSyntheticProfile,
  filingReducer,
  parseBpa1Text,
  progress,
  restoreState,
  rupiah,
  validateReturn,
  type BenchmarkRun,
  type FilingState,
  type WithholdingRecord,
} from './lib/tax'
import { getAvailableToolNames, registerWebMcpTools } from './lib/webmcp'

const STORAGE_KEY = 'laporai-state'
const legalSources = [
  ['Coretaxpedia: Individual Annual Return', 'https://www.pajak.go.id/coretaxpedia/lapor-spt-tahunan-orang-pribadi'],
  ['DJP employee filing guide (PDF)', 'https://www.pajak.go.id/sites/default/files/2025-12/Panduan%20SPT%20OP%20Karyawan_2025.pdf'],
  ['PER-11/PJ/2025 reporting regulation', 'https://jdih.kemenkeu.go.id/dok/per-11pj2025/overview'],
  ['2025 individual annual return form', 'https://www.pajak.go.id/index.php/id/formulir-pajak/formulir-spt-tahunan-wajib-pajak-orang-pribadi'],
]

function Login({ onLogin }: { onLogin: (state?: FilingState['profile']) => void }) {
  const [email, setEmail] = useState<string>(DEMO_CREDENTIALS.username)
  const [password, setPassword] = useState<string>(DEMO_CREDENTIALS.password)
  const [name, setName] = useState('Ayu Larasati')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (/^\d{16}$/.test(email.trim())) return setError('Never enter a real NIK or NPWP in this demo.')
    if (email !== DEMO_CREDENTIALS.username || password !== DEMO_CREDENTIALS.password) {
      return setError('Use the public fictional credentials shown below.')
    }
    onLogin()
  }

  return (
    <main className="login-page">
      <section className="login-intro" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">LA</div>
        <p className="eyebrow">UNOFFICIAL DEMO · FIKTIF</p>
        <h1 id="login-title">LaporAI</h1>
        <p className="lead">A cooperative tax-filing prototype where a person and browser agent review the same visible return.</p>
        <div className="safety-note"><strong>No real taxpayer data.</strong> Everything stays in this browser and reset removes the draft.</div>
      </section>
      <section className="login-panel" aria-labelledby="demo-login-title">
        <p className="section-kicker">Public access</p>
        <h2 id="demo-login-title">Open the fictional Coretax workspace</h2>
        <form onSubmit={submit}>
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="primary wide" type="submit">Continue as demo taxpayer</button>
        </form>
        <dl className="credentials"><div><dt>Email</dt><dd>{DEMO_CREDENTIALS.username}</dd></div><div><dt>Password</dt><dd>{DEMO_CREDENTIALS.password}</dd></div></dl>
        <div className="divider"><span>or</span></div>
        <label>Fictional taxpayer name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <button className="secondary wide" onClick={() => onLogin(createSyntheticProfile(name))}>Create synthetic taxpayer</button>
      </section>
    </main>
  )
}

function StatusPill({ state }: { state: FilingState }) {
  const labels: Record<FilingState['status'], string> = { ready: 'Not started', editing: 'In progress', validated: 'Validated', declaration: 'Awaiting you', filed: 'Filed (demo)' }
  return <span className={`status status-${state.status}`}>{labels[state.status]}</span>
}

function Overview({ state, dispatch }: AppProps) {
  const steps = progress(state)
  return <section className="page-stack">
    <div className="hero-row"><div><p className="section-kicker">Tax year 2025 · Individual</p><h2>Annual tax return</h2><p>Complete a fictional employee zero-balance SPT Tahunan with assistance from your browser agent.</p></div><StatusPill state={state} /></div>
    <div className="progress-block"><div><strong>{steps.complete} of {steps.total} steps complete</strong><span>{Math.round(steps.complete / steps.total * 100)}%</span></div><progress max={steps.total} value={steps.complete} /></div>
    <div className="next-action"><div><p className="section-kicker">Recommended next step</p><h3>{!state.documentName ? 'Import the fictional BPA1' : !state.draft ? 'Create the annual return' : 'Continue reviewing the return'}</h3><p>The page and its WebMCP tools update together, so an agent only sees actions valid at this moment.</p></div><button className="primary" onClick={() => dispatch({ type: 'navigate', view: !state.documentName ? 'documents' : 'return' })}>Continue</button></div>
    <section className="info-section"><h3>Supported filing scope</h3><div className="facts"><div><span>Return type</span><strong>Normal SPT Tahunan</strong></div><div><span>Taxpayer</span><strong>Employee only</strong></div><div><span>Expected result</span><strong>Rp0 balance</strong></div></div><p className="muted">Business income, foreign income, corrections, refunds, and payment are intentionally blocked in this demo.</p></section>
  </section>
}

type AppProps = { state: FilingState; dispatch: React.Dispatch<Parameters<typeof filingReducer>[1]> }

function Documents({ state, dispatch }: AppProps) {
  const [record, setRecord] = useState<WithholdingRecord | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const download = () => {
    const url = URL.createObjectURL(new Blob([createSampleBpa1Pdf(SAMPLE_BPA1_TEXT)], { type: 'application/pdf' }))
    const link = document.createElement('a'); link.href = url; link.download = 'LaporAI-BPA1-FIKTIF.pdf'; link.click(); URL.revokeObjectURL(url)
  }
  const selectFile = async (file?: File) => {
    if (!file) return
    try { setRecord(await extractBpa1FromPdf(file)); setFileName(file.name); setError('') }
    catch (reason) { setRecord(null); setError(reason instanceof Error ? reason.message : 'The PDF could not be read.') }
  }
  const loadSample = () => { setRecord(parseBpa1Text(SAMPLE_BPA1_TEXT)); setFileName('LaporAI-BPA1-FIKTIF.pdf'); setError('') }
  return <section className="page-stack">
    <div className="page-heading"><div><p className="section-kicker">Dokumen Saya</p><h2>Withholding documents</h2><p>Download or import a fictional text-based BPA1. Raw PDF bytes stay in memory and are never saved.</p></div><span className="privacy-badge">Local processing only</span></div>
    <section className="document-callout"><div className="document-icon" aria-hidden="true">PDF</div><div><h3>Fictional BPA1 sample</h3><p>PT Nusantara Teknologi Fiktif · January–December 2025 · clearly marked demo data.</p></div><button className="secondary" onClick={download}>Download PDF</button></section>
    <form className="upload-box" toolname="review_fictional_bpa1" tooldescription="Review the visible fictional BPA1 import form. File selection remains human-only." onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="bpa1-file"><strong>Choose a fictional BPA1 PDF</strong><span>Text-based PDF, maximum 2 MB. Never upload a real tax document.</span></label>
      <input id="bpa1-file" type="file" accept="application/pdf,.pdf" onChange={(event) => void selectFile(event.target.files?.[0])} />
      <button type="button" className="text-button" onClick={loadSample}>Load the bundled sample without downloading</button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
    {record && <section className="review-box" aria-labelledby="extraction-title"><div className="review-header"><div><p className="section-kicker">Extraction review</p><h3 id="extraction-title">Confirm before import</h3></div><span>{fileName}</span></div><dl className="record-grid"><div><dt>Employer</dt><dd>{record.employer}</dd></div><div><dt>Period</dt><dd>{record.period}</dd></div><div><dt>Gross income</dt><dd>{rupiah(record.grossIncome)}</dd></div><div><dt>Deductions</dt><dd>{rupiah(record.deductions)}</dd></div><div><dt>Net income</dt><dd>{rupiah(record.netIncome)}</dd></div><div><dt>Tax withheld</dt><dd>{rupiah(record.taxWithheld)}</dd></div></dl><button className="primary" onClick={() => { dispatch({ type: 'import-withholding', record, actor: 'You', documentName: fileName }); dispatch({ type: 'navigate', view: 'return' }) }}>Import fictional record</button></section>}
    {state.documentName && <p className="success">Imported: {state.documentName}. Importing another supported file replaces it.</p>}
  </section>
}

function RecordRow({ title, meta, value, reviewed, onReview, children }: { title: string; meta: string; value: string; reviewed: boolean; onReview: () => void; children?: React.ReactNode }) {
  return <div className="record-row"><div><strong>{title}</strong><span>{meta}</span></div><div className="record-value"><strong>{value}</strong><span>{reviewed ? 'Reviewed' : 'Needs review'}</span></div>{children}<button className={reviewed ? 'quiet' : 'secondary'} onClick={onReview}>{reviewed ? 'Reviewed' : 'Mark reviewed'}</button></div>
}

function AnnualReturn({ state, dispatch }: AppProps) {
  if (!state.draft) return <section className="page-stack"><div className="page-heading"><div><p className="section-kicker">SPT Tahunan</p><h2>Annual tax return</h2><p>Create one supported normal employee return for tax year 2025.</p></div></div><form className="draft-form" toolname="create_annual_return_draft" tooldescription="Create the supported normal 2025 fictional annual return." onSubmit={(event) => { event.preventDefault(); dispatch({ type: 'create-draft', year: 2025 }) }}><label>Tax year<select defaultValue="2025"><option>2025</option></select></label><label>Filing type<select defaultValue="Normal"><option>Normal</option></select></label><label>Tax type<input value="PPh Orang Pribadi" readOnly /></label><button className="primary" type="submit">Create 2025 draft</button></form></section>
  return <section className="page-stack">
    <div className="page-heading"><div><p className="section-kicker">SPT Tahunan · {state.draft.year}</p><h2>Annual tax return</h2><p>Review every prefilled record before validation.</p></div><StatusPill state={state} /></div>
    {!state.draft.posted && <section className="posting"><div><h3>Posting SPT</h3><p>Bring the fictional BPA1, assets, liabilities, and family data into this draft.</p></div><button className="primary" onClick={() => dispatch({ type: 'post-draft' })}>Post fictional records</button></section>}
    {state.draft.posted && <>
      <section className="return-section"><div className="section-title"><div><span>01</span><div><h3>Identity and filing status</h3><p>Source: synthetic taxpayer profile</p></div></div><strong>Complete</strong></div><dl className="record-grid"><div><dt>Name</dt><dd>{state.profile.name}</dd></div><div><dt>Tax ID</dt><dd>{state.profile.taxId}</dd></div><div><dt>Filing model</dt><dd>Normal</dd></div><div><dt>Spouse status</dt><dd>Not combined</dd></div></dl></section>
      <section className="return-section"><div className="section-title"><div><span>02</span><div><h3>Employment income and withholding</h3><p>Source: {state.withholding.source}</p></div></div></div>{state.documentName ? <RecordRow title={state.withholding.employer} meta={`${state.withholding.period} · BPA1`} value={rupiah(state.withholding.taxWithheld)} reviewed={state.withholding.reviewed} onReview={() => dispatch({ type: 'review-withholding', actor: 'You' })} /> : <p className="empty">Import the fictional BPA1 from Dokumen Saya.</p>}<div className="calculation"><span>Net income <strong>{rupiah(state.withholding.netIncome)}</strong></span><span>Tax due <strong>{rupiah(state.withholding.taxDue)}</strong></span><span>Tax credit <strong>{rupiah(state.withholding.taxWithheld)}</strong></span><span>Balance <strong>{rupiah(Math.max(0, state.withholding.taxDue - state.withholding.taxWithheld))}</strong></span></div></section>
      <section className="return-section"><div className="section-title"><div><span>03</span><div><h3>Harta — assets</h3><p>Values at 31 December 2025</p></div></div><button className="text-button" onClick={() => dispatch({ type: 'add-asset', actor: 'You', asset: { id: `asset-${Date.now()}`, category: 'Cash and cash equivalents', description: 'Fictional fixed deposit', institution: 'Bank Nusantara Fiktif', country: 'Indonesia', acquiredYear: 2025, yearEndValue: 10_000_000, reviewed: false } })}>Add missing fictional asset</button></div><p className="warning-inline">Scenario clue: the fictional profile may be missing a fixed deposit. Confirm with the taxpayer before adding it.</p>{state.assets.map((asset) => <RecordRow key={asset.id} title={asset.description} meta={`${asset.category} · ${asset.institution}`} value={rupiah(asset.yearEndValue)} reviewed={asset.reviewed} onReview={() => dispatch({ type: 'review-asset', id: asset.id, actor: 'You' })}><div className="inline-actions"><label className="inline-edit">Year-end value<input type="number" value={asset.yearEndValue} onChange={(event) => dispatch({ type: 'update-asset', id: asset.id, yearEndValue: Number(event.target.value), actor: 'You' })} /></label><button className="text-button" onClick={() => dispatch({ type: 'remove-asset', id: asset.id, actor: 'You' })}>Remove</button></div></RecordRow>)}</section>
      <section className="return-section"><div className="section-title"><div><span>04</span><div><h3>Utang — liabilities</h3><p>Balances at 31 December 2025</p></div></div><button className="text-button" onClick={() => dispatch({ type: 'add-liability', actor: 'You', liability: { id: `liability-${Date.now()}`, description: 'Fictional personal loan', creditor: 'Koperasi Fiktif Bersama', country: 'Indonesia', incurredYear: 2025, yearEndBalance: 5_000_000, reviewed: false } })}>Add liability</button></div><p className="warning-inline">Scenario clue: the vehicle financing balance is intentionally outdated and needs confirmation.</p>{state.liabilities.map((item) => <RecordRow key={item.id} title={item.description} meta={`${item.creditor} · ${item.country}`} value={rupiah(item.yearEndBalance)} reviewed={item.reviewed} onReview={() => dispatch({ type: 'review-liability', id: item.id, actor: 'You' })}><div className="inline-actions"><label className="inline-edit">Year-end balance<input type="number" value={item.yearEndBalance} onChange={(event) => dispatch({ type: 'update-liability', id: item.id, yearEndBalance: Number(event.target.value), actor: 'You' })} /></label><button className="text-button" onClick={() => dispatch({ type: 'remove-liability', id: item.id, actor: 'You' })}>Remove</button></div></RecordRow>)}</section>
      <section className="return-section"><div className="section-title"><div><span>05</span><div><h3>Family, PTKP, and other sections</h3><p>Required zero-value groups remain visible</p></div></div></div><label className="compact-field">Dependents<select value={state.dependents} onChange={(event) => dispatch({ type: 'set-dependents', count: Number(event.target.value), actor: 'You' })}>{[0,1,2,3].map((count) => <option key={count}>{count}</option>)}</select></label><dl className="zero-groups"><div><dt>Other income</dt><dd>{rupiah(0)}</dd></div><div><dt>PPh Pasal 25</dt><dd>{rupiah(0)}</dd></div><div><dt>Tax payments</dt><dd>{rupiah(0)}</dd></div><div><dt>Attachments</dt><dd>None required</dd></div></dl><p className="muted">Correction, refund, business, and foreign-income branches are outside this demo and cannot be filed.</p></section>
      <div className="return-actions">{state.lastEdit && <button className="secondary" onClick={() => dispatch({ type: 'undo-last-edit' })}>Undo last attachment edit</button>}<button className="primary" onClick={() => dispatch({ type: 'navigate', view: 'review' })}>Review and validate</button></div>
    </>}
  </section>
}

function Review({ state, dispatch }: AppProps) {
  const validation = validateReturn(state)
  const [acknowledged, setAcknowledged] = useState(false)
  return <section className="page-stack"><div className="page-heading"><div><p className="section-kicker">Final review</p><h2>Validation and declaration</h2><p>Deterministic checks compare the visible fictional records. This is not tax advice.</p></div><StatusPill state={state} /></div>
    <section className="result-panel"><p>Simulated amount payable</p><strong>{rupiah(validation.taxBalance)}</strong><span>Tax due {rupiah(state.withholding.taxDue)} − credit {rupiah(state.withholding.taxWithheld)}</span></section>
    <section className="checks"><h3>Validation checks</h3>{!validation.errors.length && !validation.warnings.length && <p className="success">All supported checks pass.</p>}{validation.errors.map((issue) => <a key={issue.field} href="#" onClick={(event) => { event.preventDefault(); dispatch({ type: 'navigate', view: issue.field === 'document' ? 'documents' : 'return' }) }} className="check error-check"><strong>Blocking</strong><span>{issue.message}</span></a>)}{validation.warnings.map((issue) => <div key={issue.field} className="check warning-check"><strong>Review</strong><span>{issue.message}</span></div>)}</section>
    {state.status !== 'declaration' && <button className="primary" onClick={() => dispatch({ type: 'validate' })}>Run return validation</button>}
    {state.status === 'validated' && <section className="declaration-gate"><div><h3>Ready for your declaration</h3><p>An agent cannot open, accept, sign, or submit the declaration.</p></div><button className="primary" onClick={() => dispatch({ type: 'open-declaration' })}>Open declaration</button></section>}
    {state.status === 'declaration' && <section className="declaration"><p className="eyebrow">HUMAN-ONLY CONTROL</p><h3>I declare this fictional return is ready</h3><p>Only you can complete this action. This simulates signing and filing; it sends nothing to DJP or any server.</p><label className="checkbox"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> I understand this is a fictional, unofficial demo.</label><button className="danger" disabled={!acknowledged} onClick={() => dispatch({ type: 'file-return' })}>Simulate signing and filing</button></section>}
    <details className="legal"><summary>Dasar hukum dan panduan</summary><p>Official terms are represented for educational demonstration only. References checked 30 August 2026.</p><ul>{legalSources.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer">{label}</a></li>)}</ul></details>
  </section>
}

function Receipt({ state }: { state: FilingState }) {
  return <section className="receipt"><p className="eyebrow">FIKTIF · DEMO TIDAK RESMI</p><div className="receipt-seal" aria-hidden="true">✓</div><h2>Simulated filing complete</h2><p>No return was submitted to the Indonesian government.</p><dl><div><dt>Receipt</dt><dd>{state.receiptId}</dd></div><div><dt>Tax year</dt><dd>2025</dd></div><div><dt>Result</dt><dd>{rupiah(0)}</dd></div><div><dt>Taxpayer</dt><dd>{state.profile.name}</dd></div></dl></section>
}

function Benchmark({ state, dispatch }: AppProps) {
  const active = state.benchmarkRuns.at(-1)?.finishedAt === null
  const start = (mode: BenchmarkRun['mode']) => dispatch({ type: 'start-benchmark', mode })
  const modes = [['manual','Manual'],['browser-agent','Screen-operated agent'],['webmcp','WebMCP agent']] as const
  const medians = modes.map(([mode, label]) => {
    const durations = state.benchmarkRuns.filter((run) => run.mode === mode && run.finishedAt !== null).map((run) => run.finishedAt! - run.startedAt).sort((a, b) => a - b)
    return { mode, label, runs: durations.length, median: durations.length >= 3 ? durations[Math.floor(durations.length / 2)] : null }
  })
  return <section className="page-stack"><div className="page-heading"><div><p className="section-kicker">Evaluation</p><h2>Benchmark modes</h2><p>Compare interaction methods from the same fictional fixture. Record at least three runs before reporting a median.</p></div></div><div className="mode-list">{modes.map(([mode,label]) => <button key={mode} className="mode" onClick={() => start(mode)} disabled={active}><strong>{label}</strong><span>{mode === 'webmcp' ? 'Native, state-aware tools' : mode === 'manual' ? 'Visible UI controls' : 'Pixels and clicks'}</span></button>)}</div>{active && <div className="benchmark-bar"><span>Run in progress. Complete the workflow, then finish the measurement.</span><button className="primary" onClick={() => dispatch({ type: 'finish-benchmark' })}>Finish run</button></div>}<div className="median-row">{medians.map((item) => <div key={item.mode}><span>{item.label} · {item.runs} runs</span><strong>{item.median === null ? 'Need 3 runs' : `${(item.median / 1000).toFixed(1)} s median`}</strong></div>)}</div><table><caption>Local benchmark log</caption><thead><tr><th>Mode</th><th>Duration</th><th>Actions</th><th>Errors</th><th>Tool calls</th></tr></thead><tbody>{state.benchmarkRuns.map((run) => <tr key={run.id}><td>{run.mode}</td><td>{run.finishedAt === null ? 'Running' : `${((run.finishedAt-run.startedAt)/1000).toFixed(1)} s`}</td><td>{run.actions}</td><td>{run.errors}</td><td>{run.toolCalls}</td></tr>)}</tbody></table><p className="muted">Fixture v{state.fixtureVersion} · Browser: {navigator.userAgent}. Results describe these disclosed local runs only; they are not universal performance claims.</p></section>
}

function AgentProposal({ state, dispatch }: AppProps) {
  if (!state.pendingProposal) return null
  return <aside className="proposal" aria-live="polite"><p className="section-kicker">Agent proposes</p><strong>{state.pendingProposal.description}</strong><p>No value changes until you approve.</p><div><button className="primary" onClick={() => dispatch({ type: 'approve-proposal' })}>Approve agent change</button><button className="secondary" onClick={() => dispatch({ type: 'reject-proposal' })}>Reject change</button></div></aside>
}

export default function App() {
  const [state, dispatch] = useReducer(filingReducer, null, () => {
    try { return restoreState(localStorage.getItem(STORAGE_KEY)) } catch { return restoreState(null) }
  })
  const runActive = state.benchmarkRuns.at(-1)?.finishedAt === null
  const trackedDispatch = useCallback((action: Parameters<typeof filingReducer>[1]) => {
    dispatch(action)
    if (runActive && action.type !== 'count-action' && action.type !== 'finish-benchmark') dispatch({ type: 'count-action' })
  }, [runActive])
  const toolDispatch = useCallback((action: Parameters<typeof filingReducer>[1]) => {
    dispatch(action)
    if (runActive) dispatch({ type: 'count-action', tool: true })
  }, [runActive])
  useEffect(() => { try { if (state.loggedIn) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); else localStorage.removeItem(STORAGE_KEY) } catch { /* Current session remains usable when storage is blocked. */ } }, [state])
  useEffect(() => registerWebMcpTools(state, toolDispatch), [state, toolDispatch])
  const tools = useMemo(() => getAvailableToolNames(state), [state])
  const login = (profile?: FilingState['profile']) => { sessionStorage.setItem('laporai-demo-session', 'active'); dispatch({ type: 'login', profile }) }
  if (!state.loggedIn) return <Login onLogin={login} />
  const reset = () => { localStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem('laporai-demo-session'); dispatch({ type: 'reset' }) }
  const views = { home: <Overview state={state} dispatch={trackedDispatch} />, documents: <Documents state={state} dispatch={trackedDispatch} />, return: <AnnualReturn state={state} dispatch={trackedDispatch} />, review: <Review state={state} dispatch={trackedDispatch} />, receipt: <Receipt state={state} />, benchmark: <Benchmark state={state} dispatch={trackedDispatch} /> }
  return <div className="app-shell"><header className="topbar"><a className="brand" href="#main" onClick={() => trackedDispatch({ type: 'navigate', view: 'home' })}><span className="brand-mark small">LA</span><span>LaporAI<small>Unofficial tax demo</small></span></a><div className="top-actions"><span className="demo-banner">Fictional data only</span><button className="quiet" onClick={() => trackedDispatch({ type: 'logout' })}>Log out</button></div></header><div className="workspace"><aside className="sidebar"><div className="taxpayer"><span>{state.profile.name.split(' ').map((part) => part[0]).join('').slice(0,2)}</span><div><strong>{state.profile.name}</strong><small>{state.profile.taxId}</small></div></div><nav aria-label="Portal navigation">{([['home','Overview'],['documents','Dokumen Saya'],['return','Annual return'],['review','Review'],['benchmark','Benchmark']] as const).map(([view,label]) => <button key={view} className={state.view === view ? 'active' : ''} onClick={() => trackedDispatch({ type: 'navigate', view })}>{label}</button>)}</nav><div className="agent-status"><div><span className={document.modelContext ? 'dot online' : 'dot'} /><strong>WebMCP</strong></div><p>{document.modelContext ? `${tools.length} tools available now` : 'Open in a WebMCP-enabled browser'}</p><details><summary>Current tools</summary><ul>{tools.map((tool) => <li key={tool}><code>{tool}</code></li>)}</ul></details></div><button className="reset" onClick={reset}>Reset all demo data</button></aside><main id="main" className="content">{views[state.view]}<section className="activity"><details><summary>Activity history ({state.activity.length})</summary>{!state.activity.length ? <p>No changes yet.</p> : <ol>{[...state.activity].reverse().map((item) => <li key={item.id}><strong>{item.actor}</strong> {item.description}{item.previous !== undefined && <span className="activity-change">{item.previous} → {item.next}</span>}<time>{new Date(item.at).toLocaleTimeString()}</time></li>)}</ol>}</details></section></main></div><AgentProposal state={state} dispatch={trackedDispatch} /></div>
}
