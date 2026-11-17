# Changelog

## Toolbar, freehand and information refresh — 2026-11-18

- Combined View, Desk, Notes, Draw and Read aloud into the bottom toolbar and moved the menu and its panels to the bottom.
- Added vector freehand highlighting for mouse, pen and touch, with adjustable size, four colours, stroke erasing, session undo and clear-page controls. Drawings persist with each book in IndexedDB and appear in flip and scroll views.
- Replaced the supplied raster logo with an original CC0 book-and-bookmark mark, matching favicon and installation icons.
- Made light the default appearance and shared explicit saved light/dark choices across Home, About, Updates, FAQ, Contact and 404, including back/forward navigation.
- Rewrote About with a longer product introduction, published the full release history, and expanded the FAQ to 43 product questions.
- Limited social links to Contact, using linked service icons and the corrected LinkedIn profile at `https://www.linkedin.com/in/prakhyan/`.

## Blueprint additions — 2026-11-18

- Added the supplied logo, saved home-page light/dark switch, and ivory/charcoal/violet library styling.
- Added local PDF merge, page/chapter extraction, optional image-based compression, and image-to-book preparation.
- Added DOCX/PPTX text import, explicit view selection, four-page continuous-scroll rendering, local margin notes, local-voice read-aloud, reading backdrops and a time estimate.
- Added an installable app manifest, icons and cached app shell for offline reopening of saved books.
- Migrated new PDF annotation writes to IndexedDB and added a local reader-settings backup there.
- Documented format, compression, voice and device limits in `docs/FEATURE-IMPLEMENTATION.md`.

## Follow-up readiness work — 2026-11-16

- Replaced the station-focused train recording with a 12:02 CC0 passenger-train recording featuring wheel and rail rumble; updated the track catalog and credits.
- Replaced the rain option with a clean rain-on-roof recording without added insect layers; its source is rated 4.8/5 across five ratings.
- Added unpublished legal drafts for Terms of Use, Acceptable Use, Copyright/IP, complaint handling, and the product Disclaimer. Updated launch notes to reflect Vercel as the preferred host and optional anonymous Vercel Web Analytics as the selected analytics preference; neither is activated.
- Verified a generated PDF import and render at a 390 px mobile viewport in Edge emulation, with no horizontal overflow. Physical phone testing remains outstanding.
- Verified the replacement train audio decodes and plays for more than ten minutes in Edge emulation.

## Owner and beginner updates — 2026-11-17

- Added Prakhyan Nagarajan's owner name and a © 2026 notice to the public information page footers.
- Rewrote the repository README in plain language, including how to view the live app, add a book, and find the main project files.
- Updated the internal legal drafts and launch checklist with the supplied owner and no-age-gate details; hosting, jurisdiction, and child-related review remain open.

## Unreleased audit build — 2026-11-16

- Imported the existing local GoodReadence reader into the GitHub repository.
- Added Mozilla’s documented PDF.js mitigation for CVE-2024-4367 to each PDF-loading path.
- Added About, Help/FAQ, Updates, Contact, and custom 404 pages.
- Added initial Vercel security headers and launch-readiness documentation.
- Added explicitly marked, unpublished legal drafts for review.
- Added local reader/audio assets and preserved the ambience credit page.
- Not deployed. No host, domain, analytics, or monitoring provider was activated.
