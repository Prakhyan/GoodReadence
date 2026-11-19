# Client-side review — 19 November 2026

This is an implementation review and regression check, not an independent penetration test or a guarantee against all vulnerabilities.

## Changes in 1.5.0

- Moved application scripts out of HTML and removed `unsafe-inline`, `data:` and `blob:` from `script-src`. Inline event attributes are blocked. `wasm-unsafe-eval` permits the PDF engine's local image decoders, without enabling JavaScript `eval`. Inline styling remains enabled because reader geometry and themes use dynamic styles.
- Replaced embedded PDF.js 3.11.174 with the pinned legacy-browser build of **6.5.438**, served locally with its worker, character maps, standard fonts and image decoders. PDF scripting is not connected to a scripting manager; XFA and JavaScript evaluation are disabled in the shared engine wrapper. Updated document cleanup for the new loading-task API.
- Updated fflate to **0.8.3**. This resolves the malformed-ZIP64 `unzipSync` loop advisory. Backup import independently uses bounded ZIP32 central-directory parsing and per-file CRC/SHA checks.
- EPUB/Office imports render strings with text nodes/`textContent`, never imported document HTML. Scripts, frames and embedded active elements are omitted from EPUB extraction. Normal doctype declarations are stripped; custom entities are rejected. XML/ZIP size, entry count, duplicate name and path checks apply.
- Definition/article results also enter the DOM as text. Wikipedia source links use a validated numeric page ID and fixed origin. Requests are explicit, unauthenticated and restricted to the two documented API hosts; no document file or OAuth token is sent.
- Public cloud IDs remain empty. Access tokens remain in memory and are excluded from archives. Dropbox and OneDrive use PKCE S256 and state/source/origin-checked callbacks. Google Drive requests only its hidden application-data folder; Dropbox registration uses App folder; OneDrive requests `Files.ReadWrite.AppFolder` for personal accounts. No scope was widened.
- Added a package lock, vendored-file hashes, weekly dependency audit workflow and Dependabot version checks. Updating only the package lock will fail bundle-pin validation until the served files are refreshed too. No runtime install/build is needed for the static app.

## Verification

- Real PDF open/render/release, first/middle/final stack depth, backup/restore, notes extraction and real two-context WebRTC transfer.
- EPUB and Office fixtures containing scripts, event attributes, markup-as-text and external-entity declarations. Imported text remained inert; entity declarations were rejected.
- Direct injected inline-script and `onclick` probes blocked by the production CSP.
- Typography preferences persisted after closing/reopening a book. Weekly backup reminder remains optional and supports a one-week snooze.
- Cloud transport/PKCE/conflicts use simulated provider APIs. Real provider sign-in remains unverified until registration and activation.

`npm audit` returned zero known vulnerabilities for the pinned dependency tree at this review. This does not cover every possible logic flaw in application code, browser engines or undisclosed dependency issues. Keep the audit workflow enabled and apply reviewed bundle updates.

## Primary references

- [Mozilla stable release](https://github.com/mozilla/pdf.js/releases/tag/v6.5.438) and [PDF.js security advisory](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq).
- [fflate ZIP64 advisory and fixed versions](https://github.com/advisories/GHSA-px8p-9vwx-vf98).
- [Google's application-data scope](https://developers.google.com/workspace/drive/api/guides/appdata).
- [Free Dictionary API documentation](https://dictionaryapi.dev/) and [MediaWiki cross-origin requests](https://www.mediawiki.org/wiki/API:Cross-site_requests).

## Continuing limits

Cloud accounts cannot be tested live before registration. A same-origin XSS elsewhere in a future feature would still threaten locally stored data and in-memory tokens, so every new document/remote-data sink needs review. Backups are not password encrypted; reminders protect data only when users actually save an external backup. Lookup is online and English-language. Browser/device PDF compatibility and memory limits still apply.
