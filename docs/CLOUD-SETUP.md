# Turn on personal-cloud connections

The backup, notes export and device transfer features work without any registration. Cloud connections are implemented but disabled until you register GoodReadence with each provider. These registrations identify the app; users still connect their own accounts and use their own storage. No GoodReadence storage server or paid relay is required.

Only **public client/app IDs** go in `cloud-config.json`. Never paste a client secret, access token, password or refresh token into this file or GitHub.

## Google Drive

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create/select a project for GoodReadence.
2. Enable **Google Drive API**. In **Google Auth Platform**, fill in the app name, support email, home page `https://goodreadence.vercel.app/` and privacy notice `https://goodreadence.vercel.app/privacy.html`.
3. Choose an External audience if this is for public users. Add your account as a test user while testing.
4. Add the non-sensitive scope `https://www.googleapis.com/auth/drive.appdata`. The app uses its hidden application-data folder, not unrestricted access to the user's Drive.
5. Create an **OAuth client ID → Web application**. Add `https://goodreadence.vercel.app` as an authorized JavaScript origin. For local testing, add `http://127.0.0.1:8787` separately.
6. Copy the client ID ending in `.apps.googleusercontent.com` into `googleClientId` in `cloud-config.json`.
7. Test with the registered test account. Complete Google's publishing/domain/consent requirements before offering it to everyone.

Google uses its official Identity Services token client. Sign-in is requested by the user's Connect button. Tokens stay in memory and expire; reconnecting is occasionally necessary.

Official guides: [token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [application data folder](https://developers.google.com/workspace/drive/api/guides/appdata).

## Dropbox

1. Open the [Dropbox App Console](https://www.dropbox.com/developers/apps) and create an app with **Scoped access** and **App folder** access.
2. Set the app name, contact details, home page and privacy link.
3. Under Permissions, enable `files.metadata.read`, `files.content.read` and `files.content.write`. Submit/save the changes.
4. Add this exact redirect URI: `https://goodreadence.vercel.app/cloud-callback.html`. For local testing add `http://127.0.0.1:8787/cloud-callback.html` separately.
5. If the console offers a public-client/PKCE switch, enable public client PKCE. The app uses authorization-code flow with S256 PKCE, not a client secret.
6. Copy the **App key** into `dropboxClientId` in `cloud-config.json`.
7. Test using an allowed development account, then complete Dropbox's production-access requirements to open it to public users.

Official guide: [Dropbox authorization](https://docs.dropboxapi.com/dropbox-api/docs/get-started/authorization).

## OneDrive personal

1. Open [Microsoft Entra app registrations](https://entra.microsoft.com/) and create a registration for GoodReadence. Enable personal Microsoft accounts.
2. Add a **Single-page application (SPA)** platform with redirect URI `https://goodreadence.vercel.app/cloud-callback.html`. The SPA type is required for browser token requests. Add the localhost redirect separately for local testing.
3. Add Microsoft Graph **delegated** permission `Files.ReadWrite.AppFolder`. Do not configure broad access to users' drives or create a client secret.
4. Add the home page, publisher/contact details and privacy notice. Complete any tenant/account verification Microsoft requires.
5. Copy **Application (client) ID** into `oneDriveClientId` in `cloud-config.json`.
6. Test with a **personal** Microsoft account. Work/school OneDrive accounts are not supported by this app-folder connection. If Microsoft returns an app-folder permissions error, check the registration/provider status; do not silently replace it with full-drive access.

Official guides: [app folders](https://learn.microsoft.com/graph/onedrive-sharepoint-appfolder), [SPA authorization with PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).

## Finish activation

Send the three public IDs to the project maintainer, or edit `cloud-config.json`, then commit and deploy. A provider's Connect button enables only when its ID is present. Register only production and deliberate local-test origins; unregistered preview URLs cannot sign users in.

Before public activation, test each real account flow: connect, upload a small book, open the app on a second device, connect the same account, receive the book and its reading data, edit notes on both devices, sync again, disconnect, and revoke permissions in the provider's account settings. Live provider authentication cannot be verified until the registrations exist.

## How storage and sync work

- Books and reading data go directly between the browser and the selected provider over HTTPS. GoodReadence does not receive book files at an application backend.
- Book binaries are identified by SHA-256 and uploaded once. Small per-device manifests carry progress and annotations, so page turns do not re-upload every book.
- Separate device manifests avoid two devices overwriting a shared progress file. Book revision clocks distinguish later changes from concurrent changes. Concurrent reading copies are preserved separately.
- Appearance/settings remain device-specific during cloud sync. Full ZIP backups include settings.
- Sync runs while the app is open, online and signed in, approximately once a minute. It is not a background OS service. Tokens are held in memory, so reopening the app requires reconnecting.
- Removing a local book does not delete cloud copies; manage cloud retention in the provider's app-data controls. Disconnecting does not erase files already stored there.
- Cloud sync accepts individual books up to 128 MB. QR transfer allows 128 MB for the complete transfer archive, including the book and its reading data. Complete ZIP backups allow 300 MB per book and 1 GB total. Personal cloud quotas and provider limits still apply.
- Backups and cloud files are not additionally password-encrypted by GoodReadence. Use trusted storage/accounts and keep backup files private.

## QR device transfer

Open **Backup & transfer → Device transfer** on the laptop, select a book, and create the sending QR. Scan it with the phone's camera or the app's scanner. On the phone, choose **Use pasted code** to generate a reply QR. Scan that reply with the laptop's in-app scanner, or paste its reply code. The phone then explicitly accepts the named book. The app verifies the archive before importing it.

The two scans carry WebRTC connection descriptions, not book contents. Same-Wi-Fi mode has no external signalling or STUN service. Different-network mode optionally uses Google's STUN lookup; no TURN relay is configured, so restrictive networks, VPNs or Wi-Fi client isolation can prevent a direct connection. Use the backup file when a direct route cannot be made. Camera frames are processed locally. Stop camera, closing the dialog or leaving the page releases the stream and peer connection.
