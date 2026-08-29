# LaporAI implementation checklist

Source: [PRD.md](./PRD.md)  
Build mode: Autonomous  
Language: English for code, documentation, and repository content. The product interface remains Bahasa Indonesia as required by the PRD.  
Method: Write a failing test first for every behavior, implement the smallest fix, then run tests, type checking, and linting.  
Git cadence: Commit after each completed checklist item.

## Definition of done

- The supported employee zero-balance return works manually and through WebMCP.
- A judge can use a demo account or create a synthetic taxpayer without entering real government data.
- A judge can download and locally process the supplied fictional BPA1 PDF.
- The browser never sends taxpayer or document data to a server.
- WebMCP tools change with page state and cannot sign, pay, declare, select files, or submit.
- Relevant tests, type checking, linting, accessibility checks, and the browser walkthrough pass.
- The repository contains setup instructions, demo credentials, benchmark instructions, and the fictional-data warning.

## Checklist

- [ ] **1. Bootstrap the web application**
  PRD ref: `Suggested implementation tools`
  What to build: Create a minimal React, TypeScript, Vite, Tailwind CSS, and pnpm application. Add the existing project test, type-check, and lint commands. Do not add a backend, database, authentication provider, AI SDK, or component library.
  Acceptance: The app renders a labelled LaporAI placeholder and the repository has working test, type-check, and lint commands.
  Verify: Run `pnpm test`, `pnpm typecheck`, and `pnpm lint`.

- [ ] **2. Define the synthetic tax data and state transitions**
  PRD ref: `Official filing requirements represented in the demo`, `Database decision`, and `Security and privacy requirements`
  What to build: Write failing tests for the taxpayer, BPA1, income, withholding, asset, liability, dependent, draft, validation, activity, and receipt states. Add versioned fictional fixtures, invalid `DEMO-*` identifiers, `.example` contact data, local persistence, reset behavior, and explicit filing states.
  Acceptance: Fixtures cannot contain numeric NIK or NPWP values. Refresh restores a draft, reset clears it, duplicate draft creation returns the existing draft, and invalid state transitions fail without mutation.
  Verify: Run the state tests, `pnpm typecheck`, and inspect browser storage after reset.

- [ ] **3. Build the Indonesian app shell and simulated login**
  PRD ref: `Indonesian visual direction`, `Interactive demo access and documents`, and `Demo login safety`
  What to build: Implement the ivory, indigo, muted-gold, and restrained red visual system with subtle kebaya and kawung details. Add the persistent unofficial-demo notice, keyboard-accessible navigation, visible demo credentials, synthetic taxpayer creation, login errors, and logout/reset controls.
  Acceptance: A judge can enter through either demo path without real data. Numeric NIK or NPWP-like credentials are rejected. The interface meets keyboard, focus, contrast, and reduced-motion requirements.
  Verify: Run component tests, automated accessibility checks, and complete both login paths with keyboard only.

- [ ] **4. Build the fictional document center and BPA1 parser**
  PRD ref: `Interactive demo access and documents` and `Bring a fictional withholding document`
  What to build: First test supported, duplicate, oversized, encrypted, scanned, unknown, and real-identifier-like file cases. Add `Dokumen Saya`, a downloadable fictional document pack, one text-based BPA1 PDF, a human-operated file input, local text extraction, extraction review, replacement behavior, and manual fallback. Keep raw bytes in memory only.
  Acceptance: The supplied PDF extracts employer, period, gross income, deductions, net income, tax due, and tax withheld. Nothing leaves the browser. Unsupported or suspicious files produce a specific error and no import.
  Verify: Run parser tests, inspect network activity during upload, and complete download, upload, review, import, replacement, and rejection flows in the browser.

- [ ] **5. Implement draft creation, posting, and progress**
  PRD ref: `Draft setup`, `Prefilled posting and review`, and `Core user journey`
  What to build: Add the Coretax-inspired portal menus, annual return draft creation, tax year and normal-filing selection, `Posting SPT`, source labels, per-record review state, section progress, and unsupported-branch notices.
  Acceptance: A supported taxpayer can create one draft per tax year, post fictional records, see their sources, and mark each record reviewed. Unsupported tax situations stop progression without invented guidance.
  Verify: Run workflow tests and complete the draft and posting flow manually in the browser.

- [ ] **6. Implement the main return and conditional sections**
  PRD ref: `Main return`, `Employment income and withholding`, and `Tax payments, deductions, and conditional evidence`
  What to build: Add the identity, spouse status, income summary, PTKP, taxable income, tax credit, payment result, correction, refund, PPh Pasal 25, other transactions, and attachment groups. Use the official order and terminology while keeping unsupported branches read-only or blocked.
  Acceptance: All required main-form groups exist, zero-value sections remain visible where the official form requires them, and conditional answers show or hide the correct sections.
  Verify: Run form tests, compare the supported path against the official employee guide, and exercise each conditional branch once.

- [ ] **7. Implement assets, liabilities, dependents, and activity history**
  PRD ref: `Assets at the end of the tax year`, `Liabilities at the end of the tax year`, `Family and dependents`, and `Human control and activity history`
  What to build: Test and implement add, update, retain, remove, confirmation, attribution, and undo behavior for the three editable attachment groups. Add the deliberate missing asset, outdated liability, linked-record warning, and PTKP mismatch scenario.
  Acceptance: Every mutation shows exact before-and-after values, records `You` or `Agent`, supports one-step undo while editable, and invalidates prior validation.
  Verify: Run mutation tests and complete manual edit, agent edit, rejection, approval, warning, and undo paths.

- [ ] **8. Add validation, calculation, legal guidance, and review**
  PRD ref: `Content fidelity and legal references` and `Validation, declaration, and simulated submission`
  What to build: Test and implement deterministic zero-balance simulation logic, blocking errors, review warnings, field links, completion checks, and plain-language result explanations. Add `Dasar hukum dan panduan` drawers backed only by the PRD's official sources and checked dates.
  Acceptance: Withholding credit without income fails, stale asset or liability values fail, PTKP mismatch warns, unsupported branches block, and the known fixture reaches the expected zero balance. Each major section links to an official source and carries the non-advice notice.
  Verify: Run calculation and validation tests, compare legal references with the linked sources, and complete a failing then passing review in the browser.

- [ ] **9. Register state-aware WebMCP read tools**
  PRD ref: `WebMCP tools > Read-only tools` and `Dynamic registration`
  What to build: Add tests around tool availability and results. Register the read-only tools from the PRD through the native imperative API, and use the declarative API for suitable visible forms. Reuse the same selectors and application functions used by the human interface.
  Acceptance: Tools expose current structured state, never stale fixture data, and register only when their page state permits them. No taxpayer or document tools exist before demo login.
  Verify: Run tool-registration tests and inspect the registered tools at every state in the supported journey.

- [ ] **10. Register controlled WebMCP mutation tools**
  PRD ref: `WebMCP tools > Mutation tools`, `WebMCP boundary`, and `Retain final control`
  What to build: Test schemas, stale calls, invalid identifiers, confirmations, activity attribution, and unregistration. Implement document import, draft creation, prefilled confirmation, asset, liability, dependent, and review-navigation tools through the same state actions as the visible UI.
  Acceptance: Every input is schema-validated, stale or out-of-state calls make no change, and consequential edits require visible confirmation. Credential entry, file selection, declaration, signing, payment, and submission are never tools. Mutation tools disappear on the declaration screen.
  Verify: Run WebMCP tests and complete the full agent-assisted journey, including one rejected proposal and one stale call.

- [ ] **11. Add simulated submission, receipt, and benchmark modes**
  PRD ref: `Validation, declaration, and simulated submission`, `Benchmark plan`, and `Submission proof points`
  What to build: Add the human-only declaration and simulated submission, fictional receipt, deterministic reset, manual mode, screen-operated agent mode, WebMCP mode, action counters, timers, validation errors, retries, tool-call counts, correctness comparison, and disclosed run metadata.
  Acceptance: Only a visible human action can create a receipt marked `FIKTIF` and `DEMO TIDAK RESMI`. All benchmark modes start from the same fixture and report medians from at least three runs without making universal performance claims.
  Verify: Run receipt and benchmark tests, then record three complete runs per mode and confirm equal expected final data.

- [ ] **12. Complete security, accessibility, documentation, and submission evidence**
  PRD ref: `Security and privacy requirements`, `Submission proof points`, and `Source references`
  What to build: Add a restrictive Content Security Policy, dependency review, final accessibility pass, test coverage for trust boundaries, setup instructions, demo credentials, fictional document instructions, reset instructions, supported-browser notes, source citations, benchmark script, screenshots, and demo-video outline.
  Acceptance: No remote data requests, secrets, trackers, real-looking identifiers, official logos, unrestricted WebMCP tools, or unlabelled simulated controls remain. A new judge can clone the repository and complete the demo from the README.
  Verify: Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, the accessibility checks, and the full browser walkthrough. Inspect the network log and registered WebMCP tools. Review every submission proof point against the recorded demo.

