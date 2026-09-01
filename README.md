# LaporAI

LaporAI is an unofficial, local-only simulation of an Indonesian employee annual tax return. It demonstrates how a citizen and a browser agent can work through the same visible filing pages using state-aware WebMCP tools while the citizen retains control over approvals, declaration, signing, and simulated submission. WebMCP lets the agent read exact filing requirements, inspect imported records, navigate the workflow, and propose evidence-backed corrections without guessing from the interface.

> **Fictional demo only.** Do not enter a real NIK, NPWP, Coretax password, tax document, address, phone number, bank account, OTP, or signing passphrase. LaporAI is not affiliated with Direktorat Jenderal Pajak and is not tax advice.

## Judge walkthrough

1. Continue as the demo taxpayer.
2. Open **File tax return**. The seven-step workspace starts on Documents and includes BPA1, bank-statement, and financing-statement samples for the active synthetic taxpayer.
3. Ask the browser agent to help choose a document source. `choose_document_source` asks whether to use personal PDFs or the three profile-matched samples. Personal fictional PDFs use `upload_tax_document`; documents generated for another profile are rejected.
4. Move through Employment income, Assets, Liabilities, and Family. The progress header remains visible and the activity rail attributes each change to `You` or `Agent`.
5. Ask the agent to review the supporting documents. It will find a fixed deposit missing from Assets and a vehicle-financing balance that differs from the imported statement.
6. Ask the agent to propose each document-backed correction. WebMCP opens the affected page and produces an exact visible proposal; approve one and reject another.
7. Run validation, open the declaration, acknowledge the no-government-submission warning, and use the human-only filing button. Confirm the receipt states that no return was sent to the Indonesian government.

Use **Reset all data** to clear the profile, draft, activity, receipt, and benchmark runs from browser storage.

## How this differs from official Coretax

Official Coretax uses **Posting** to prefill information already recorded by DJP, including available withholding certificates, tax payments, prior-return assets and liabilities, and family data. The taxpayer must review those records, correct outdated values, and manually add information that DJP does not hold. See the official [individual annual-return workflow](https://www.pajak.go.id/coretaxpedia/lapor-spt-tahunan-orang-pribadi) and DJP's [explanation of prepopulated data](https://www.pajak.go.id/id/artikel/spt-semakin-akurat-dengan-fitur-prepopulated-pada-coretax-djp).

LaporAI uses a different source to demonstrate WebMCP. The taxpayer or agent imports synthetic documents generated for the active synthetic profile. The browser reads those documents locally, compares their extracted values with the visible return, and exposes the differences to the agent. The agent can suggest an evidence-backed correction, but it cannot change a return record without the taxpayer's visible approval.

## Coretax terminology

| Term on the website | Meaning | U.S. comparison or distinction |
| --- | --- | --- |
| Coretax | Indonesia's tax administration system | No direct equivalent to the complete system. |
| DJP | Directorate General of Taxes, Indonesia's tax authority | Comparable role to the IRS. Appears in legal references and filing warnings. |
| NIK | Population identification number | No direct U.S. equivalent. Appears in warnings against entering real identifiers. |
| NPWP | Taxpayer identification number | Similar role to a U.S. TIN, not the same identifier. Appears in safety messages and synthetic tax IDs. |
| BPA1 | Employee income-tax withholding certificate | Similar purpose to Form W-2, with different fields and rules. Used in the document import flow. |
| PTKP | Personal tax-free allowance | No direct equivalent. The U.S. standard deduction also reduces taxable income, but its rules differ. Appears in the family section and validation warnings. |
| PPh Pasal 25 | Article 25 income-tax installments | Similar purpose to estimated tax payments, with different calculation and payment rules. Appears beside the installment amount. |
| BPE | Electronic filing receipt | Similar purpose to a filing acknowledgment. Appears only within the fictional receipt ID, not as proof of a government filing. |

Indonesian references: [DJP Coretax overview](https://www.pajak.go.id/id/coretax), [employee filing guide](https://www.pajak.go.id/sites/default/files/2025-12/Panduan%20SPT%20OP%20Karyawan_2025.pdf), [PTKP guidance](https://www.pajak.go.id/penghasilan-tidak-kena-pajak), and [Article 25 installments](https://pajak.go.id/index.php/id/artikel/mengenal-angsuran-pph-pasal-25-bulanan). U.S. comparisons: [taxpayer identification numbers](https://www.irs.gov/tin/taxpayer-identification-numbers-tin), [Form W-2](https://www.irs.gov/forms-pubs/about-form-w-2), [standard deduction](https://www.irs.gov/publications/p501), and [estimated taxes](https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes).

## WebMCP behavior

LaporAI's verified agent workflow uses the imperative API:

- The imperative API registers structured read and mutation tools from `document.modelContext`. Each registration receives an `AbortSignal`; React cleanup aborts it to remove the tools. Registration changes with login and filing state, and stale calls are rejected, including after unmount.
- `get_current_step_requirements` tells the agent what the visible page requires, what is complete, what is missing, whether Next is available, and what to do next.
- `choose_document_source` asks the taxpayer to use personal PDFs or sample documents. The sample choice imports the BPA1, bank, and financing records generated for the active synthetic profile.
- `upload_tax_document` accepts the exact base64 bytes of a PDF the taxpayer supplied to the agent. It uses the same 2 MB limit, local extraction, supported-format checks, and active-taxpayer matching as the human file input.

No taxpayer tools exist before demo login. Editing tools disappear on the declaration and receipt screens. There are deliberately no tools for credentials, operating the system file picker, payment, declaration, signing, or submission.

Core tools include `get_filing_requirements`, `get_current_step_requirements`, `choose_document_source`, `upload_tax_document`, `go_to_filing_step`, `next_filing_step`, `previous_filing_step`, `review_prefilled_data`, `review_supporting_documents`, `reconcile_supporting_documents`, `confirm_prefilled_record`, `get_section_data`, `validate_return`, and asset, liability, and dependent proposal tools. Tools read the same reducer state shown on screen. Record changes require a visible approve/reject decision and are attributed to `Agent` in the activity rail.

After every successful state-changing tool call, LaporAI opens the relevant page, scrolls the affected record or proposal into view, moves keyboard focus to its heading or approval action, and briefly outlines it. Read-only calls, stale calls, and rejected inputs do not move the page. Reduced-motion preferences disable smooth scrolling.

WebMCP is experimental. Follow the current [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp) for supported builds, flags, or origin-trial requirements.

## Privacy and security

- There is no backend, database, analytics service, production authentication, or AI SDK.
- PDF parsing and tax calculations run in the browser. Raw file bytes remain in memory and are not persisted.
- Only the documented text-based BPA1, bank-statement, and financing-statement formats are accepted; files over 2 MB, unsupported PDFs, content resembling a 16-digit real identifier, and documents for a different active synthetic taxpayer are rejected.
- A restrictive Content Security Policy blocks third-party scripts, remote connections, embedded objects, and cross-origin form submission.
- React renders agent-supplied strings as text. WebMCP tools have narrow schemas and derive the active taxpayer and tax year from page state.
- Browser storage contains only disposable fictional data. If storage is unavailable, the current session remains usable but will not survive refresh.

## Official references

- [Coretaxpedia: Lapor SPT Tahunan Orang Pribadi](https://www.pajak.go.id/coretaxpedia/lapor-spt-tahunan-orang-pribadi)
- [DJP employee filing guide, 18 December 2025 (PDF)](https://www.pajak.go.id/sites/default/files/2025-12/Panduan%20SPT%20OP%20Karyawan_2025.pdf)
- [PER-11/PJ/2025](https://jdih.kemenkeu.go.id/dok/per-11pj2025/overview)
- [DJP 2025 individual annual return form](https://www.pajak.go.id/index.php/id/formulir-pajak/formulir-spt-tahunan-wajib-pajak-orang-pribadi)
