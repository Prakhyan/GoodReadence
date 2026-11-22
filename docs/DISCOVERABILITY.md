# Search and sharing

GoodReadence remains a static, local-first application. Its home and information pages contain their actual text in HTML. Build-time generation adds complete book detail pages and a paginated catalogue; no reader-framework migration or document upload server is required.

## Publishing

`npm run build:static` regenerates `library-data.json`, the enhanced `library.html`, 1,000 book pages, 83 additional catalogue pages, About, core metadata, `robots.txt` and `sitemap.xml`. Vercel runs the same dependency-free command when deploying. Generated HTML is checked into Git so it remains reviewable. The build copies only public runtime files and assets into the ignored `dist/` output folder; documentation, research, package manifests and build tools are never part of that artifact. Source book metadata lives in `public-books/catalog.json` and `public-books/authors.json`.

- Home: `https://goodreadence.vercel.app/`
- About: `/about` (the home page retains its inline About section too)
- Help & FAQ: `/help`
- Updates: `/updates`
- Catalogue: `/library`, then `/library/page/2` through `/library/page/63`
- Book example: `/library/pride-and-prejudice`
- Sitemap: `/sitemap.xml`

The 1,090 sitemap URLs resolve to actual HTML files through explicit Vercel rewrites. Missing books return 404; there is no catch-all single-page-app rewrite. Original `.html` links keep working, with canonical tags identifying the preferred URLs. The public catalogue starts with 12 real linked cards in HTML and is enhanced by the existing full-catalogue search and device import controls. Every book page includes a direct complete-PDF link without JavaScript.

Each source record retains a `seoSlug` after its first generation. Keep this stable when correcting a title or author. An intentional URL change needs a permanent redirect from its previous path; do not silently rename published book URLs.

Read now uses the existing verified, atomic library import. It opens the chosen book on the personal shelf; an existing copy is resumed rather than duplicated. No source PDF is downloaded just because a crawler opens a book page.

## Metadata and sharing image

Pages carry unique titles, descriptions under 160 characters, canonical URLs, Open Graph tags and Twitter cards. The home page describes the free application with WebApplication, WebSite and Organization JSON-LD. Book pages use Book and BreadcrumbList data; paginated browsing uses CollectionPage and ItemList. No ratings or endorsements are invented for structured data.

The original sharing artwork is `assets/social-preview.svg`, with a 1200×630 PNG export. Run `node scripts/render-social-preview.cjs` with the development Playwright dependency after changing that artwork. It uses the existing geometric identity and original book illustration, with no external stock image.

## Search Console

The URL-prefix property is `https://goodreadence.vercel.app/`. Its owner-specific `google-site-verification` meta tag is retained in the homepage. Keep it after verification so Google can continue checking ownership. This public verification tag is not an API secret.

After a release, submit the sitemap in Search Console and inspect the homepage URL to request indexing. Submission is not proof that Google has indexed the pages or assigned rankings. Monitor Search Console’s indexing reports rather than repeatedly changing URLs or resubmitting unchanged pages.

Production access is tested without account cookies or protection-bypass headers. Preview-deployment authentication can stay enabled as long as the canonical production domain is public. A custom domain is optional; changing domains requires updated canonical/OG/sitemap origins, a new Search Console property and permanent redirects from the old site.

## Checks

Run the local server with `npm run preview`, then set `GR_BASE_URL` to that server and run `npm run test:discoverability`. It checks all 1,000 generated book records, sitemap uniqueness, no-JavaScript routes and pagination, canonical metadata, one-click book import/opening, offline reopening and real 404 responses. Existing library checks still cover global search, persistence and failed-download recovery.

## References

- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Ownership verification](https://support.google.com/webmasters/answer/9008080)
- [Sitemap and indexing limits](https://developers.google.com/search/help/crawling-index-faq)
- [Vercel deployment protection](https://vercel.com/docs/deployment-protection)
