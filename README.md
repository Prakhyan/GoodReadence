# GoodReadence

GoodReadence is a personal reading app for PDF and EPUB books. It includes a local library, reading progress, bookmarks, highlights, search, reading goals, themes, page-turn sounds, and recorded ambience.

## Run locally

Open `index.html` in a current desktop browser. Keep `vendor/`, `ambience/`, `epub.js`, and `reading-room.css` beside it. Browser file restrictions can vary. A local static web server is recommended when PDF workers or browser storage do not work from a `file:` URL.

Imported books and reading state are stored in the browser using IndexedDB and localStorage. This repository does not provide an upload service, user accounts, or a cloud backup service. Browser storage can be cleared or evicted. Keep independent copies of important books.

EPUB imports are limited to 100 MB, 5,000 archive entries, 8 MB per extracted XML entry, and 32 MB total extracted XML to limit memory use from unusually large archives.

## Before public launch

The `docs/legal-drafts/` files are working drafts, not final policies. Do not present them as final until the operator identity, hosting and log practices, jurisdiction, audience, and legal review are complete. The security and deployment audit is in `docs/LAUNCH-READINESS.md`.

The site has not been deployed by this repository setup. A real domain is needed before creating canonical URLs and a sitemap. No Vercel project, DNS zone, analytics, or monitoring service has been connected here.

## Sound credits

See [`ambience/CREDITS.html`](ambience/CREDITS.html) for recording sources and license notices.
