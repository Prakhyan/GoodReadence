# Public library: complete PDF editions

All 100 catalogue books are complete PDFs converted from the retained Project Gutenberg EPUB editions. They are not previews. The cover displayed on each card is extracted from that same edition and appears at the start of its PDF. Page counts describe our PDF pagination, not the original printed edition.

Every EPUB spine item is processed in reading order, including front matter, all chapters, illustrations, credits and the full Project Gutenberg licence. Original EPUB downloads remain freely available in each card's credits. Copyright status is edition- and jurisdiction-specific; the catalogue retains the source's US public-domain statement.

Conversion happens when publishing the library, not on a reader's device. PDF and cover downloads are excluded from the app's service-worker cache. Personal imported books continue using the existing local-first workflow.

## Rebuild after changing a source edition

From the repository root, with Python (`lxml`, `Pillow`, `pypdf`) and Node (`playwright`, installed Edge) available:

1. `python scripts/prepare-library-pdfs.py`
2. `node scripts/build-library-pdfs.cjs`
3. `python scripts/verify-library-pdfs.py`
4. `node scripts/render-public-library.cjs`

`PLAYWRIGHT_MODULE` can point to an existing Playwright installation; `BROWSER_CHANNEL` defaults to `msedge`. The preparation script currently processes the EPUB sources used by all 100 titles. Other source formats must first be converted into a complete edition and checked before publication; this is not a universal Office-file converter.

The verification checks text samples from every spine section and total retained text, and records PDF page counts, file sizes and SHA-256 checksums. Inspect rendered sample pages as well. Never replace the full source with an excerpt or silently cut long books.

Author biographies and their reference links live in `public-books/authors.json`. Full digitisation credits, source identifiers and edition hashes live in `public-books/catalog.json` and are rendered into the library. Source material is obtained from the official PGLAF mirror; source credits are preserved, not claimed as GoodReadence's work.


## Browsing and personal storage

Only 12 cards exist in the DOM at a time. Search and genre filters operate on the entire local catalogue; filtering resets pagination. Covers use lazy loading. No book PDF is requested until Add to my library is chosen.

Book/author details appear in an accessible native dialog with Escape, a close button and focus return. Wikipedia excerpts are attributed and linked under CC BY-SA 4.0; biographies written for the original collection retain their source links. Notable works are informational and are not all necessarily available in this collection.

Adding a book fetches one PDF at a time, checks its size and SHA-256, then stores the PDF and metadata together in one IndexedDB transaction in the reader's existing `casid` database. Stable catalogue IDs prevent duplicates and protect existing reading progress. Storage/network failures permit retry; readers can cancel before saving. Original EPUB/PDF file downloads remain optional inside credits. The app is local-first; browser data deletion still removes stored books.

## Ratings

Ratings are dated snapshots from the official Open Library Search API, fetched in small batches and matched by title and author. The UI identifies Open Library, links the work, shows vote count and retrieval date, and explains that the score spans editions. Unmatched or unrated works explicitly have no verified score; they are never assigned a fabricated zero. Visitors do not contact rating services just by browsing. Refresh snapshots before promising current ratings.

## Expanding/rebuilding

The selected 90 additions are in `scripts/library-expansion.json`. `fetch-library-expansion.cjs` obtains full EPUBs from the official PGLAF mirror, with retries and resumable existing-file checks. `import-expanded-catalog.py` checks ZIP integrity, language, public-domain metadata and title identity before adding records. `fetch-author-profiles.cjs`, `fetch-library-ratings.cjs`, and `enrich-library.py` prepare attributed details. Run prepare/build/verify/render in order; `LIBRARY_INCREMENTAL=1` skips already prepared/built books. Verification requires PyMuPDF. Rechecked hashes are retained in the catalogue. `check-library-expansion.cjs` verifies pagination, global search, dialog controls, direct import, persistence, offline reading and failed-download recovery.
