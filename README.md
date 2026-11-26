<p align="center"><img src="brand-mark.svg" width="76" alt="GoodReadence"></p>

<h1 align="center">GoodReadence</h1>
<p align="center">Good riddance to bad reads.</p>
<p align="center"><a href="https://goodreadence.vercel.app/">Open the reading room</a> · <a href="https://goodreadence.vercel.app/library">Explore the public library</a> · <a href="https://goodreadence.vercel.app/help">Help & FAQ</a></p>

A free, local-first reading room from **Casid Studio**. Read your own documents or choose from **2,000 complete classics**, with book-style page turns, a personal shelf and tools for making the next chapter yours.

## The reading room

- Crisp PDF pages with Dual, single-page and scrolling views.
- EPUB typography controls, ten hardcover colours, reading themes and ambient sound.
- Highlights, freehand marks, notes, bookmarks, reading goals and statistics.
- An on-demand public library with complete-book PDF preparation, covers and edition credits.
- ZIP backup and restore, annotation exports and direct device transfer.
- Optional installation and offline access to books already saved on the device.
- Compact ambience on demand, with individual offline downloads only when requested.

Books and reading data stay in the current browser by default. Clearing browser storage can remove them: keep a backup outside the browser. Personal-cloud connection code is included, but public sign-in requires provider registrations; see [cloud setup](docs/CLOUD-SETUP.md). Online lookup and public-library downloads use the network when requested.

## Try it

Visit the [live app](https://goodreadence.vercel.app/), choose **Enter your reading room**, then **Public library** or **Add books**. No account is required. Start with [Help & FAQ](https://goodreadence.vercel.app/help) for installation, supported imports and backups.

Explore [Pride and Prejudice](https://goodreadence.vercel.app/library/pride-and-prejudice), [Dracula](https://goodreadence.vercel.app/library/dracula) or [The Adventures of Sherlock Holmes](https://goodreadence.vercel.app/library/adventures-of-sherlock-holmes). Each book has a complete edition, author details and a direct reading link.

## Run locally

Install Node.js, open a terminal in this folder and run:

```sh
npm run preview
```

Open **http://127.0.0.1:8799**. Use this local server rather than opening HTML files directly: workers, modules and browser storage require a proper web origin. The client uses bundled dependencies; a restricted Vercel function relays approved public-book downloads without storing them. Run `npm run build:static` to regenerate crawlable catalogue and book pages; Vercel runs this dependency-free generation when publishing.

## Repository map

| Location | Purpose |
| --- | --- |
| `index.html`, `reader-*.js`, related styles | Home, personal shelf and PDF reading room |
| `reader-epub.js`, `reading-comfort.*` | EPUB reading and reading comfort tools |
| `library.*`, `library-data.json` | Paginated public-library interface and generated metadata |
| `public-books/` | Source catalogue, display covers and private/local full-book test fixtures; only covers are published |
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

### On-demand public books

The public catalogue keeps metadata and covers in the app. Full source books are retrieved only after Add to my library, then converted to searchable PDFs on the reader’s device. Saved books work offline. No complete public-book PDFs or EPUBs are included in the published dist folder. Local/Git source editions remain available for research and deterministic checks. A restricted streaming endpoint handles sources without browser download access; it stores no files but still consumes hosting bandwidth. See [the maintenance guide](docs/PUBLIC-LIBRARY.md) for source approval and validation.

### Paged public catalogue

The website embeds the first 12 listings, then uses /api/catalogue for server search, genres and page changes. Detailed metadata is fetched per book, and covers load near the viewport. The full catalogue index stays server-side. Saved books still work offline; global public-catalogue searches need a connection. Edition-review fingerprints block unreviewed additions or changed source editions. Run npm run audit:editions with the Python/lxml source-review tools before sealing changed editions.
