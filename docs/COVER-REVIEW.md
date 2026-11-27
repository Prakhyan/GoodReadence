# Catalogue covers and installation

Included in patch 1.5.3 of the existing 1.5 release.

## Covers

Historical source-edition covers take priority where the book, source declaration and named illustrators can be checked. Source-declared cover images are retrieved from Project Gutenberg's designated mirror. Possible newly created transcriber covers are held for separate permission review. Matching Standard Ebooks edition covers require its CC0 dedication and a documented artist death year of 1905 or earlier. These are edition covers, not claims about first-edition artwork.

Unverified modern publisher covers are excluded. Books without approved artwork receive original title-cover designs with varied palettes and bindings. Existing approved covers are preserved. Complete books and reading progress are unchanged.

The machine-readable [cover review](cover-rights-review.json) records matched books, credited artists, authority references, source images and local files. Covers remain local, compact and loaded as needed. This screening does not constitute universal legal certification.

## Installation

Install app is available in the home/personal-library side menu and in App settings. Browsers that expose an installation prompt use it directly. Otherwise the same action opens platform instructions, including Brave desktop, Android and Safari on iOS/macOS. Prompt failure also falls back to instructions.

Related-app detection only recognizes GoodReadence's own manifest or app identity. Missing identifiers and unrelated origins cannot hide the install entry. Installed display modes hide the action; supported related-app detection is checked again when returning to the browser. Browsers do not provide a universal uninstall notification, so unsupported browsers re-evaluate on a fresh visit.

References: [Brave installation help](https://support.brave.app/hc/en-us/articles/39077114659597-How-do-I-install-and-use-Web-Apps-in-Brave), [Standard Ebooks rights](https://standardebooks.org/about/standard-ebooks-and-the-public-domain).

## Verification

`scripts/check-install-entry.cjs` covers phone and desktop layouts, instructions, native prompt acceptance, prompt failure, installed/uninstalled state, unrelated-app detection, iOS instructions and offline settings reopening. Catalogue performance checks retain bounded server searches, pagination and viewport cover loading. The existing edition approval gate verifies that cover changes leave reviewed book sources intact.
