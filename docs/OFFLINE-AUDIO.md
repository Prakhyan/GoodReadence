# Optional sound downloads

The reader and its information pages are cached independently of audio. Installation, reconnecting, switching tabs and opening a book never start a sound-pack download.

Ambience streams only after the reader selects a sound. The service worker passes streaming requests through, including byte ranges, without writing them to CacheStorage. Browser-managed temporary streaming buffers are separate from the app's offline downloads.

On the home and personal-library screens, the right-hand three-line menu groups app installation and **Settings & offline**. The menu is hidden while reading and on information/public-library pages; App settings remains accessible from reader Settings. There are no install/offline promotional cards on content pages. **Sound downloads** is a collapsible section in App settings, listing each recording and its size. An explicit Download action saves exactly that recording; Remove deletes it. Offline, unavailable choices and volume controls are disabled, with a message explaining how to download sounds while online. Downloaded choices remain playable offline. Paper rustle is generated locally and requires no downloaded recording.

Playback editions use AAC-LC at a 64 kbps target, retain the complete recording and preserve source channel layouts. Original source links, licences and credits remain in `ambience/catalog.json` and `ambience/CREDITS.html`. Private originals are kept outside the publication artifact. To re-encode, set `AUDIO_SOURCE_DIR` to their folder and `FFMPEG_PATH` to FFmpeg, then run `node scripts/compress-audio.cjs`.

The `goodreadence-audio-v3` cache contains only explicit downloads. Activating the updated worker removes older, larger automatic audio caches. Run `node scripts/check-audio-files.cjs` for complete-file decoding and `npm run test:offline` for installed-app opt-in behavior, offline controls, individual downloads, cache migration and offline PDF imports.

Installation visibility uses standalone mode, the browser installation event and the related-apps API where available, refreshing on return to the page or opening the menu. A new install prompt also restores the install action. No permanent localStorage flag can leave it hidden after uninstall. Safari does not expose related-app installation status in a normal browser tab; installed standalone windows hide the action, while Safari keeps its manual installation guide available.
