# Public library: complete PDF editions

All ten catalogue downloads are complete PDFs converted from the retained Project Gutenberg EPUB editions. They are not previews. The cover displayed on each card is extracted from that same edition and appears at the start of its PDF. Page counts describe our PDF pagination, not the original printed edition.

Every EPUB spine item is processed in reading order, including front matter, all chapters, illustrations, credits and the full Project Gutenberg licence. Original EPUB downloads remain freely available in each card's credits. Copyright status is edition- and jurisdiction-specific; the catalogue retains the source's US public-domain statement.

Conversion happens when publishing the library, not on a reader's device. PDF and cover downloads are excluded from the app's service-worker cache. Personal imported books continue using the existing local-first workflow.

## Rebuild after changing a source edition

From the repository root, with Python (`lxml`, `Pillow`, `pypdf`) and Node (`playwright`, installed Edge) available:

1. `python scripts/prepare-library-pdfs.py`
2. `node scripts/build-library-pdfs.cjs`
3. `python scripts/verify-library-pdfs.py`
4. `node scripts/render-public-library.cjs`

`PLAYWRIGHT_MODULE` can point to an existing Playwright installation; `BROWSER_CHANNEL` defaults to `msedge`. The preparation script currently processes the EPUB sources used by all ten titles. Other source formats must first be converted into a complete edition and checked before publication; this is not a universal Office-file converter.

The verification checks text samples from every spine section and total retained text, and records PDF page counts, file sizes and SHA-256 checksums. Inspect rendered sample pages as well. Never replace the full source with an excerpt or silently cut long books.

Author biographies and their reference links live in `public-books/authors.json`. Full digitisation credits, source identifiers and edition hashes live in `public-books/catalog.json` and are rendered into the library. Source material is obtained from the official PGLAF mirror; source credits are preserved, not claimed as GoodReadence's work.
