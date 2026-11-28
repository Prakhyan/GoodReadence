# Reading interface and storage — 1.6.0

The home page opens with a readable, adjustable sample of Chapter I of *Pride and Prejudice*. Its text comes from the reviewed public-domain source edition. Trying the sample does not create a saved book; Save sample makes an explicit local copy.

## Product facts

`product-facts.js` supplies the supported formats and catalogue count to the page generators and import controls. The current catalogue contains 5,000 reviewed books. Public-library additions default to the original EPUB; readers can choose a PDF reading copy prepared on their device. They are separate saved editions. The PDF conversion does not reproduce an original printed edition.

PDF and EPUB are the primary reading formats. JPG and PNG can be combined into a PDF. DOCX and PPTX are experimental text imports: original layout and illustrations are not preserved. CBZ is not supported. Public cloud sign-in remains inactive until provider registrations are configured.

`editorial-layout.cjs` and `editorial-copy.cjs` generate the shared navigation, footer, home page, FAQ and contact copy. `editorial.css` supplies the paper, ink, muted text, rule and accent tokens, with serif headings, humanist sans controls and monospace folios. Reader-selected page and annotation colours remain available.

## Storage and backups

- The app requests persistent browser storage after the first saved import or reading change. Browsers may deny or lack the API. Settings shows the actual result and an approximate quota estimate where available.
- Persistent storage cannot protect against a person clearing site data, uninstall-related deletion or device loss. ZIP backups must be kept outside the browser.
- Local-folder backups require File System Access support and explicit folder permission. Automatic writes run only while the app is open and permission remains granted. A revoked permission requires a user action to reconnect. Completed backups are retained when a write fails.
- The linked folder handle stays in a separate local database and is excluded from portable archives. Each snapshot contains a ZIP, readable reading-data JSON and Markdown notes. Linking a folder does not upload books.
- Backup suggestions respond to new annotations, completed PDFs or elapsed time. Dismissal is respected. Safari guidance explains the seven days of Safari use rule rather than promising a universal retention period; Home Screen storage has different treatment.
- Missing or damaged book files are isolated from other books. Recoverable notes remain exportable, and a compatible original can be selected again.

Dictionary/Wikipedia lookup and starting a QR transfer require a connection. Offline controls explain this before starting. Saved books and the reading sample remain available offline; sound files remain optional downloads.

## File processing

PDF.js receives local PDFs through bounded Blob range reads. PDF combining, extraction, image preparation and backup hashing run in workers. The test limits are 160 MB per PDF on low-memory devices and 250 MB otherwise; combined input limits are 160/300 MB and archive imports are capped at 100 MB. These are safeguards, not promises that every device can process every file at the limit. Whole-document operations still need working memory. JPG/PNG dimensions are checked before resize/decode; exceptionally large images are rejected.

## Verification

The 1.6.0 checks cover desktop and phone-sized Edge layouts, ephemeral sample/save, EPUB and optional PDF additions, typography persistence, offline reopening, persistent-storage denial/absence, quota display, local-folder permission/write failures, ZIP export/clear/restore, corrupt archive rejection, recovered notes, and offline lookup/transfer guards.

A synthetic 115 MB PDF opened without a whole-file read on the UI thread. Worker PDF combining and a 12-megapixel image conversion also passed. Safari fallback checks use a simulated user agent and absent browser APIs; these do not replace physical iPhone, Android or Safari testing.

Run a local preview and use `GR_BASE_URL` for the relevant checks:

```
node scripts/check-product-contract.cjs
node scripts/check-editorial-room.cjs
node scripts/check-epub-first.cjs
node scripts/check-storage-care.cjs
node scripts/check-large-local-files.cjs
node scripts/check-portability.cjs
```
