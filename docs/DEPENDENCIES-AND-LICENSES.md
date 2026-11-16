# Dependencies and license inventory

Reviewed 16 November 2026 against the checked-in release files. This is a source inventory, not a substitute for checking each upstream license and notice before distribution.

| Component | Included version / location | Purpose | License and follow-up |
|---|---|---|---|
| PDF.js | 3.11.174, bundled in `index.html` and mirrored in `vendor/pdf.min.js` + `vendor/pdf.worker.min.js` | PDF parsing, rendering, text search | Apache-2.0; bundled source includes its license banner. Preserve upstream notices. Version is old and should be upgraded after compatibility review. |
| EPUB parser | `epub.js`, project code | Reads EPUB ZIP directory and XHTML using browser APIs | No third-party package dependency identified in this file; obtain/confirm the project author’s license before public release. |
| Ambience recordings | `ambience/*.mp3` | Optional local audio | CC0 and CC BY recordings. Source, author, license, excerpt duration, and edits are recorded in `ambience/CREDITS.html` and `ambience/catalog.json`. Preserve attribution for CC BY items. |
| Fonts | System font stack | Interface typography | No Google Fonts or remote font request was found in the app. Uses fonts already available on the device. |
| JavaScript/CSS runtime | Inline app code and `reading-room.css` | Reader interface | No npm package manifest or lockfile is present. No app analytics, error reporting, CDN script, or external API was found in source inspection. |

## Distribution checks

- The app’s source assets are served locally by the static site; outbound web requests occur when a user follows a linked source/credit or social/contact URL.
- The sound licenses are individual recording licenses, not an endorsement or blanket license for other source materials.
- Confirm the author/owner and license of the app’s original code, visual design, and `epub.js` before external distribution. No company ownership or transfer of rights is inferred.
- Generate a software bill of materials and run a current vulnerability review after choosing the PDF.js upgrade target. There is no package manager lockfile to audit today.
