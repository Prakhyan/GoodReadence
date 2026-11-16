# Changelog

## Follow-up readiness work — 2026-11-16

- Replaced the station-focused train recording with a 12:02 CC0 passenger-train recording featuring wheel and rail rumble; updated the track catalog and credits.
- Verified a generated PDF import and render at a 390 px mobile viewport in Edge emulation, with no horizontal overflow. Physical phone testing remains outstanding.
- Verified the replacement train audio decodes and plays for more than ten minutes in Edge emulation.

## Unreleased audit build — 2026-11-16

- Imported the existing local GoodReadence reader into the GitHub repository.
- Added Mozilla’s documented PDF.js mitigation for CVE-2024-4367 to each PDF-loading path.
- Added About, Help/FAQ, Updates, Contact, and custom 404 pages.
- Added initial Vercel security headers and launch-readiness documentation.
- Added explicitly marked, unpublished legal drafts for review.
- Added local reader/audio assets and preserved the ambience credit page.
- Not deployed. No host, domain, analytics, or monitoring provider was activated.
