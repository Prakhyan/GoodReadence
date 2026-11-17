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
