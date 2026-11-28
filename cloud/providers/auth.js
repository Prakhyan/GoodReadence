import { CloudError } from '../types/CloudStorageProvider.js';
const base64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = () => base64(crypto.getRandomValues(new Uint8Array(32)));
let googleScript;
export function prepareGoogle() { if (window.google?.accounts.oauth2)
    return Promise.resolve(); return googleScript ||= (new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = () => resolve(); s.onerror = () => { googleScript = undefined; s.remove(); reject(new CloudError('Google sign-in could not load. Check your connection.')); }; document.head.append(s); })); }
export class BrowserAuth {
    provider;
    clientId;
    token = '';
    expires = 0;
    generation = 0;
    popup = null;
    constructor(provider, clientId) {
        this.provider = provider;
        this.clientId = clientId;
    }
    get connected() { return !!this.token && this.expires > Date.now() + 30000; }
    async connect() {
        if (!navigator.onLine)
            throw new CloudError('You’re offline. Your books are saved locally.', 'offline');
        if (!this.clientId)
            throw new CloudError('This connection needs the site owner’s app registration. ZIP backup and folder backups are available.', 'auth');
        const generation = ++this.generation;
        let data;
        if (this.provider === 'google') {
            if (!window.google)
                throw new CloudError('Google sign-in is still loading. Try Connect again.', 'auth');
            data = await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new CloudError('Sign-in timed out. Try Connect again.', 'auth')), 180000); const finish = (error, r) => { clearTimeout(timer); error ? reject(error) : resolve(r); }; const client = window.google.accounts.oauth2.initTokenClient({ client_id: this.clientId, scope: 'https://www.googleapis.com/auth/drive.file', include_granted_scopes: false, callback: (r) => { if (!r.access_token || !window.google.accounts.oauth2.hasGrantedAllScopes(r, 'https://www.googleapis.com/auth/drive.file'))
                    finish(new CloudError('Google Drive access was not granted.', 'auth'));
                else
                    finish(null, r); }, error_callback: () => finish(new CloudError('Sign-in was closed or blocked.', 'auth')) }); client.requestAccessToken({ prompt: 'select_account' }); });
        }
        else {
            // Open immediately inside the click gesture, before asynchronous PKCE hashing.
            this.popup = window.open('about:blank', 'gr-cloud-auth', 'popup,width=540,height=720');
            if (!this.popup)
                throw new CloudError('Allow the sign-in popup, then try Connect again.', 'auth');
            try {
                data = await this.pkce(this.popup);
            }
            finally {
                this.popup?.close();
                this.popup = null;
            }
        }
        if (generation !== this.generation)
            throw new CloudError('Sign-in cancelled.', 'auth');
        if (typeof data.access_token !== 'string')
            throw new CloudError('Sign-in did not return an access token.', 'auth');
        if (this.provider === 'dropbox' && typeof data.account_id !== 'string')
            throw new CloudError('Dropbox did not identify your account. Reconnect.', 'auth');
        this.token = data.access_token;
        this.expires = Date.now() + Number(data.expires_in || 3600) * 1000;
        return { id: this.provider + ':' + (typeof data.account_id === 'string' ? data.account_id : 'session'), displayName: { google: 'Google Drive', dropbox: 'Dropbox', onedrive: 'OneDrive' }[this.provider], provider: this.provider };
    }
    async pkce(popup) {
        const microsoft = this.provider === 'onedrive', verifier = random() + random(), challenge = base64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))), state = random(), redirect = new URL('/cloud-callback.html', location.origin).href;
        const query = new URLSearchParams({ client_id: this.clientId, response_type: 'code', redirect_uri: redirect, state, code_challenge: challenge, code_challenge_method: 'S256', scope: microsoft ? 'https://graph.microsoft.com/Files.ReadWrite.AppFolder' : 'files.metadata.read files.content.read files.content.write' });
        if (microsoft)
            query.set('response_mode', 'query');
        else
            query.set('token_access_type', 'online');
        const code = await new Promise((resolve, reject) => { let channel; let settled = false; const finish = (error, value) => { if (settled)
            return; settled = true; clearTimeout(timer); clearInterval(poll); removeEventListener('message', message); channel?.close(); error ? reject(error) : resolve(value); }; const receive = (d) => { if (d?.kind !== 'gr-cloud-auth' || d.state !== state)
            return; if (typeof d.error === 'string')
            finish(new CloudError('Sign-in was not completed.', 'auth'));
        else if (typeof d.code === 'string')
            finish(null, d.code); }; const message = (e) => { if (e.origin === location.origin && e.source === popup)
            receive(e.data); }; const timer = setTimeout(() => finish(new CloudError('Sign-in timed out.', 'auth')), 180000), poll = setInterval(() => { if (popup.closed || this.generation === 0)
            finish(new CloudError('Sign-in was closed.', 'auth')); }, 500); addEventListener('message', message); if ('BroadcastChannel' in window) {
            channel = new BroadcastChannel('gr-cloud-auth');
            channel.onmessage = e => receive(e.data);
        } popup.location.href = (microsoft ? 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize' : 'https://www.dropbox.com/oauth2/authorize') + '?' + query; });
        const response = await fetch(microsoft ? 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token' : 'https://api.dropboxapi.com/oauth2/token', { method: 'POST', body: new URLSearchParams({ client_id: this.clientId, grant_type: 'authorization_code', code, redirect_uri: redirect, code_verifier: verifier }), credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(60000) });
        if (!response.ok)
            throw new CloudError('Sign-in could not finish. Check the app registration and reconnect.', 'auth');
        return response.json();
    }
    bearer() { if (!this.connected) {
        this.token = '';
        throw new CloudError('Reconnect your cloud account. Your local books are safe.', 'auth');
    } return this.token; }
    disconnect() { this.generation++; this.token = ''; this.expires = 0; this.popup?.close(); this.popup = null; }
}
