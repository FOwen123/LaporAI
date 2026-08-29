# LaporAI product requirements document

Status: Draft for hackathon build  
Last updated: 30 August 2026  
Product type: Unofficial WebMCP reference implementation  
Primary language: Bahasa Indonesia

## Product summary

LaporAI is a fictional Indonesian annual tax filing portal that demonstrates how a citizen and a browser agent can complete a complicated government form together. It follows the main Coretax DJP flow for an individual employee filing a normal annual income tax return with one employer and no tax due.

The citizen provides personal context, corrects ambiguous information, approves changes, and controls the simulated signature and submission. The agent reviews prefilled information, finds omissions and inconsistencies, explains unfamiliar fields, and makes approved changes through WebMCP tools registered by the current page.

LaporAI is not connected to Direktorat Jenderal Pajak and does not submit real tax returns. Judges can log in with demo credentials, create or edit a synthetic taxpayer, and upload supplied fictional documents. The product must never request real taxpayer credentials or government identifiers.

## Problem

Annual tax filing asks citizens to translate real events into a long, stateful form. Information is split across employment records, withholding slips, assets, debts, family details, payments, and declarations. A mistake in one section can change another section or make the return inconsistent.

Screen-based browser agents can attempt this work, but they must infer the meaning and current state of the interface. They can also lose track after the citizen edits a field manually. WebMCP lets the website expose the actions that are valid at that moment, accept structured inputs, and return structured results while the citizen and agent share the same visible form.

## Product claim

LaporAI should prove the following claim:

> A government service that exposes state-aware WebMCP tools lets a citizen and their agent complete an annual tax return with fewer actions and fewer errors than manual filing or screen-based browser automation, while preserving citizen control over consequential decisions.

The demo must measure this claim. Speed alone is not enough.

## Target user

The primary demo user is an Indonesian employee who:

- receives employment income from one employer;
- files a normal annual personal income tax return;
- has an employer-issued BPA1 withholding record;
- has a small list of assets and at most one outstanding liability;
- has no business or professional income;
- has no foreign income or special tax facility;
- has no tax underpayment or overpayment; and
- needs help understanding and checking the return, not making tax-planning decisions.

The secondary audience is government digital-service teams evaluating how WebMCP could make public websites safer and easier for citizen-owned agents.

## Scope boundary

### What we are building

- One complete fictional annual return for an individual employee.
- A Coretax-like login screen that accepts clearly labelled demo credentials.
- A first-run flow where a judge can use a prepared taxpayer or create a new synthetic taxpayer.
- A Coretax-inspired draft, edit, validate, review, and simulated submission flow.
- A partially prefilled demo return containing one deliberate missing asset and one inconsistent liability.
- A fictional document center with a downloadable demo pack and local BPA1 PDF upload.
- Manual editing and WebMCP editing of the same visible form.
- Dynamic WebMCP tool registration based on the current filing state.
- A clear history of changes made by the citizen and the agent.
- A comparison mode for manual, screen-operated agent, and WebMCP-assisted completion.
- Fictional Indonesian data that resets to a known state.

### What we are not building

- Real Coretax authentication, NIK or NPWP verification, filing, payment, digital signing, or DJP integration.
- A pixel-for-pixel copy of the Coretax website.
- Real tax calculation or tax advice.
- Complete flows for business owners, independent professionals, multiple employers, married couples with separate tax obligations, corrections, foreign income, special facilities, underpayment, or overpayment.
- Upload, OCR, or storage of real withholding slips or identity documents. The supported upload is a fictional text-based BPA1 PDF processed inside the browser.
- Production authentication, collaboration between multiple people, or a production database.

When fictional answers enter an unsupported branch, LaporAI should explain the limitation and return the demo to a supported scenario. It must not invent tax treatment.

## Relationship to Coretax DJP

LaporAI should reproduce the structure and difficulty of the official workflow without impersonating the government service.

It should borrow these interaction patterns:

- sign in and enter a taxpayer portal;
- open `Portal Saya` and `Dokumen Saya`;
- view or download a fictional BPA1 withholding document;
- create a draft for PPh Orang Pribadi;
- choose annual period, tax year, and normal filing;
- post prefilled records into the return;
- review the main form and required attachments;
- edit tables for assets and liabilities;
- validate the return before filing;
- show a declaration before signing; and
- move the completed simulation into a filed state with a fictional receipt.

It must differ visibly from Coretax:

- Use the LaporAI name and logo.
- Show `Demo tidak resmi` in the global header and on the simulated receipt.
- Never use the DJP or Ministry of Finance logo.
- Never use `go.id` styling, a government seal, or text suggesting official approval.
- Include a persistent message stating that all information is fictional and nothing will be sent to DJP.
- Link to the official Coretax information page for people who need to file a real return.

## Indonesian visual direction

The interface should feel Indonesian without turning cultural elements into decoration around an unusable form.

- Use warm ivory as the main canvas, inspired by the fabric of a kebaya.
- Use deep indigo for navigation and text, muted gold for focus and progress, and red only for important actions or warnings.
- Add a low-contrast kawung or geometric batik pattern to the header and empty margins. Never place a pattern behind form text.
- Use fine line details inspired by kebaya embroidery around cards, section dividers, and the progress indicator.
- Keep tables, labels, validation messages, and controls plain and highly legible.
- Use Bahasa Indonesia for the product interface. Keep tax terms such as `SPT Tahunan`, `PPh Orang Pribadi`, `Bukti Potong`, `Harta`, and `Utang` unchanged.
- Meet WCAG AA contrast, keyboard navigation, visible focus, descriptive errors, and reduced-motion preferences.

The result should look like a trustworthy Indonesian civic product, not a themed government clone.

## Content fidelity and legal references

The form structure, field names, help text, validation rules, and process descriptions should follow the current official employee return guide and the current individual return form. LaporAI should not simplify away a required section merely because the demo value is zero.

Each major section should include a `Dasar hukum dan panduan` drawer containing:

- the official Indonesian field or section description;
- a short plain-language explanation written for the demo;
- the applicable official form, guide, or regulation reference;
- a direct link to `pajak.go.id` or `jdih.kemenkeu.go.id`;
- the date that the LaporAI team last checked the source; and
- a notice that the information may change and is not tax advice.

The initial legal reference set should include the active PER-11/PJ/2025 reporting regulation, its individual-return instructions, the official 2025 individual return form, and the current Coretax employee filing guide. Exact statutory claims must come from one of these sources. LaporAI must not invent citations or use model-generated legal interpretations as authoritative content.

## Interactive demo access and documents

The public demo must be usable without knowing a hidden test account.

The login page should offer two paths:

- `Masuk dengan akun demo`, with visible fictional credentials that the judge can type or paste; and
- `Buat wajib pajak fiktif`, which generates a synthetic taxpayer profile in the current browser.

This login reproduces the portal experience but is not security authentication. Every identity number must use a visibly invalid demo format such as `DEMO-NPWP-001`. Demo email addresses must use the reserved `.example` domain. The header must continue to show `Demo tidak resmi` after login.

The document center should provide:

- one prepared fictional BPA1 PDF;
- a downloadable `Paket Dokumen Fiktif` for judges who want to start from a clean session;
- an upload control that accepts only PDF files within a small documented size limit;
- local text extraction for the supplied text-based BPA1 format;
- a review screen showing extracted employer, income, and withholding values before import; and
- a way to reject the extraction and enter the values manually.

File selection must remain a direct human action. The agent can inspect the structured extraction, explain it, compare it with the return, and propose importing it. The agent cannot open the file picker or upload a file on the citizen's behalf.

Scanned PDFs, encrypted PDFs, unknown layouts, and files that appear to contain real NIK or NPWP values must be rejected with a plain explanation. OCR is outside the hackathon scope.

## Official filing requirements represented in the demo

The following coverage is based on the official employee guide and Coretaxpedia available when this PRD was written. DJP states that its forms and guidance can change. The implementation must treat this as a demo data model, not a legal specification.

### Readiness before filing

The readiness screen should explain that a real employee generally needs:

- NIK integrated with NPWP;
- an activated Coretax DJP account;
- current registered email and phone details;
- a DJP authorization code or supported electronic certificate for signing;
- the passphrase for that signing method;
- employer-issued BPA1 or other applicable withholding records;
- a list of income received during the tax year;
- assets held at the end of the tax year;
- liabilities outstanding at the end of the tax year;
- current family and dependent information;
- records of tax payments, when applicable; and
- proof for claimed mandatory zakat or religious contributions, when applicable.

LaporAI must display these requirements but use fictional readiness checks. It may collect the labelled demo username and password on its simulated login screen and accept supported fictional BPA1 files. It must not collect real Coretax credentials, passphrases, real documents, or real identity numbers.

### Draft setup

The fictional taxpayer must confirm:

- tax type: `PPh Orang Pribadi`;
- return period: `SPT Tahunan`;
- tax year and January to December period;
- filing model: `Normal`; and
- income source: `Pekerjaan`;
- record-keeping method: `Pencatatan`.

The product must prevent duplicate drafts for the same fictional taxpayer and tax year.

### Prefilled posting and review

The `Posting SPT` action should load fictional records that resemble data Coretax can prefill:

- taxpayer profile;
- employment income;
- BPA1 withholding;
- prior-year assets;
- prior-year liabilities;
- family members and dependents; and
- recorded tax payments, if present.

Every prefilled row must show its fictional source and a `Periksa kembali` state. Prefilled data is not assumed correct.

### Main return

The demo must represent these main-form groups:

1. Taxpayer identity and contact details.
2. Marital status and spouse tax-obligation status.
3. Income summary.
4. applicable PTKP status and dependents.
5. taxable-income and income-tax summary.
6. tax credits from withholding records.
7. underpayment or overpayment result.
8. correction information, disabled in the supported normal-return scenario.
9. refund request, disabled in the supported zero-balance scenario.
10. PPh Pasal 25 installments, when applicable.
11. declarations about other transactions or tax situations.
12. additional attachments, when a selected answer requires them.

Conditional questions must control which sections appear. If a user indicates business income, professional income, foreign income, a special facility, separate spousal tax obligations, underpayment, overpayment, or a correction, the interface must identify the unsupported branch before proceeding.

### Employment income and withholding

The fictional BPA1 record should provide enough information to review:

- employer name and fictional tax identifier;
- employment period;
- gross employment income;
- deductions represented in the fictional withholding record;
- net employment income;
- income tax due in the withholding record; and
- income tax withheld by the employer.

The return must check that employment income and its withholding record are both represented. A withholding credit without corresponding income must fail validation.

### Assets at the end of the tax year

The user must be able to add, edit, retain, and remove fictional assets. Each asset must capture the fields required for the selected asset type, including:

- asset category and description;
- account number or ownership-document reference when relevant;
- owner name when relevant;
- bank, institution, or counterparty when relevant;
- country;
- acquisition year;
- acquisition value or required year-end value;
- year-end balance for cash and similar assets; and
- a fictional note for special disclosure-program treatment when applicable.

Prior-year assets that still exist must be reviewed and updated. Assets no longer held require an explicit fictional disposition reason before removal.

### Liabilities at the end of the tax year

The user must be able to add, edit, retain, and remove fictional liabilities. Each liability should record:

- liability category and description;
- lender or creditor;
- account or agreement reference when relevant;
- country;
- year incurred;
- balance outstanding at the end of the tax year; and
- a fictional note for special disclosure-program treatment when applicable.

Prior-year liabilities must be reviewed against their current year-end balance. A liability linked to an asset that has been removed should trigger a review warning.

### Family and dependents

The product must display fictional family data and allow the citizen to confirm:

- marital status;
- spouse tax-obligation status when relevant;
- dependent count and relationship; and
- whether the resulting PTKP status matches the employment record.

A mismatch between marital or dependent status and the fictional withholding record must produce an explanation instead of silently changing the calculation.

### Tax payments, deductions, and conditional evidence

The supported demo contains no extra tax payment or deduction. The form should still represent these conditional checks:

- other tax payments or credits;
- PPh Pasal 25 installments;
- mandatory zakat or religious contributions and proof;
- tax paid abroad;
- income subject to final tax;
- non-taxable income; and
- other income not present in the employment record.

Selecting any of these should reveal the relevant explanation and mark the scenario as requiring a future workflow unless the fixture explicitly supports it.

### Validation, declaration, and simulated submission

Before the return can enter review, LaporAI must verify:

- every required section has been visited;
- all prefilled records have been reviewed;
- required fields are present;
- employment income and withholding agree with the fictional fixture;
- assets and liabilities have current year-end values;
- dependent and PTKP information is consistent;
- no unsupported conditional branch is active; and
- the calculated fictional result is zero balance.

The citizen must then see a plain-language summary and affirm that the fictional information is complete and correct. The agent may prepare this screen but may not affirm the declaration, enter a signing passphrase, sign, or submit.

The citizen clicks a clearly labelled `Simulasikan tanda tangan dan pelaporan` control. The app then creates a fictional receipt bearing the `Demo tidak resmi` label.

## Core user journey

1. The citizen opens LaporAI and sees the unofficial-demo warning.
2. The citizen types the visible demo credentials or creates a synthetic taxpayer.
3. The citizen opens `Dokumen Saya`, downloads the fictional document pack if needed, and selects the fictional BPA1 PDF.
4. LaporAI extracts the text locally and shows the proposed employer, income, and withholding values.
5. The citizen asks their browser agent to review the extraction and approves importing it.
6. The citizen reviews the real-world readiness checklist and creates a normal annual personal return.
7. LaporAI posts fictional profile, employment, withholding, asset, liability, and dependent data.
8. The citizen asks their browser agent to review the return.
9. The agent uses WebMCP to identify an unreviewed prior-year asset and a liability with an outdated balance.
10. The agent asks what happened to the asset. The citizen supplies the missing context.
11. After confirmation, the agent updates the asset and liability through WebMCP.
12. The citizen manually changes the dependent count in the visible form.
13. The agent reads the new state, identifies the resulting PTKP mismatch, and explains it.
14. The citizen corrects the dependent count and asks the agent to validate again.
15. The agent opens a plain-language review of the zero-balance result.
16. WebMCP mutation tools unregister.
17. The citizen alone affirms the declaration and performs simulated signing and submission.
18. LaporAI shows a fictional receipt and benchmark results.

## WebMCP tools

Tools should be small, specific, and tied to visible product actions. Their execution must call the same application logic used by the form controls.

### Read-only tools

| Tool | Purpose | Availability |
| --- | --- | --- |
| `get_filing_requirements` | Return the readiness checklist and supported demo boundary | Before a draft exists |
| `get_document_status` | Return which fictional supporting documents are present and reviewed | After demo login |
| `review_withholding_extraction` | Return structured values extracted from the citizen-selected fictional BPA1 | After local extraction |
| `get_return_progress` | Return completed, incomplete, and blocked sections | After a draft exists |
| `review_prefilled_data` | Return prefilled rows that still need citizen review | Editing only |
| `get_section_data` | Read one named visible return section as structured data | Editing and review |
| `explain_field` | Explain one field, why it is requested, and its fictional source | When that field is visible |
| `validate_return` | Return errors, warnings, and a structured completion result | Editing only |
| `explain_tax_result` | Explain the fictional zero-balance result using current return data | After successful validation |

### Mutation tools

| Tool | Purpose | Required control |
| --- | --- | --- |
| `create_employee_return` | Create the supported annual employee draft | Citizen confirms year and normal filing |
| `import_withholding_record` | Import the reviewed fictional BPA1 values into the taxpayer record | Citizen confirmation after local extraction |
| `confirm_prefilled_record` | Mark one prefilled row as reviewed without changing it | Row remains visible |
| `add_asset` | Add a fictional asset | Agent states proposed values before execution |
| `update_asset` | Update a fictional asset or its year-end value | Citizen confirmation |
| `remove_asset` | Remove an asset with a disposition reason | Citizen confirmation and undo option |
| `add_liability` | Add a fictional year-end liability | Citizen confirmation |
| `update_liability` | Update a fictional liability balance | Citizen confirmation |
| `remove_liability` | Remove a liability with a reason | Citizen confirmation and undo option |
| `update_dependent_details` | Propose a change to fictional dependent information | Citizen confirmation and consistency warning |
| `open_review_summary` | Navigate to the visible plain-language review | Only after validation succeeds |

There must be no WebMCP tools for credential entry, file selection, passphrase entry, digital signing, payment authorization, declaration affirmation, or final submission.

### Dynamic registration

- Before demo login, register no taxpayer or document tools.
- After demo login, register document-status and requirements tools.
- After the citizen selects a supported fictional BPA1, register extraction review and import tools.
- With no draft, register only requirements, document, and draft-creation tools.
- While posting data, expose no mutation tools.
- During editing, register tools for the visible and applicable sections.
- When validation fails, keep correction tools registered and return exact field references.
- After validation succeeds, register explanation and review navigation tools.
- On the declaration screen, unregister every mutation tool.
- After simulated filing, expose only receipt and benchmark reading actions.

Use the declarative WebMCP API for standard visible forms where it produces clear tool definitions. Use the imperative API for posting data, reading progress, table operations, validation, explanation, and navigation.

## Human control and activity history

Every change must be attributed as `Anda` or `Agen`. The history must show:

- time;
- section and record affected;
- previous and new fictional values;
- whether confirmation was required; and
- a one-step undo action while the return remains editable.

An agent proposal should appear beside the affected form section. The citizen must not have to switch to a separate chatbot to understand what will change.

## Database decision

Do not add a production database for the hackathon version.

Use versioned fictional fixture files for prepared accounts and documents. Use browser storage for judge-created synthetic profiles, the active draft, activity history, benchmark run, and reset state. This lets every judge complete a different fictional return and persist it across refreshes without creating a backend account or storing sensitive information.

Reasons:

- Each browser session needs only one local synthetic taxpayer at a time.
- A database does not improve the WebMCP demonstration.
- Avoiding a backend removes authentication and personal-data handling risks.
- Prepared fixtures keep benchmark runs comparable, while the synthetic-profile flow keeps the public demo interactive.

Add a database only if a later version needs authenticated users, multi-device resume, multiple saved returns, or controlled research sessions. That later decision requires a data-retention policy, deletion controls, encryption, access logging, and Indonesian privacy-law review.

## Suggested implementation tools

Keep the implementation small:

- React and TypeScript for the interface and shared form actions.
- Tailwind CSS for the visual system.
- The native WebMCP imperative and declarative APIs, with the hackathon-supported fallback or polyfill only if required by the judging environment.
- JSON fixtures for fictional Coretax-like records.
- `localStorage` for the disposable demo draft and measurements.
- The browser File API and one browser-side PDF text parser for supplied fictional BPA1 files.
- A small deterministic calculation module for the fictional fixture, clearly labelled as simulation logic.
- Browser performance timing and an action counter for benchmark evidence.

Do not add a general AI SDK, an MCP server, Supabase, remote document upload service, OCR, analytics platform, or production authentication unless the demo cannot run without it.

## Security and privacy requirements

### Data boundary

- Accept fictional demo data only.
- Let judges edit names, employers, amounts, assets, liabilities, and dependents, but label every profile as synthetic.
- Generate government identifiers in an intentionally invalid `DEMO-*` format. Do not let users replace them with numeric NIK or NPWP values.
- Use `.example` addresses and fictional account references.
- Accept only the documented fictional BPA1 PDF format. Warn before file selection and reject content that resembles a real NIK or NPWP.
- Keep uploaded bytes and extracted values inside the browser. Do not persist raw files after the current session.
- Do not provide fields for a real Coretax password, signing passphrase, OTP, bank account, residential address, phone number, or government identifier.
- Never send form contents to a remote server.
- Provide `Reset semua data demo` and remove browser-stored data when used.

### WebMCP boundary

- Validate every tool input against its declared schema before changing state.
- Derive record ownership and active tax year from application state, not agent-provided identifiers.
- Reject calls to tools that are not valid in the current page state, even if an agent cached an old schema.
- Require visible citizen confirmation for mutations that add, update, or remove return data.
- Display the exact proposed values, not a vague confirmation message.
- Keep an activity history and an undo path.
- Treat all agent-written text as untrusted text. Never render it as HTML.
- Do not expose generic tools such as `execute_action`, `run_script`, `call_api`, or unrestricted record updates.

### Submission safety

- Keep declaration, signing, payment, and submission outside WebMCP.
- Make simulated controls visually distinct from real government controls.
- Generate receipts only inside the browser and stamp them `FIKTIF` and `DEMO TIDAK RESMI`.
- Do not link fictional controls to Coretax endpoints.
- Link to the official site only through a separate `Buka layanan resmi` link that cannot carry demo data.

### Demo login safety

- Label the login form `Simulasi login LaporAI`, even when its field order resembles Coretax.
- Show the accepted demo credentials beside the form.
- Reject values that look like a 16-digit NIK or NPWP and explain that real credentials must never be entered.
- Keep the simulated password client-side and do not log or persist it.
- Never reuse Coretax session cookies, endpoints, CAPTCHA, or identity-provider flows.

### Browser security

- Use a restrictive Content Security Policy.
- Do not include third-party scripts, trackers, or remotely hosted code.
- Avoid secrets and environment credentials because the demo needs none.
- Escape displayed values and use framework text rendering.
- Keep dependencies minimal and pin versions for the submitted build.

## User stories and acceptance criteria

### Understand what is required

As an employee, I want to see what I would need before starting a real return so that I know whether I am ready.

Acceptance criteria:

- The readiness screen lists account, signing, income, withholding, asset, liability, dependent, and conditional payment evidence.
- It states that LaporAI will not collect these real documents or credentials.
- The agent can retrieve the same checklist through `get_filing_requirements`.

### Enter and personalize the demo

As a judge, I want to enter through a realistic login and create a synthetic taxpayer so that I can try the product instead of watching a fixed script.

Acceptance criteria:

- The login page displays working demo credentials and labels them as fictional.
- A judge can create a synthetic taxpayer without supplying a real identifier or contact detail.
- The generated profile uses invalid `DEMO-*` identifiers and `.example` contact values.
- Refreshing the page restores the local synthetic profile until the judge resets it.

### Bring a fictional withholding document

As an employee, I want to select a fictional BPA1 and review its extracted values with my agent so that supporting evidence becomes part of the shared workflow.

Acceptance criteria:

- The document center provides a downloadable fictional BPA1 PDF.
- Only the citizen can operate the file input.
- LaporAI extracts supported text locally and displays every proposed value before import.
- The agent can compare the extraction with the return but cannot import it without confirmation.
- Unsupported, encrypted, scanned, oversized, or apparently real documents are rejected without upload to a server.

### Review prefilled information together

As an employee, I want my agent to find unreviewed or inconsistent prefilled information so that I can focus on decisions requiring my knowledge.

Acceptance criteria:

- The agent identifies the deliberate missing-asset issue and outdated liability.
- It cannot decide the asset disposition without asking the citizen.
- Every prefilled record remains visible and manually editable.
- The citizen can change a field manually and the next tool read returns the changed value.

### Make controlled corrections

As an employee, I want to approve an agent's exact proposed correction so that I remain responsible for my return.

Acceptance criteria:

- A mutation shows the affected record and before-and-after values.
- Rejecting the proposal leaves the return unchanged.
- Approving it updates the visible form and activity history.
- Undo restores the previous state before simulated submission.

### Understand validation failures

As an employee, I want errors explained in plain Bahasa Indonesia so that I know what to correct.

Acceptance criteria:

- Validation distinguishes blocking errors from review warnings.
- Each result links to the visible field or table row.
- The dependent-count edit triggers a PTKP consistency warning.
- An unsupported tax situation stops the demo without inventing an answer.

### Retain final control

As an employee, I want the agent to prepare my review while I control the declaration and simulated submission.

Acceptance criteria:

- Successful validation unregisters mutation tools on the declaration screen.
- The agent can explain the result but cannot affirm, sign, or submit.
- Only a visible citizen action creates the fictional receipt.

### Compare the three workflows

As a reviewer, I want comparable evidence so that I can judge what WebMCP changed.

Acceptance criteria:

- Each run begins from the same versioned fixture.
- The app records completion time, interface actions, tool calls, validation failures, retries, and final correctness.
- The results compare manual, screen-operated agent, and WebMCP-assisted modes.
- The benchmark discloses the test script, browser, model, and number of runs.

## Edge cases

- Refresh during editing restores the disposable draft and correctly re-registers tools.
- Reset clears the draft, activity history, and benchmark data.
- A stale agent tool call receives a state error and makes no change.
- Duplicate draft creation opens the existing draft instead of creating another.
- Removing an asset linked to a liability produces a warning.
- A changed dependent count invalidates the previous validation result.
- Selecting an unsupported income or marital situation stops progression and explains the demo boundary.
- A failed validation never registers review or simulated-submission actions.
- Local storage unavailable falls back to the current session and states that refresh will reset the demo.
- Incorrect demo credentials show an ordinary login error without suggesting a real Coretax account can be used.
- A judge-created synthetic profile with no documents sees an empty `Dokumen Saya` state and a link to the fictional document pack.
- Selecting the same fictional BPA1 twice offers to replace the prior extraction instead of duplicating income.
- Leaving during document review discards raw file bytes.
- A PDF containing a numeric value that resembles a real NIK or NPWP is rejected before import.

## Benchmark plan

Use the same fictional scenario and expected final return for every mode. Run each mode at least three times and report the median.

Measure:

- time from opening the draft to successful validation;
- number of clicks, keystroke groups, and navigation actions;
- number of agent tool calls in WebMCP mode;
- validation errors and retries;
- unapproved mutations;
- final field-level correctness; and
- number of times the citizen had to explain ambiguous information.

The benchmark should not claim that WebMCP always makes tax filing faster. It should report the observed result for this disclosed scenario.

## Submission proof points

The demo video should visibly prove:

- tools change as the filing moves through draft, editing, validation, and declaration states;
- the agent finds a cross-section inconsistency through structured tools;
- the citizen edits the same form manually and the agent adapts;
- a mutation requires confirmation and appears in the activity history;
- signing and submission are absent from the agent's available tools; and
- the benchmark compares the same task with and without WebMCP.

## Future work

Add only after the employee zero-balance demo works:

- multiple employers;
- business and professional income;
- married-couple tax configurations;
- final-taxed, non-taxable, and foreign income;
- valid evidence handling for deductions;
- underpayment, billing, and overpayment review;
- correction returns;
- official field mapping maintained with tax-domain review;
- scanned-document OCR and additional official document layouts;
- encrypted authenticated persistence; and
- a government-operated deployment integrated with real Coretax services.

## Source references

These sources define the workflow represented by this PRD. Product behavior must be rechecked against them before recording the final demo.

- [Coretaxpedia: Lapor SPT Tahunan Orang Pribadi](https://www.pajak.go.id/coretaxpedia/lapor-spt-tahunan-orang-pribadi), updated 27 February 2026.
- [DJP: SPT Tahunan Coretax DJP resource hub](https://www.pajak.go.id/lapor-tahunan).
- [DJP employee guide: Tata Cara Pelaporan SPT Tahunan PPh Wajib Pajak Orang Pribadi Karyawan Pada Coretax](https://www.pajak.go.id/sites/default/files/2025-12/Panduan%20SPT%20OP%20Karyawan_2025.pdf), version 18 December 2025.
- [JDIH Kementerian Keuangan: PER-11/PJ/2025](https://jdih.kemenkeu.go.id/dok/per-11pj2025/overview), active reporting regulation established 22 May 2025.
- [DJP: Formulir SPT Tahunan Wajib Pajak Orang Pribadi](https://www.pajak.go.id/index.php/id/formulir-pajak/formulir-spt-tahunan-wajib-pajak-orang-pribadi), current 2025 form.
- [DJP: Anda Karyawan? Pastikan Hal-Hal Ini Sebelum Pelaporan SPT Tahunan Lewat Coretax!](https://www.pajak.go.id/id/artikel/anda-karyawan-pastikan-hal-hal-ini-sebelum-pelaporan-spt-tahunan-lewat-coretax).
- [DJP: Ayo! Aktivasi Akun Coretax DJP](https://www.pajak.go.id/id/artikel/ayo-aktivasi-akun-coretax-djp).
- [DJP: Pentingnya Menghitung Harta Pribadi pada Akhir Tahun](https://pajak.go.id/id/artikel/pentingnya-menghitung-harta-pribadi-pada-akhir-tahun).
