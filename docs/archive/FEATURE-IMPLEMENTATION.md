# GoodReadence additions — 18 November 2026

This checklist maps the supplied Local Flipbook Features and Strategy Blueprint to the current app.

## Start here

- **Home:** original book-and-bookmark logo, saved light/dark switch, and working library/home navigation.
- **Library:** charcoal, ivory and violet palette. Choose **Prepare a book** for file tools.
- **Reader:** the bottom toolbar offers View, Desk, Notes, Draw, and Read aloud.
- **Toolbar refresh:** these controls now share the bottom toolbar. Draw adds mouse/pen/finger highlighting, adjustable size and colour, stroke erasing and session undo. The menu and settings panels open from the bottom.
- **Brand and information refresh:** the original CC0 book-and-bookmark mark replaces the earlier supplied logo. About, Updates, Contact and 43 product FAQs share an explicit appearance setting; light is the default. Social profiles appear only on Contact.

## Implemented, in order

1. **PDF preparation:** optional compression, page-range extraction, chapter extraction from a PDF's top-level index, and merging PDFs in a reorderable list. Results can be downloaded or opened directly. Originals are unchanged.
2. **Formats:** PDFs and EPUBs, DOCX/PPTX text reading, and JPG/PNG image sets converted into a PDF book in the chosen order. Slide text follows presentation order.
3. **Reading atmosphere:** existing page sounds, volume/mute, ambience and brightness controls are retained. Reader settings now also have an IndexedDB copy. Night mode restores raster-image regions after inversion; sepia remains available through Reading theme.
4. **Views:** automatic layout, manual single page, manual two-page spread and continuous scroll. Continuous scroll creates at most four full-page canvases near the reading position, and removes distant canvases.
5. **Study tools:** existing bookmarks and highlights, plus local page notes with saved-note navigation. New PDF annotations are stored with the book in IndexedDB; existing localStorage annotations are read for migration.
6. **Read aloud:** PDF page text and EPUB/Office chapter text using installed device voices only. Stop controls are included. Network voices are excluded.
7. **Reading habits:** existing progress/streak/daily goal tools plus a remaining-time estimate once there is enough recorded reading time and page-turn data for that book.
8. **Reading desks:** minimal, wood, dark studio, parchment and matte, saved on this device.
9. **Offline installation:** app manifest and icons, install button in supporting browsers, cached app shell and PDF preparation library, and offline reopening of locally saved books. Selected ambience still uses the existing separate audio cache.
10. **Touch and keyboard:** existing swipe-to-turn, two-finger zoom and desktop arrow shortcuts retained. Continuous scrolling supports touch panning and keyboard navigation.

## Practical limits and differences from the blueprint

- There is no promise that every 100 MB document opens instantly. Device memory and file complexity still matter. PDFs over 100 MB open the preparation tool; preparation accepts up to 160 MB of input on lower-memory devices and 300 MB on higher-memory devices. EPUB and Office input remains limited to 100 MB.
- Compression is offered automatically for large PDFs but requires a choice before lowering quality. The output is a flattened image PDF: searchable text, links, form interactivity and accessibility tags are removed. If it is larger than the original, the original is retained instead.
- DOCX and PPTX import readable text into the reflow reader. Original layouts, pictures, charts, animations and typography are not reconstructed. Export to PDF in Word or PowerPoint when those are important. Existing EPUB reading is also text-focused.
- Night mode preserves ordinary embedded raster images. Complex image groups, masks, transparency and overlapping elements can need further refinement. Vector graphics follow the inverted page colours.
- Scanned PDFs need searchable text from another tool before read-aloud works. OCR is not included. Available speech voices depend on the user's browser and installed device voices.
- The four-page limit follows the owner's earlier request. The blueprint suggests a current spread plus four neighbours, which would be six pages.
- Offline use requires one successful online visit for the app shell and enough device storage. Audio must have been cached before it can play offline. Browser storage can be cleared or evicted. Installation prompts vary by browser; iPhone installation uses Safari's Share → Add to Home Screen.
- There are no accounts or cross-device synchronisation. Uploaded documents are never sent to a server.

## Verification

Browser checks covered logo/appearance persistence, PDF import, all view modes, four-page canvas limits, saved notes, raster-image colours in night mode, range extraction, PDF merging, a smaller valid compressed output, image conversion, DOCX/PPTX text and slide order, offline app reload with a saved PDF and notes, and a narrow mobile layout.

These checks are browser emulation. They do not replace physical Android/iPhone testing or subjective listening to every audio recording.
