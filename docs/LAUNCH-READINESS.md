# GoodReadence launch-readiness audit

Reviewed 16 November 2026 against the public GitHub repository and the saved reader source used to populate this repository.

## Launch decision

- **COMPLETE:** Static project package, information pages, initial browser headers, local audio/PDF assets, Vercel exclusion for internal documents, source inventory, and draft legal documents are prepared. The checks listed below passed where stated.
- **NEEDS MY INPUT:** Legal operator identity and acceptable public contact address, intended operating jurisdiction, child audience, international target, real domain, final hosting choice, and whether to introduce analytics or monitoring. No services are connected and no spending has occurred.
- **NEEDS PROFESSIONAL REVIEW:** Counsel must confirm the applicable legal roles/duties, final privacy notice and terms, copyright complaint procedure, and the correct operator/grievance details. A security specialist should review a current PDF.js upgrade and file parser limits before production.

**Production status: not ready to launch.** The static site is packaged for a Vercel project with no build step, but no hosted preview exists, so headers, HTTPS, host logs, and actual provider behavior have not been verified. The legal documents are drafts, not public site pages. Do not publish as a finished public product until missing details, counsel review, production checks, and required regressions are complete.

**Cost and connected services:** No service was connected, no deployment or domain was created, and no cost was incurred. GitHub is the source repository. Vercel is a prepared configuration only; Cloudflare, Google Analytics, Sentry, Resend, accounts, payments, and backend storage are not configured. Any hosting plan/bandwidth costs depend on the owner’s Vercel account and usage and were not assessed by activating a service.

## Status

**Not ready for public launch.** The GitHub repository originally contained only a README and `.gitignore`. The current branch now includes the saved reader and its required assets, a PDF.js mitigation, an initial Vercel header configuration, and this audit. No deployment has been performed.

## Architecture and data flow

- PDF and EPUB files are selected from the user’s device. The inspected reader passes PDF bytes to PDF.js in-browser and parses EPUB archive entries in-browser. No document upload path, application API, account system, or analytics code was found in the saved app.
- Original book files and library records are stored in IndexedDB (`casid`, stores `b` and `f`). Records include names, covers, format/page metadata, and reading positions.
- Preferences, progress, bookmarks, highlights, reading statistics, and goals are stored in localStorage. Browser storage is origin-scoped and can be cleared or evicted. Clearing it can remove the library and annotations. The reader has no verified backup/restore workflow in this build.
- This release includes locally served ambience recordings and embedded PDF.js and its worker. App code does not call a remote analytics or document service. Clicking external links, including source/credit links, contacts the destination.
- No production host was configured during this audit. Access logs, retention, cookies, regional processing, and other provider telemetry therefore remain unknown. A browser network trace on the actual deployment is required before making a definitive public privacy statement.
- No cookies were found in the inspected app code. This does not establish that a future host or third-party integration will not set cookies.

## Security

- The reader embeds PDF.js 3.11.174. Mozilla advisory CVE-2024-4367 describes arbitrary JavaScript execution from a malicious PDF for affected PDF.js versions when `isEvalSupported` is true. The reader’s three PDF load paths now set `isEvalSupported:false`, Mozilla’s documented workaround. This reduces that specific risk. It does not replace upgrading to a currently supported PDF.js release and reviewing its worker, compatibility, and security history.
- The EPUB reader reads the selected archive into memory. It now rejects source files over 100 MB, archives with over 5,000 entries, any extracted XML entry over 8 MB, and more than 32 MB total extracted XML. It bounds central-directory and local-entry offsets and streams deflate output before accepting it. Smoke tests passed for a valid EPUB, malformed input, an oversized file, and an entry that declares excessive expanded size. This does not replace a maintained ZIP library or fuzzing against adversarial archives.
- `vercel.json` sets an initial CSP and basic browser security headers. The CSP permits inline and data scripts because the bundled reader uses embedded scripts. That weakens script restrictions. It must be tested on a Vercel preview before production. HSTS is omitted until HTTPS and domain configuration are verified.
- No Vercel build, deploy, environment variables, DNS, GitHub Actions, API keys, or connected analytics/Sentry/Resend services were found in the original repository. No domain is supplied.

## Dependencies and licensing

- PDF.js 3.11.174 is embedded in the reader and mirrored in `vendor/`. Its license notice is embedded in the source. The vendor folder contains the PDF viewer and worker.
- EPUB ZIP parsing is implemented in `epub.js` using browser APIs, with no additional package manager dependency.
- Ambience recordings and their credits/licenses are in `ambience/` and `ambience/CREDITS.html`. Preserve these credits when redistributing.
- The repository has no package manifest or lockfile. A reproducible dependency audit and software bill of materials remain to be prepared after selecting an upgrade path.

## Included ambience inventory

Each selected recording is served alone; no synthetic ambience bed or simultaneous ambience mix is used. Excerpts run about 11–12 minutes before a same-recording crossfade. The installed catalog is: Rain, Thunderstorm, Fireplace, Ocean, Beach, Forest, Night, Stream, Wind · airplane cabin, Café, Train · India, Calm piano, Brown noise, and Rain by the sea. Source descriptions and license links are in `ambience/CREDITS.html`; exact durations, hashes, source URLs, and ratings where available are in `ambience/catalog.json`.

The Rain option now uses the separate car-roof rain recording (4.8/5 from 5 source ratings), with no extra insect or ambience layers. Its playback is verified in Edge as a single decoded track, but the test does not substitute for human listening. Several tracks are CC0, while others are CC BY and therefore still copyrighted under a license. This set is free to redistribute under its listed terms; it is not a paid premium-library collection, and ratings with few votes should not be described as definitive.

## Legal research snapshot for India

The DPDP Act and Rules use phased commencement. The official 13 November 2025 commencement notification brought sections 2, 18–26, 35, 38–43 and sections 44(1), 44(3) into force on publication. Section 6(9) and section 27(1)(d) commenced one year later, on 13 November 2026. Sections 3–5, most operative processing duties, sections 7–17, the remaining listed sections, and section 44(2) are scheduled for 13 May 2027. The DPDP Rules, 2025 similarly phase commencement: rules 1, 2, 17–21 were effective on publication; rule 4 on 13 November 2026; rules 3, 5–16, 22 and 23 are scheduled for 13 May 2027. Verify the Gazette for later amendments before launch.

This product appears to be a local reading utility without user-submitted hosting, accounts, payments, or public user content. That alone does not settle whether every intermediary, consumer, contract, privacy, or copyright requirement applies. The IT Act and applicable IT Rules, copyright, consumer-protection, contract/e-commerce questions, and any overseas targeting require counsel to assess against the final deployment and operator. No legal-compliance claim is made.

### Applicability assessment (research, not legal advice)

- **Confirmed baseline:** Indian statutes such as the IT Act and Copyright Act exist and may apply to conduct within their scope. Users retain responsibility for having rights to books they open. The Copyright Act does not make a local reader the owner of a selected book.
- **DPDP status as reviewed 16 November 2026:** The commencement notification is phased. The Act’s definitions and several institutional/administrative provisions are in force; section 6(9) and section 27(1)(d) began on 13 November 2026. Many substantive duties including sections 3–5, 6(1)–(8), 6(10), 7–17 and related provisions are scheduled for 13 May 2027. Rules 1, 2 and 17–21 took effect on publication, rule 4 on 13 November 2026, and rules 3, 5–16, 22 and 23 are scheduled for 13 May 2027. Check subsequent Gazette changes before launch.
- **IT Rules / intermediary status:** MeitY’s consolidated IT Rules were updated 10 February 2026. Their duties are conditional on the service actually fitting the relevant defined role and functionality. This build is a local file reader without user book hosting, sharing, accounts, or user-generated public content; whether any provision applies to the operator or hosting arrangement still needs counsel review. Do not assume either intermediary status or exemption.
- **Consumer and contract rules:** The Consumer Protection Act and electronic-contract framework can depend on whether the operator is acting as a trader/service provider, what is offered, and how users are invited to accept terms. The current free reader has no account, payment, or clickwrap, and no jurisdiction/operator details. Counsel should determine applicability and draft enforceable terms. Do not represent mere access as acceptance.
- **International privacy:** No country targeting, account collection, or cloud processing has been selected. Applicability of GDPR, UK GDPR, US state laws, or other foreign regimes cannot be concluded from this code alone; assess actual targeting, establishment, and data practices before serving those audiences.
- **Best-practice recommendations:** Keep the reader local-first; minimize third-party requests; disclose browser storage and host logs accurately; maintain a verified contact and copyright-report process; provide accessible policies; and test the actual deployment’s network traffic, headers, storage, and deletion behavior. These recommendations are not a statement that a particular law requires each item.

Primary sources: [DPDP Act, India Code](https://www.indiacode.nic.in/bitstream/123456789/22037/1/a2023-22.pdf), [DPDP commencement notification G.S.R. 843(E), Gazette of India](https://egazette.gov.in/WriteReadData/2025/267647.pdf), [DPDP Rules, 2025 G.S.R. 846(E), Gazette of India](https://egazette.gov.in/WriteReadData/2025/267650.pdf), [MeitY DPDP Rules page](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa), [Information Technology Act, India Code](https://www.indiacode.nic.in/bitstream/123456789/13116/1/it_act_2000_updated.pdf), [IT Rules updated 10 February 2026, MeitY](https://www.meity.gov.in/static/uploads/2026/02/550681ab908f8afb135b0ad42816a1c9.pdf), [Copyright Act, India Code](https://www.indiacode.nic.in/indiacode/handle/123456789/1367?view_type=browse), [Consumer Protection Act, India Code](https://www.indiacode.nic.in/bitstream/123456789/15256/1/eng201935.pdf), [Mozilla PDF.js security advisory GHSA-wgrm-67xf-hhpq](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq).

## Not implemented or still pending

- Final public policy pages, clickwrap, cookie banner, analytics consent, or a grievance-officer designation. The operator’s legal name/business identity, address, confirmed operating jurisdiction, child audience, international service scope, and host/log practices are unresolved. Legal drafts are intentionally separate and clearly marked as drafts.
- About, FAQ, updates, contact, and custom 404 pages are implemented. Information pages share navigation/footer. Final legal policy pages remain drafts and are excluded from Vercel uploads.
- Custom domain, canonical URLs, sitemap, production robots policy, and social sharing image. No fake domain was added. A placeholder domain is intentionally not used in metadata or sitemap.
- Actual deployment, browser network inspection, host log/retention disclosure, headers verification, domain/DNS configuration, and production smoke tests.
- Full regression matrix across multiple PDF imports, animation, zoom, search, annotations, themes, statistics/goals, persistence, mobile, desktop, keyboard, assistive technology, and major browsers. Automated checks below cover a two-page PDF render/turn, EPUB parse/render/highlight, selected internal logic, local PDF assets, and ambience playback in Edge; the remaining workflows and other browsers remain unverified.
- PDF.js upgrade analysis, EPUB parser fuzzing or migration to a maintained ZIP library, accessibility audit, current vulnerability scan, and counsel review.
- Library ZIP backup/restore. The existing source does not demonstrate this capability, so no claim is made that a ZIP backup contains complete books and state.

## Next decisions

1. Provide the legal operator name/business identity, correspondence address or acceptable alternative, and intended jurisdiction.
2. Confirm whether children are an intended audience and whether the service will target users outside India.
3. Select a real domain and confirm host choice and log retention. No purchase, DNS edit, or paid service has been made.
4. Have Indian counsel review the legal drafts and applicability questions before publication.
5. Upgrade PDF.js and add parser resource limits, then run the full regression and browser/security checks.

## Verification performed

- Node/VM review checks passed: inline script syntax, streak gaps, cache budget, animation/render cancellation, IndexedDB transaction completion/failure, local PDF assets, and no remote script/style URLs.
- Microsoft Edge smoke tests passed: a generated two-page PDF rendered and navigated to page two without browser errors; a generated EPUB parsed and rendered its chapter, accepted a highlight, and rejected malformed and size-limit cases.
- Microsoft Edge browser check passed for all 14 ambience recordings: each file decoded and played locally for more than 600 seconds, one track played at a time, previous sources stopped on switching, volume applied, Off and rapid switching worked, and selected end-crossfades completed. The test did not listen subjectively to the audio; a human listening check is still needed for sound quality and incidental background noises.
- No full PDF import/annotation/backup workflow or cross-browser/accessibility/security scan was performed. No hosted preview was available, so Vercel headers, logs, and mobile production behavior remain unverified.
- Build configuration is static: root `index.html`, no package/build command required. Vercel is only a prepared option; no project is connected here. `.vercelignore` excludes internal `docs/` files from deployment uploads.

## Change record

**Unreleased audit build, 16 November 2026.** Imported the existing local reader and its ambience, EPUB and PDF assets into the initially empty repository. Added `isEvalSupported:false` to all three PDF.js loading paths as a mitigation for CVE-2024-4367. Added an initial Vercel response-header configuration, static informational pages, favicon, robot policy, draft legal files, dependency/license inventory, and this audit. Legal/internal docs are excluded from Vercel uploads. Not deployed.
