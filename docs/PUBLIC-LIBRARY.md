# Public-library maintenance

The catalogue contains **1,000 complete PDF editions**. Each record links a locally hosted PDF, the original EPUB, its source cover and edition credits. The interface renders 12 cards at a time; search and genre filters apply to the entire catalogue. The default order is verified reader average, then rating count and a stable title tie-break. The top 12 remain fixed on page 1. Manual Shuffle randomizes the remaining books and opens page 2; no daily automatic reordering runs. Static HTML uses the same default order. PDFs download only when a reader chooses to add one.

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

## Preparation pipeline

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
