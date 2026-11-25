# Public-library maintenance

The catalogue contains **1,000 complete-book records**. The published app contains metadata and reviewed display covers, not the full PDF/EPUB collection. Each record identifies an approved remote source edition. The interface renders 12 cards at a time; search and genre filters apply to the entire catalogue. The default order is verified reader average, then rating count and a stable title tie-break. The top 12 remain fixed on page 1. Manual Shuffle randomizes the remaining books and opens page 2; no daily automatic reordering runs. Static HTML uses the same default order. Source books download only when a reader chooses to add one. A background browser worker creates a searchable PDF with source illustrations, text, chapter outlines and credits before one atomic IndexedDB transaction saves it. Existing private PDFs and annotations are never migrated or overwritten.

## Rights screening

The intended markets for this review are **India, the United States, the United Kingdom and the European Union**. Free access or an author credit alone is not permission to redistribute a copyrighted edition.

For the latest 250 additions, the source must explicitly identify the edition as **public domain in the USA**. Every listed creative contributor, including translators, illustrators and editors in the RDF and EPUB metadata, must have an identifiable death date **no later than 1900**. Unknown or conflicting identities are held out. The review also rejects later copyright notices requiring separate investigation, partial volumes, abridgments, adaptations and overlapping editions. Sources with ambiguous translation or illustration credits are not used to fill quotas.

This deliberately conservative contributor cutoff is stricter than the earlier batch’s 1945 threshold. Earlier editions remain individually documented in [the machine-readable review](library-rights-review.json); the new rule must not be retroactively claimed for them. Metadata screening cannot establish every historical or national exception. It is a documented selection process, not a legal certification or a promise of universal clearance.

Primary references:

- [Project Gutenberg permission](https://www.gutenberg.org/policy/permission) and [terms of use](https://www.gutenberg.org/policy/terms_of_use.html): retain edition licences and credits; the source’s US status does not establish foreign status. Bulk retrieval uses the PGLAF mirror.
- [India Copyright Act](https://copyright.gov.in/documents/copyright_act_1957.pdf): section 22 sets the ordinary literary-work term at the author’s life plus 60 years.
- [UK copyright term guidance](https://www.gov.uk/guidance/copyright-term): the ordinary literary-work term is life plus 70 years.
- [EU Directive 2006/116/EC](https://eur-lex.europa.eu/eli/dir/2006/116/oj/eng): harmonized ordinary life-plus-70 terms, with provisions concerning previously longer national protection.
- [US Copyright Office’s 2026 public-domain overview](https://blogs.loc.gov/copyright/2025/12/lifecycle-of-copyright-1930-works-in-the-public-domain/?loclr=blogtea): US publication dates and edition-specific contributions still matter.

Original Gutenberg licences and production credits remain in both the source files and the PDFs. Do not remove them to make a book look cleaner. The app does not claim a new copyright in the source text or source cover.

## Latest batch

250 additions take the collection from 750 to 1,000. The latest batch spans fiction, drama, poetry, natural history, essays, language and architecture. Two very large author-wide omnibus collections were held out in favour of distinct complete editions. Gothic satire remains narrowly classified. Existing editions were kept.

The review records source URLs, contributor dates, source hashes and EPUB spine/word counts. Duplicate IDs, normalized titles and duplicate extracted source text are rejected. Reader ratings are attributed Open Library snapshots when an exact title/author match has a real rating count; unavailable ratings remain unavailable. Author profiles retain reference links and attribution where text is reproduced.

## Local source-fixture preparation pipeline

Run from the repository root. Python tools need `lxml`, `Pillow` and `PyMuPDF`. Browser printing uses the pinned Playwright development dependency. `LIBRARY_REVIEW_DIR` selects a local, ignored batch folder, containing `baseline.json`, `curated-baseline.json`, `candidates.json` and `pool.json`. Keep a copy of the pre-batch catalogue there before editing. Historical selection scripts are in `scripts/archive/library/` for provenance, not unattended reuse.

1. Curate source candidates and a duplicate-free pool using source subjects, actual contents and underserved genres. Do not use titles alone to infer rights.
2. Run `node scripts/screen-library-additions.cjs` to check RDF contributor dates and the US statement.
3. Run `node scripts/download-library-additions.cjs` to retrieve source editions from the mirror. Run `python scripts/validate-library-additions.py` to inspect actual EPUB metadata, complete spines and identity. This writes the working catalogue; review its accepted and held reports.
4. Run `node scripts/enrich-library-additions.cjs`. It writes a separate enrichment report. Review exact work matches and merge accepted metadata only after any catalogue writers finish.
5. Set `LIBRARY_INCREMENTAL=1`, then run `python scripts/prepare-library-pdfs.py`. This prepares self-contained print HTML from **every spine section**, retaining images and licences. Run `node scripts/build-library-pdfs.cjs` to print missing PDFs. There is no chapter or page cutoff.
6. Run `python scripts/verify-library-pdfs.py`: every source section must have a surviving text sample, the extracted PDF must retain at least 98% of normalized source text, and the licence must be present. The script records PDF page counts, byte sizes and SHA-256 hashes.
7. Run `node scripts/render-public-library.cjs`. Do not manually edit generated `library-data.json` or `library.html`.
8. Run `python scripts/audit-library.py` and inspect the generated page contact sheets. `AUDIT_NEW_ONLY=1` limits PDF/hash checks and visual sheets to the newest 250; the default audits the entire catalogue. Remove unused reserve assets from the deployment folder and retain held evidence in local research.
9. Run the preview server and `npm run test:library`. Check complete direct import, saved reading progress, offline reopening, pagination, global search, no automatic PDF preloads and bounded rendering memory. Update release metadata and publish only after these checks pass.

The current addition validator targets a 250-book batch. Change its explicit batch target intentionally for future expansions. Do not run two catalogue-writing scripts concurrently. A source EPUB is never overwritten with a generated PDF.

For an isolated preparation pass, set `LIBRARY_CATALOG_FILE` and `LIBRARY_PRINT_DIR` to batch-local paths. PDF preparation, printing and verification then use that separate catalogue and report folder before verified records are merged. Never run concurrent writers against the same catalogue.

## Display-cover and rating review — version 1.12

All 665 autogenerated Gutenberg display placeholders were replaced: 39 illustrated Standard Ebooks covers with CC0 production credits and named source artists whose verified death years are no later than 1905, and 626 original self-contained SVG designs by Casid Studio. The existing 335 genuine covers remain. Display artwork does not alter the original EPUB or PDF, whose credits, hashes and page counts are preserved. Each replacement has a source or original-design credit in More Info and the static book page. Unknown, ambiguous or later artist identities were held out. See library-metadata-review.json for per-book evidence. This screening is not a universal legal certification.

There are 444 verified rating snapshots, including 88 newly rated books. Records link the exact Open Library work or Goodreads book and show provider and rating count. Identity matching uses source Gutenberg IDs, exact work/author names or reviewed aliases, never approximate title similarity alone. The remaining 556 books say Rating unavailable; no score is inferred from genre, popularity or another work. Automated research respects provider limits and access challenges. Ratings are edition-group snapshots, not independent GoodReadence ratings.

## On-demand delivery — version 1.13

The publication builder copies only referenced covers from public-books; source EPUBs and prior prepared PDFs remain local/Git research fixtures, outside dist and the deployed app. Do not rewrite Git history or remove local fixtures as part of a publication. The compact book-sources.json is an explicit server allowlist; the endpoint accepts an existing ID only, never a URL. It streams from approved hosts without filesystem writes, uses a 32 MB response cap, a 90-second timeout, abort/backpressure, no-store responses and no redirect following. This reduces stored/deployed payloads, not bandwidth or third-party dependence. Provider availability and hosting bandwidth/function limits still apply.

Project Gutenberg automated transfers use its PGLAF mirror, not the human-oriented main site. Standard Ebooks editions of The House of the Wolfings and Mansfield Park use verified CORS-enabled publisher downloads, with full CC0 production/colophon and original author/artist screening recorded in delivery.rightsReview. Other publishers must be reviewed and added to the explicit source allowlist; arbitrary user URLs, paywalls and borrowed-library loans are not supported. Direct publisher requests require an explicit CSP host entry.

The browser checks ZIP bounds, decompressed sizes, CRCs, reading-order completeness, edition identifier and source licence presence. Markup is parsed inertly, never rendered as active HTML. External assets are rejected. Conversion is bounded, runs in a terminable worker and never saves a partial PDF. Unsupported glyphs or illustrations produce a visible error and an original-edition link rather than a silently damaged book. Non-EPUB source files require a reviewed SHA-256 pin before activation. Native PDF sources are reconstructed as page copies to omit document scripts and attachments.

Tests: npm run test:on-demand verifies normal phone Add feedback, all text in reading order, every illustration, chapter outlines, cancellation, restricted relay requests and saved-reader operation. Use source fixtures only for deterministic tests; verify a real mirror and publisher request before release. Source hashes are recorded for the downloaded edition; archive-level hashes from old Gutenberg builds are not used to reject legitimate regenerated ZIPs. Source content/credits can change: the browser compares creator/contributor names against the reviewed edition and holds changed credits for renewed review; no blanket worldwide clearance is asserted.
