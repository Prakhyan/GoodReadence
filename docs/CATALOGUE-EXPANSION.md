# Catalogue expansion

## Version 1.15.0: 2,000 published editions

The first expansion publishes 1,000 additional complete editions across 27 genres. It retains the previous 1,000 editions and their source reviews. Full books remain remote: browsing retrieves compact listings, while Add retrieves the selected source and prepares a PDF on the reader's device. The new original SVG display covers total about 2.6 MB; no new full EPUB or PDF payload is committed or deployed.

The release selected 1,000 editions from 1,106 source-reviewed candidates. Additional duplicate-work, shared-reference and partial-volume screening held out uncertain records. The selected additions are English-language editions. Thirty-six have exact-source Open Library rating matches; the others stay unrated. These are community ratings, not GoodReadence scores. Source author profiles and available attributed biographies accompany each record.

## Review requirements

- Gutenberg's US public-domain statement is checked separately from its CC0 metadata licence. New historical candidates require identified creative contributors dated no later than 1900, followed by actual edition-credit checks for later or unresolved contributors. This is conservative screening for the requested India, US, UK and EU audience, not universal legal certification.
- Review downloads are temporary. Full EPUB archives, reading order, chapter assets, contributor names, edition identifiers, source notices, supported characters and complete-text hashes are inspected before publication. Unsupported or uncertain editions are held.
- Duplicate screening considers normalized titles, alternate-title patterns, credited creators, source-agent identities and complete text. Shared external work references require separate review; they can refer to distinct related books and are not proof that existing editions should be deleted.
- Every published edition has sealed evidence in `catalogue-edition-audit.json`. The build rejects missing approval, changed critical source metadata and duplicate identities. Existing persistent book URLs are reserved before new routes are assigned.
- Display covers are original designs; source illustrations and original licence/credit material remain in the prepared PDF. Ratings are published only with a matching work and attributed source.

## Repeatable preparation

The scripts write their large working files under ignored `research/` directories. Keep that folder out of releases. Do not run two catalogue publication writers together.

1. `scripts/fetch-catalogue-snapshot.cjs` retrieves checksummed Gutenberg metadata snapshots from its automated-download mirror.
2. `scripts/plan-catalogue-expansion.py` creates a candidate inventory. Candidate counts are not approved book counts.
3. `scripts/index-catalogue-snapshot.py` extracts selected numeric RDF records without following archive paths or links.
4. `scripts/review-catalogue-expansion.cjs` performs resumable complete-source review. Set `PYTHON` to a Python installation with the review dependencies. `CATALOGUE_REVIEW_TARGET` controls the accepted-candidate target, not a publication quota. `CATALOGUE_REVIEW_WORKERS` bounds concurrent reviews. A separate invocation with `--stop` lets an active run finish its current editions and save a checkpoint; the next normal invocation resumes.
5. `scripts/enrich-reviewed-catalogue.cjs` prepares attributed author and rating metadata separately.
6. `scripts/prepare-catalogue-release.cjs` validates an isolated release. `CATALOGUE_PUBLISH_LIMIT` caps additions. Prepare original covers with `scripts/design-library-covers.cjs`, review them, then explicitly pass `--apply` to the preparation script.
7. Build and run catalogue, download, offline and discoverability checks. Inspect representative generated PDF pages before publishing. Legacy local-PDF batch scripts do not cover these remote-only additions.

## Expansion toward 50,000

50,000 is a target, not the current catalogue count. The historical inventory has 11,049 potential candidates before full edition review, so it cannot supply the entire target by itself.

The owner approved suitable modern openly licensed books from all genres. OAPEN and DOAB expose reusable metadata feeds, but their metadata licence does not grant rights to every listed book. `scripts/inventory-open-books.py` separately filters whole-book PDF records with explicit BY, BY-SA or CC0 content licences. Its output is only a candidate list: it grants no publication approval. Noncommercial, no-derivatives, unknown and conflicting licences are held by this inventory.

Before a modern edition can be published, it needs complete-file verification, printed licence and exception review, cross-provider DOI/ISBN/work duplicate checks, safe delivery support and preserved attribution. No modern OAPEN or DOAB book is included in version 1.15.0. Avoid filling the target with previews, chapters, repeated editions or uncertain licences.

Metadata documentation: [Gutenberg](https://www.gutenberg.org/ebooks/offline_catalogs.html), [OAPEN](https://oapen.org/article/metadata), [DOAB](https://doabooks.org/en/librarians/doab-metadata).
