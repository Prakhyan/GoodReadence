<p align="center"><img src="brand-mark.svg" width="76" alt="GoodReadence"></p>

<h1 align="center">GoodReadence</h1>
<p align="center">Good riddance to bad reads.</p>
<p align="center"><a href="https://goodreadence.vercel.app/">Open the reading room</a> · <a href="https://goodreadence.vercel.app/library">Explore the public library</a> · <a href="https://goodreadence.vercel.app/help">Help & FAQ</a></p>

A free, local-first reading room from **Casid Studio**. Read your own documents or choose from **750 complete classics**, with book-style page turns, a personal shelf and tools for making the next chapter yours.

## The reading room

- Crisp PDF pages with spread, single-page and scrolling views.
- EPUB typography controls, ten hardcover colours, reading themes and ambient sound.
- Highlights, freehand marks, notes, bookmarks, reading goals and statistics.
- Complete public-library PDFs with original source files, covers and edition credits.
- ZIP backup and restore, annotation exports and direct device transfer.
- Optional installation and offline access to books already saved on the device.

Books and reading data stay in the current browser by default. Clearing browser storage can remove them: keep a backup outside the browser. Personal-cloud connection code is included, but public sign-in requires provider registrations; see [cloud setup](docs/CLOUD-SETUP.md). Online lookup and public-library downloads use the network when requested.

## Try it

Visit the [live app](https://goodreadence.vercel.app/), choose **Enter your reading room**, then **Public library** or **Add books**. No account is required. Start with [Help & FAQ](https://goodreadence.vercel.app/help) for installation, supported imports and backups.

Explore [Pride and Prejudice](https://goodreadence.vercel.app/library/pride-and-prejudice), [Dracula](https://goodreadence.vercel.app/library/dracula) or [The Adventures of Sherlock Holmes](https://goodreadence.vercel.app/library/adventures-of-sherlock-holmes). Each book has a complete edition, author details and a direct reading link.

## Run locally

Install Node.js, open a terminal in this folder and run:

```sh
npm run preview
```

Open **http://127.0.0.1:8799**. Use this local server rather than opening HTML files directly: workers, modules and browser storage require a proper web origin. The deployed app is static and uses bundled dependencies. Run `npm run build:static` to regenerate crawlable catalogue and book pages; Vercel runs this dependency-free generation when publishing.

## Repository map

| Location | Purpose |
| --- | --- |
| `index.html`, `reader-*.js`, related styles | Home, personal shelf and PDF reading room |
| `reader-epub.js`, `reading-comfort.*` | EPUB reading and reading comfort tools |
| `library.*`, `library-data.json` | Paginated public-library interface and generated metadata |
| `public-books/` | Complete PDFs, original EPUBs, covers and source catalogue |
| `portable-data.js`, `portability-*`, `device-transfer.js`, `cloud-*` | Backups, exports, transfers and optional personal-cloud integrations |
| `vendor/`, `ambience/`, `textures/` | Locally served engines, recordings and visual assets |
| `scripts/` | Current preview, verification and library maintenance tools |
| `docs/` | Current project guides and rights/dependency records |
| `docs/archive/`, `scripts/archive/` | Historical plans and one-time import tools |

Local research, generated print intermediates, personal backups and retired prototypes are ignored by Git. Documentation and automation are excluded from the deployed site.

## Checks and maintenance

```sh
npm ci
npm run check:vendor
npm run audit:security
```

Browser checks use Playwright. Install a browser with `npx playwright install chromium`; on Windows the checks can use installed Edge. Run the preview server, then `npm run test:library`. `PLAYWRIGHT_MODULE` and `BROWSER_CHANNEL` allow an existing test installation/browser to be used.

See the [documentation index](docs/README.md), [library maintenance and rights policy](docs/PUBLIC-LIBRARY.md), [security review](docs/SECURITY-REVIEW.md) and [contributing guide](CONTRIBUTING.md). Release notes are organized by version on the [Updates page](https://goodreadence.vercel.app/updates.html).

## Credits and rights

Book texts, source covers, biographies and bundled libraries have their own attribution and licensing terms. See each book’s **More Info**, its retained source licence and [dependency credits](docs/DEPENDENCIES-AND-LICENSES.md). The book screening record is available [here](docs/library-rights-review.json). This repository does not grant a blanket licence over third-party material or the application code.

© 2026 Casid Studio · GoodReadence.
