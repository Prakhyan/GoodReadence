# Personal cloud sync — setup and architecture

**Provider client IDs are currently blank. Real sign-in is not activated or certified with provider accounts yet.** The adapters and native DOM interface are implemented; ZIP, QR and folder backups remain usable. Finish the registrations and real-account checks below before advertising live cloud connections.

Only public app/client IDs belong in `cloud-config.json`. Never add secrets, tokens or passwords. Private sync calls go directly from the browser to the selected provider; they never use GoodReadence's public-catalogue APIs. No private-file server or database is required.

## Google Drive checklist

1. Create/select a project in [Google Cloud Console](https://console.cloud.google.com/). Enable **Google Drive API**.
2. Configure Google Auth Platform: GoodReadence name, support email, website and privacy page. Use External audience and registered test users while in Testing.
3. Add **`https://www.googleapis.com/auth/drive.file`**. Do not request full Drive access.
4. Create an OAuth **Web application** client. Authorized JavaScript origin: **`https://goodreadence.vercel.app`**. Local origin: **`http://127.0.0.1:8799`**, or your actual preview port. Origins have no path or trailing slash.
5. Put the ID ending `.apps.googleusercontent.com` in `googleClientId`. Test, then complete the console's publishing/domain/consent requirements for your production audience.

Google's scope covers app-created or explicitly opened files: **it is not a provider-enforced folder-only sandbox**. This implementation creates **GoodReadence_Library**, marks it with an app property and only discovers files inside its own marked folders. It uses no Picker. Duplicate folders created by simultaneous first connections are discovered and merged; renaming a marked folder does not lose it.

The supported zero-backend Google flow uses **Google Identity Services' token client**. It does not invent a browser code exchange requiring a client secret. Access tokens stay in memory and require reconnecting when expired. See [token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model) and [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

## Dropbox checklist

1. In [Dropbox App Console](https://www.dropbox.com/developers/apps), create **Scoped access → App folder**. Never choose Full Dropbox. The Apps subfolder name follows the registered app name.
2. Enable only `files.metadata.read`, `files.content.read` and `files.content.write`.
3. Add exact redirect **`https://goodreadence.vercel.app/cloud-callback.html`** and local redirect **`http://127.0.0.1:8799/cloud-callback.html`**.
4. Enable public-client PKCE if the console presents that option. The implementation uses code + S256 PKCE, short-lived online tokens and no client secret or stored refresh token.
5. Put the public **App key** in `dropboxClientId`. After checking **App folder** in the console, set `dropboxAppFolderConfirmed` to `true`. This is an owner assertion, not a runtime verification of Dropbox's registration. Activation is refused until it is true.
6. Test with your own account, then meet Dropbox's production-access requirements before opening to everyone.

API paths are relative to `/Apps/<registered app name>`. Official [OAuth guide](https://docs.dropboxapi.com/dropbox-api/docs/oauth).

## OneDrive checklist

1. Register GoodReadence in [Microsoft Entra](https://entra.microsoft.com/). This release intentionally supports **personal Microsoft accounts** using the `consumers` authority. Work/school accounts need a separately implemented and tested authority/tenant policy.
2. Add a **Single-page application (SPA)** platform redirect, not a Web/confidential-client redirect: **`https://goodreadence.vercel.app/cloud-callback.html`**. Add the exact local redirect separately.
3. Add Graph **delegated `Files.ReadWrite.AppFolder`**. Remove unrelated default permissions such as `User.Read`. Do not add `Files.ReadWrite`, `Files.ReadWrite.All`, application permissions, implicit token issuance or client secrets.
4. Put the public **Application (client) ID** in `oneDriveClientId`.
5. Test consent and upload/download with a personal OneDrive account. SPA redirect configuration is required for browser token-exchange CORS.

`me/drive/special/approot` creates `Apps/<Entra app name>`. The scope enforces this boundary; users can still put files in that folder themselves. Official [app-folder guide](https://learn.microsoft.com/en-us/graph/onedrive-sharepoint-appfolder).

## Build and activate

- Run `npm ci`, `npm run build:cloud`, and the checks below. Commit TypeScript, compiled `cloud/` modules and public configuration.
- Production copies committed JavaScript; it does not install a compiler or transpile code on readers' devices.
- Use HTTPS and register every exact origin/redirect you test. Vercel previews are distinct origins. Do not loosen scopes or redirect validation to bypass setup errors.
- Test in the system browser/PWA; providers can reject embedded-browser sign-in.

## Required real-account acceptance checks

Mock tests cannot certify provider consent, production approval or CORS. For **each** provider, verify:

- Connect, cancel, blocked popup, denied scope, wrong state/origin and token expiry. No token or PKCE verifier may appear in localStorage, IndexedDB, ZIP exports or logs. The callback removes its one-use code from browser history. Static hosting can receive callback URL metadata; no application backend exchanges the code.
- Confirm least-privilege permissions in the provider console. Google has app-created/opened-file access, not an absolute folder-only permission.
- Upload a PDF near 100 MB, interrupt/retry it, check final size and reopen a hash-verified download. Verify actual resumable headers and signed-URL CORS in the provider accounts.
- On a second device, recover listings without downloading binaries. Open one book; only that file should download. Reopen it offline.
- Edit the same book on both devices offline, including deleting/editing notes. Sync in both orders. All concurrent snapshots must remain available as separate readable copies.
- Try account switching, disconnect during sync, multiple tabs, quota/rate limits, missing and corrupt cloud files. No unrelated local book may disappear.

## Architecture

```
src/cloud/
  types/CloudStorageProvider.ts
  providers/auth.ts
  providers/BaseProvider.ts
  providers/GoogleDriveProvider.ts
  providers/DropboxProvider.ts
  providers/OneDriveProvider.ts
  sync/LocalStore.ts
  sync/merge.ts
  sync/SyncManager.ts
  components/CloudSyncSettings.ts
  index.ts
cloud/                     compiled ES modules, committed
cloud-sync.js              bridge into the existing vanilla reader
cloud-sync.css             scoped native controls
cloud-config.json          public app/client IDs only
tsconfig.cloud.json        strict compiler settings
```

There is no React, JSX or UI framework. Each adapter implements `CloudStorageProvider`; additional device-journal methods prevent simultaneous index writes from losing edits.

- Browser IndexedDB `casid` is primary. `goodreadence-cloud-v2` contains reconnect preferences, pending flags and hidden listing IDs, never tokens.
- `library-state.json` contains metadata/progress/marks/notes. Complete per-device `device-<uuid>.json` journals recover the index after write races. No cloud-delete operation exists.
- SHA-256-addressed `book-<hash>.bin` files upload before metadata is published. New devices keep references; files download, pass size/hash verification and commit atomically on opening.
- Vector clocks establish causality. `lastModified` selects a primary copy only when revisions are concurrent. The other revision becomes a separate readable book containing all its notes and marks. Identical snapshots deduplicate. Clock skew cannot discard a causally newer revision. This deliberately avoids blindly merging overlapping annotation arrays or silently deleting notes.
- PDF pages and EPUB chapter/paragraph/character anchors are retained. The text reader uses structural text anchors, **not EPUB CFI**. Original source editions must match. Typography and appearance remain device-specific.
- Active reader records are not replaced underneath an open book. New changes during a sync stay queued. Background sync runs only while the app is open with a valid sign-in; it cannot run after closure.
- Provider revisions cache unchanged manifests. Unchanged state is not rewritten. JSON manifests are capped at 16 MB, 10,000 records; binaries at 100 MB. Oversized local books remain intact and require ZIP backup.
- Removing a local book hides its listing on that device without deleting the cloud copy. Restore cloud listings brings it back. Download a cloud-only book before including its binary in ZIP/QR transfer; otherwise ZIP recovery retains its metadata/notes, not the unavailable file.
- Apple iCloud users can link a local backup folder inside iCloud Drive where browser folder access is supported. This is a backup option, not automatic reading-state synchronization.

## Large files

| Provider | Upload strategy | Recovery |
|---|---|---|
| Google | Resumable session; 8 MiB chunks, multiples of 256 KiB; Content-Range / 308 | Acknowledged offsets; expired or ambiguous final sessions restart on the next sync after listing files |
| Dropbox | Upload session start/append/finish; 8 MiB chunks; revision-conditioned JSON updates | Incorrect-offset replies resume at the server cursor; conflicts retain the pending queue |
| OneDrive | Upload session; 3.125 MiB chunks, 10 × 320 KiB; nextExpectedRanges | Continues from acknowledged offsets; signed upload/download requests never carry the Graph bearer token |

Upload sessions live in memory. Reloading, disconnecting or token expiry may restart the current binary transfer, while local edits remain durable. Transient retries are bounded and respect Retry-After. Refresh tokens and signed upload URLs are not persisted. A full drive requires the user to free space. Browser/OS closure is not a reliable background execution environment.

Official upload guides: [Google](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [Dropbox](https://www.dropbox.com/developers/documentation/http/documentation), [Microsoft](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0).

## Automated checks

```
npm run build:cloud
npm run test:cloud:core
npm run preview
# With the preview running, in another terminal:
npm run test:cloud:browser
```

Checks cover strict compilation, simulated 100 MB provider protocols, bearer-token/endpoint isolation, causal/concurrent edits and a real IndexedDB two-context flow with an in-memory test provider. Real provider-account acceptance remains required.
