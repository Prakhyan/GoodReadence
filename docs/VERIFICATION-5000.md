# Verification: the 5,000-book library

**Story:** A reader opens a fresh public-library selection, browses a stable order, adds a complete remote book to their own shelf, then opens it and returns offline.

| Boundary | Evidence |
| --- | --- |
| Catalogue data | Exactly 5,000 approved records, including 3,000 additions; the previous 2,000 edition fingerprints and permanent links are preserved. |
| Browser → catalogue API | Twelve compact listings per page. No full catalogue index is downloaded to the browser; covers load near the viewport. |
| Session order | New tabs and installed-app launch entries get fresh seeds. Paging, reloads, search and information-page navigation retain the session order. Deep book links locate the requested book within that order. |
| Source controls | Full-source review checks permissions, contributors, reading order, assets, supported characters and duplicate identities. The source relay rejects unapproved IDs, arbitrary URL parameters and unsupported methods. |
| Book preparation | Three newly added editions were converted and checked for complete searchable text, illustrations and chapter outlines. Sample outputs contain 63, 74 and 178 pages. |
| Response → personal shelf | The normal Add flow saves the complete PDF before navigating directly to the personal library. Opening the book remains an explicit reader action. |
| Reader | Saved PDFs open and the page-rendering cache stays within four pages. Sample PDF pages and new display covers were visually inspected. |
| Offline | Saved PDFs reopen offline. Recent catalogue queries and book details remain available; uncached global searches explain the connection requirement. |
| Discovery | All 5,000 dedicated book pages and 5,423 sitemap URLs were checked. No-JavaScript pages, pagination, canonical metadata and proper 404 responses passed. |
| Publication footprint | Display covers and metadata are published. No complete PDF or EPUB payload is included in the static website artifact. |

Checks use isolated browser profiles and mobile-sized viewports. They do not modify the owner's personal library or represent physical-device testing. Source screening is not a universal legal certification.
