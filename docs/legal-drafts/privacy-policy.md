# Privacy notice — draft, not for publication

**Draft status:** The owner identifies himself as Prakhyan Nagarajan. Hosting/log practices and operating jurisdiction still need to be checked against the deployed service. There is no minimum age gate; children may use the site, so child-specific duties need review. This is an internal draft, not a legal-compliance claim. Updated 17 November 2026; the owner reports prior lawyer review.

## About this notice

GoodReadence is a personal PDF and EPUB reader owned by Prakhyan Nagarajan, according to the product owner. General and privacy enquiries can be sent to goodreadence@proton.me. No postal or business address has been supplied. GoodReadence is not represented here as an incorporated company or registered business.

## Books and reading data

In the inspected application, a book selected from your device is processed in your browser. PDF bytes are passed to the local PDF.js reader and EPUB chapters are parsed in the browser. The application code inspected for this draft contains no book-upload endpoint, account backend, or analytics integration.

The browser stores original book files and library records in IndexedDB. Records can include a book title, cover image, file format, page/chapter information, and reading position. localStorage contains preferences, bookmarks, highlights, progress, reading statistics, goals, and intro state. The app does not provide a verified library backup/restore facility in this build.

This storage is controlled by the browser and device. Clearing site data, changing browser profiles, storage eviction, device failure, or uninstalling a browser can make books and reading state unavailable. Keep your own copies of important documents. Browser-local storage is separate from the source files on your device.

## Network and service providers

The inspected app source does not send book contents or reading activity to a GoodReadence application server. Opening the hosted site necessarily sends ordinary requests to its host. The host may process IP address, request time, requested path, user-agent, and security/diagnostic information in server logs. The production host, log retention, processing locations, and any provider telemetry have not been verified. This section must be completed after deployment review.

The app bundles PDF.js locally and includes local audio recordings. Clicking an external link, such as a sound-credit source, contacts that destination. No analytics, advertising scripts, or app-created cookies were found in the inspected source. The product owner has selected Vercel as the preferred host and prefers optional, anonymous Vercel Web Analytics rather than Google Analytics, but neither Vercel nor analytics is connected or enabled. If enabled, Vercel documents aggregated traffic data such as page URL, referrer, approximate geography, and device/browser details, with request-derived visitor hashes discarded after 24 hours and no third-party cookies. This is not person-level identity tracking. The deployed configuration and legal notice/consent requirements must be verified before activation. Hosting and future integrations may change this. This is not a network-capture finding.

## Purposes, legal basis, retention, and rights

Books and reading state are stored to provide the reader features you use. Local data remains until removed in the app or cleared by browser/device controls. The app has no verified account-side deletion or cloud export service. Hosting log purposes and retention remain unverified. Applicable legal bases, rights procedures, and retention duties depend on the confirmed operator, jurisdiction, audience, and law in force at launch and require legal review.

## Children and international use

The product has no minimum-age gate and is open to anyone; children may therefore use it. The owner has not stated that GoodReadence is designed specifically for children. Whether the site is intentionally directed at children or targeted internationally still needs to be confirmed, and any child-related duties and safeguards need review before launch.

## Security and changes

GoodReadence uses browser storage and third-party open-source PDF code. No security certification is claimed. Software and hosting may change. The final notice should show its effective date and describe material changes.

## Contact

For privacy questions, contact [goodreadence@proton.me](mailto:goodreadence@proton.me). The owner identifies himself as Prakhyan Nagarajan. A postal/business address and any legally required grievance or data-protection contact details have not been supplied; verify whether they are required before publication.
