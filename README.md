# GoodReadence

GoodReadence is a personal PDF and EPUB reader with page turns, bookmarks, highlights, reading goals, and background sounds. It is owned by Prakhyan Nagarajan.

**© 2026 Prakhyan Nagarajan · GoodReadence. All rights reserved.**

## Try the reader

1. Open [GoodReadence](https://goodreadence.vercel.app) on your phone or computer. The GitHub repository is where the code lives.
2. Choose **Add books** for a PDF, EPUB, DOCX, PPTX or JPG/PNG images. Office documents open as readable text; export them as PDF to keep their original layout.
3. Use the reader's settings to choose one ambience recording, change its volume, or turn ambience off.

The reader keeps selected books and reading progress in this browser on this device. It does not upload books to a GoodReadence account or sync them between devices. Browser data can be cleared or removed by the browser, so keep separate copies of books that matter to you.

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

The project is a static website: it has no sign-in, payment, or cloud book storage. Deployment settings should use the repository root, with no build command and `.` as the output directory unless Vercel detects the static site automatically.

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

`library.html` offers 100 complete, source-credited PDF classics, with original-edition covers, author biographies, page counts and freely available source EPUBs. The archives are served under `public-books/` for manual download, outside app caching and HTML fallbacks. Original Project Gutenberg licences are retained; source editions state public-domain status in the USA, with local rules noted on the library page. `public-books/catalog.json` records source links, mirrors and file hashes.

Update badges now use one stable release identifier shared by every page and retain acknowledged release IDs. When publishing an approved new release, update the shared identifier in `premium-upgrade.js` and the matching `release.json` entry, alongside Updates. Do not use per-request server headers as release identifiers.

The public catalogue displays 12 books per page, searches all 100 titles, and adds selected PDFs directly to the existing private browser library. Author details and dated Open Library ratings live in an in-page dialog. See `docs/PUBLIC-LIBRARY.md` for sources, licence attribution and build checks.
