# GoodReadence

GoodReadence is a personal PDF and EPUB reader with page turns, bookmarks, highlights, reading goals, and background sounds. It is owned by Prakhyan Nagarajan.

**© 2026 Prakhyan Nagarajan · GoodReadence. All rights reserved.**

## Try the reader

1. Open the live Vercel website on your phone or computer once it has been deployed. The GitHub repository is where the code lives; it is not the live website.
2. In the reader, choose **Add a book** and pick a PDF or EPUB from your device.
3. Use the reader's settings to choose one ambience recording, change its volume, or turn ambience off.

The reader keeps selected books and reading progress in this browser on this device. It does not upload books to a GoodReadence account or sync them between devices. Browser data can be cleared or removed by the browser, so keep separate copies of books that matter to you.

## Project files, in plain language

- `index.html` — the main reading app. This is the page Vercel opens first.
- `reading-room.css` — colors, layout, and mobile styling.
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
