# Dependencies and third-party credits

The static application serves its runtime libraries locally. Exact versions and file hashes are recorded in `package.json`, `package-lock.json` and `vendor/PINS.json`. Run `npm run check:vendor` after any dependency update.

| Component | Version | Licence / purpose |
| --- | --- | --- |
| PDF.js (`pdfjs-dist`) | 6.5.438 | Apache-2.0; PDF display, workers, fonts, character maps and image decoders |
| fflate | 0.8.3 | MIT; archive compression and document/backup handling |
| pdf-lib | 1.17.1 | MIT; PDF preparation tools |
| qrcode-generator | 1.4.4 | MIT; device-pairing QR codes |
| jsQR | 1.4.0 | Apache-2.0; camera QR decoding |
| Playwright | 1.62.1 | Apache-2.0; development-only browser checks and PDF publication |

Retain upstream licence files and notices shipped in `vendor/`. Python publication tools use lxml, Pillow and PyMuPDF; these are developer tools, not downloaded by app users. Browser printing creates the public-library PDFs once, before publication.

## Books and biographies

Project Gutenberg source EPUBs and covers retain their original edition licences and production credits. Every book’s **More Info** links the source edition and its original file. See [the rights policy](PUBLIC-LIBRARY.md) and [review data](library-rights-review.json) for screening criteria. The application’s ownership notice does not override book or third-party rights.

Author information links its factual references. Reproduced Wikipedia summaries carry Wikipedia-contributor attribution and CC BY-SA 4.0 credit, with the source article linked. Open Library rating snapshots show the source work, count and check date; an unrated book does not receive an invented score.

## Sound, identity and online services

Recording-specific sources and licence details are listed in [ambience credits](../ambience/CREDITS.html). The original ribbon-monogram artwork has the [separate dedication](BRANDING.md). Social service marks identify their respective services; they are not owned by GoodReadence.

Dictionary and Wikipedia lookups are optional online requests. Optional cloud sign-in requires the owner to register the app with the provider; see [setup](CLOUD-SETUP.md). These integrations do not grant any licence over user-uploaded material. The app uses system fonts rather than downloading a font service at reading time.
