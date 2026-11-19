# GoodReadence

GoodReadence is a personal PDF and EPUB reader with page turns, bookmarks, highlights, reading goals, and background sounds. It is owned by Prakhyan Nagarajan.

**© 2026 Prakhyan Nagarajan · GoodReadence. All rights reserved.**

## Try the reader

1. Open [GoodReadence](https://goodreadence.vercel.app) on your phone or computer. The GitHub repository is where the code lives.
2. Choose **Add books** for a PDF, EPUB, DOCX, PPTX or JPG/PNG images. Office documents open as readable text; export them as PDF to keep their original layout.
3. Use the reader's settings to choose one ambience recording, change its volume, or turn ambience off.

The reader keeps selected books and reading progress in this browser on this device. There is no GoodReadence reader account or book-storage backend. You can move books with full ZIP backups or direct QR/WebRTC transfer. Optional personal-cloud connections are implemented but require provider registration before public activation. Browser data can be cleared or removed by the browser, so keep separate copies of books that matter to you.

Choose **Prepare a book** to merge PDFs, extract pages or chapters, make an image book, or compress a copy. Compression changes pages into images; your original file is kept unchanged. The reader's new controls offer single page, spread or scroll views, reading backdrops, local notes, and read-aloud with an installed device voice. The home page has a light/dark switch.

The bottom toolbar also offers **Draw**: choose a highlighter colour and size, draw with a mouse, stylus or finger, and use Erase or Undo to adjust marks. Drawings are saved with the local book; they do not alter the original PDF. The three-line menu and its panels open from the bottom.

The site starts in light mode. Choosing dark mode explicitly saves that preference across the home and information pages. Social links are collected on Contact. The current book-and-bookmark artwork is original and dedicated under CC0; see [branding details](docs/BRANDING.md).

After one online visit, the app can reopen saved books offline. Supporting browsers show **Install app**; on iPhone, use Safari's **Share → Add to Home Screen**. Previously cached ambience can also play offline.

See the [feature checklist and limitations](docs/FEATURE-IMPLEMENTATION.md) for the blueprint's implementation status.

## Project files, in plain language

- `index.html` — the main reading app. This is the page Vercel opens first.
- `reading-room.css` — colors, layout, and mobile styling.
- `premium.css` — the logo palette, appearance switch, preparation dialogs and new reader controls.
- `reader-addons.js` — file preparation, Office import, notes, views and read-aloud.
- `freehand.js` — local freehand highlighting, sizes, colours, erasing and undo.
- `appearance.js`, `site.css` — shared appearance and information-page styling.
- `brand-mark.svg`, `favicon.svg` — original CC0 book-and-bookmark artwork.
- `audio-cache.js`, `manifest.webmanifest`, and `icon-*.png` — offline caching and installation support.
- `epub.js` — code that opens EPUB books.
- `vendor/` — the local PDF reading tools used by the app.
- `ambience/` — sound recordings, their list, and credit/licence information.
- `about.html`, `faq.html`, `contact.html`, `updates.html` — the information and help pages.
- `vercel.json` — website hosting and security settings for Vercel.
- `docs/` — internal launch notes and legal working drafts. Vercel is configured to leave this folder off the public website.

## GitHub and Vercel

- **GitHub** stores the project files. The `main` branch is the current version.
- **Vercel** turns the GitHub project into a website and gives it a shareable address ending in `.vercel.app`.
- To view the reader on a phone, open that Vercel address. Opening a GitHub file shows the code, not the app.

The project is a static website with no GoodReadence account backend, payment backend or server-side book storage. Optional cloud connections authenticate directly with the user’s provider. Deployment settings should use the repository root, with no build command and `.` as the output directory unless Vercel detects the static site automatically.

## Help and credits

- [Help and common questions](faq.html)
- [Contact Prakhyan](mailto:goodreadence@proton.me)
- [Sound sources and licences](ambience/CREDITS.html)
- [Launch and security checklist](docs/LAUNCH-READINESS.md) (internal)

The legal working drafts have been reviewed by a lawyer according to the owner. They are still kept internal until the live hosting details and any required public contact information are confirmed.

## Publishing update notices

Keep Updates current for every approved live release. The navigation badge compares the published update page fingerprint with the last version the visitor opened. `release.json` provides a release identifier and offline fallback; advance it when publishing a new approved release.

The home page contains the full About story. Merge accepts repeated additions of PDF, DOCX, PPTX, EPUB and JPG/PNG files, within the existing device memory limits. Office/EPUB merge conversion produces text-based flattened pages; export as PDF first for faithful layout. Desk texture credits are in `textures/CREDITS.md`.

## Reader refinements and the public library

Paper rustle is restored, with the end-click oscillator removed. Mobile turns use shorter animations and smaller animation-only canvases; static pages keep their normal resolution. The Midnight desk applies the Midnight paper theme. Read-aloud covers only the visible PDF page or spread and stops at the end. Its voice quality depends on installed local device voices.

`library.html` offers 500 complete, source-credited PDF classics, with original-edition covers, author biographies, page counts and freely available source EPUBs. The archives are served under `public-books/` for manual download, outside app caching and HTML fallbacks. Original Project Gutenberg licences are retained; source editions state public-domain status in the USA, with country-specific review recorded in the project documentation. `public-books/catalog.json` records source links, mirrors and file hashes.

Update badges now use one stable release identifier shared by every page and retain acknowledged release IDs. When publishing an approved new release, update the shared identifier in `premium-upgrade.js` and the matching `release.json` entry, alongside Updates. Do not use per-request server headers as release identifiers.

The public catalogue displays 12 books per page, searches all 500 titles, and adds selected PDFs directly to the existing private browser library. Author details and dated Open Library ratings live in an in-page dialog. See `docs/PUBLIC-LIBRARY.md` for sources, licence attribution and build checks.

## Backup, notes export and device transfer (1.3.0)

Choose **Backup & transfer** in the personal library. Full ZIP backups include original files, reading data and settings; selected-book backups let you split a large shelf into smaller archives. Restore previews contents before changing storage and keeps conflicting copies unless you choose to replace matching books. Clearing site data still removes the local library; the external ZIP is what lets you restore it afterward.

Shelf book menus and Margin notes offer **Export notes** as Markdown or text. Selectable PDF/EPUB highlight text is included when available. Freehand shapes stay in the ZIP backup and are described by page in text exports.

**Device transfer** uses a sending QR plus a reply QR to establish a direct encrypted WebRTC data channel. There is no book-storage relay. Same-Wi-Fi is preferred; Google STUN is optional for different networks, and no TURN relay is configured. Camera frames stay on the scanning device. Keep both apps open.

Cloud connections are **not active yet**: the owner must register Google Drive, Dropbox and/or OneDrive and supply public client IDs. [Beginner setup instructions](docs/CLOUD-SETUP.md) explain each registration. No client secret belongs in the static app. Cloud transport and conflict handling are tested with simulated provider APIs; actual provider sign-in requires live registrations and testing. Tokens stay in memory. Cloud books upload once by content hash; reading updates use per-device manifests.

Limits: ZIP backups 1 GB total / 300 MB per book; cloud books 128 MB; QR transfer 128 MB including saved marks and archive overhead. Clouds use the owner of each connected account’s storage allowance. The app has no always-running background sync service.

New source files: `portable-data.js`, `portability-ui.js`, `portability.css`, `device-transfer.js`, `cloud-sync.js`, `cloud-config.json`, and `cloud-callback.*`. Dependencies and licences are in `vendor/PORTABILITY-CREDITS.md`. [Privacy & data](privacy.html) describes the optional data flows.

Local preview: `node scripts/serve-local.cjs` → http://127.0.0.1:8799. Tests: `node scripts/check-portability.cjs`, `node scripts/check-transfer-edges.cjs`, `node scripts/check-cloud-sync.cjs` with `GR_BASE_URL` set to the preview URL. Cloud tests simulate account/provider responses and do not prove real registration approval.

## Reading-room polish (1.4.0)

Phone headers use one navigation row and consistent library actions. Page-preview canvases are contained in a responsive grid. Mark up groups the box highlighter, freehand brush, ink controls and erasers; original saved marks and drawing behavior are retained. Backup tools sit at the shelf footer and bottom-right of settings.

About is a shorter feature overview. The original purple-and-white ribbon monogram is supplied as SVG, favicon and install icons. The landing footer and FAQ display the release version. Reading statistics offer 7/30-day views, bar/line/area charts, period totals, daily averages and an accessible daily table. Streak fire uses lightweight SVG/CSS animation with reduced-motion support.

Read-aloud joins PDF line wraps, preserves punctuation and uses longer passages to avoid repeated utterance delays. Natural/premium local voices are preferred when installed; actual speech quality still depends on the device. Reading stops when the current page/spread ends or the user changes pages. `scripts/check-reader-polish.cjs` checks phone layouts, real PDF thumbnails, saved drawing marks, stats and speech scheduling (speech engine simulated). Visual/layout rules are in `reader-polish.css`; control grouping is in `reader-polish.js`.
