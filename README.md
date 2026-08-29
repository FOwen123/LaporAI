# LaporAI

LaporAI is an unofficial, local-only simulation of an Indonesian employee annual tax return. It demonstrates how a citizen and a browser agent can work on the same visible form through state-aware WebMCP tools while the citizen retains control over document selection, approval, declaration, signing, and simulated submission.

> **Fictional demo only.** Do not enter a real NIK, NPWP, Coretax password, tax document, address, phone number, bank account, OTP, or signing passphrase. LaporAI is not affiliated with Direktorat Jenderal Pajak and is not tax advice.

## Run locally

Requirements: Node.js 20 or later, pnpm, and a WebMCP-enabled Chrome build for agent tool testing.

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite. Ordinary browsers can complete the full manual demo; they simply show WebMCP as unavailable.

Public fictional credentials:

```text
Email: demo@laporai.example
Password: LaporAI2026!
```

You can also create a synthetic taxpayer from the login screen. Generated identifiers begin with `DEMO-` and generated email addresses end in `.example`.

## Judge walkthrough

1. Continue as the demo taxpayer.
2. Open **Dokumen Saya**, download the supplied fictional BPA1 PDF, select it using the human-operated file input, review the extracted values, and import it. The bundled-sample button provides a quick fallback.
3. Open **Annual return**, create the normal 2025 `PPh Orang Pribadi` draft, and run `Posting SPT`.
4. Review the BPA1, assets, liabilities, and dependents. The scenario deliberately includes a potentially missing fixed deposit and an outdated vehicle-financing balance.
5. Ask the browser agent to inspect the return. WebMCP mutations produce an exact visible proposal; approve one and reject another. Use the one-step undo while the return is editable.
6. Run validation. Resolve all blocking issues, open the declaration, acknowledge the fictional-demo warning, and use the human-only simulated filing button.
7. Confirm the local receipt is stamped `FIKTIF` and `DEMO TIDAK RESMI`.

Use **Reset all demo data** to clear the profile, draft, activity, receipt, and benchmark runs from browser storage.

## WebMCP behavior

LaporAI uses both APIs:

- The imperative API registers structured read and mutation tools from `document.modelContext`. Registration changes with login and filing state, and stale calls are rejected.
- The declarative API annotates the visible draft and document-review forms. File selection remains a native human action.

No taxpayer tools exist before demo login. Editing tools disappear on the declaration and receipt screens. There are deliberately no tools for credentials, file selection, payment, declaration, signing, or submission.

Core tools include `get_filing_requirements`, `review_prefilled_data`, `get_section_data`, `validate_return`, `add_asset`, `update_asset`, `remove_asset`, `update_liability`, and `update_dependent_details`. Tools read the same reducer state shown on screen; mutations require a visible approve/reject decision and are attributed to `Agent` in activity history.

WebMCP is experimental. Follow the current [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/agents) for supported builds, flags, or origin-trial requirements.

## Benchmark

Open **Benchmark**, choose manual, screen-operated agent, or WebMCP agent mode, then complete the same fixture and finish the run. Record at least three complete runs per mode and compare medians for duration, visible actions, errors, and WebMCP tool calls. Results apply only to this disclosed scenario; do not claim universal speed improvements.

Recommended test script for every run:

1. Reset and enter through the public demo account.
2. Load the bundled BPA1, create the 2025 draft, and post records.
3. Add the fictional fixed deposit at Rp10,000,000.
4. Update vehicle financing to Rp8,000,000 and set dependents to zero.
5. Review all records and reach a valid Rp0 result.

Disclose browser version, agent/model, machine, run count, and any retries with recorded results.

## Privacy and security

- There is no backend, database, analytics service, production authentication, or AI SDK.
- PDF parsing and tax calculations run in the browser. Raw file bytes remain in memory and are not persisted.
- Only the documented fictional text-based BPA1 format is accepted; files over 2 MB, unsupported PDFs, and content resembling a 16-digit real identifier are rejected.
- A restrictive Content Security Policy blocks third-party scripts, remote connections, embedded objects, and cross-origin form submission.
- React renders agent-supplied strings as text. WebMCP tools have narrow schemas and derive the active taxpayer and tax year from page state.
- Browser storage contains only disposable fictional data. If storage is unavailable, the current session remains usable but will not survive refresh.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
```

The tests cover synthetic identifier safety, draft transitions, one-step undo, BPA1 parsing boundaries, deterministic validation, state-aware WebMCP availability, demo entry, and the human-only final action.

## Official references

- [Coretaxpedia: Lapor SPT Tahunan Orang Pribadi](https://www.pajak.go.id/coretaxpedia/lapor-spt-tahunan-orang-pribadi)
- [DJP employee filing guide, 18 December 2025 (PDF)](https://www.pajak.go.id/sites/default/files/2025-12/Panduan%20SPT%20OP%20Karyawan_2025.pdf)
- [PER-11/PJ/2025](https://jdih.kemenkeu.go.id/dok/per-11pj2025/overview)
- [DJP 2025 individual annual return form](https://www.pajak.go.id/index.php/id/formulir-pajak/formulir-spt-tahunan-wajib-pajak-orang-pribadi)

See [PRD.md](./PRD.md) for the product boundary and source-check dates, [TODO.md](./TODO.md) for implementation status, and [DESIGN.md](./DESIGN.md) for the visual system.
