import { prepareGoogle } from '../providers/auth.js';
const labels = { google: 'Google Drive', dropbox: 'Dropbox', onedrive: 'OneDrive' };
export class CloudSyncSettings {
    manager;
    providers;
    enabled;
    panel;
    badge;
    preparingGoogle = false;
    constructor(manager, providers, enabled) {
        this.manager = manager;
        this.providers = providers;
        this.enabled = enabled;
        this.panel = document.querySelector('[data-portable-panel="cloud"]');
        this.panel.replaceChildren();
        this.panel.insertAdjacentHTML('beforeend', `<div class="cloud-heading"><span aria-hidden="true">☁</span><div><p class="cloud-eyebrow">Your own storage</p><h3>Keep your reading in sync.</h3></div></div><p>Your books and notes sync directly to your own cloud drive. GoodReadence requests app-specific access, not access to your entire drive.</p><div class="cloud-providers"></div><p class="cloud-setup-note"></p><label class="cloud-auto"><input type="checkbox" data-auto> Sync automatically while the app is open</label><div class="cloud-controls"><button data-now>Sync now</button><button data-disconnect>Disconnect</button><button data-restore>Restore cloud listings</button></div><progress class="cloud-progress" max="100" value="0" hidden aria-label="Cloud file transfer"></progress><p class="cloud-status" role="status" aria-live="polite"></p><p class="cloud-small">New devices download a book when you open it. Books already on this device remain available offline. Cloud sync supports files up to 100 MB.</p><p class="cloud-small">Using Apple iCloud? Choose Link local backup folder in App settings where your browser supports it.</p><details class="cloud-privacy"><summary>Storage & privacy</summary><p>Dropbox and OneDrive use their isolated app folders. Google’s drive.file permission covers files created or explicitly opened through this app; GoodReadence uses its GoodReadence_Library folder.</p><p>Only one drive can be connected at a time. Sign-in stays in memory; you may need to reconnect after reopening or when access expires. No GoodReadence server stores your private books, notes or sign-in tokens.</p><p>Apple iCloud users: use App settings → Link local backup folder, and choose a folder in iCloud Drive where browser folder access is supported. This is a backup, not automatic cross-device reading sync.</p><p>Removing a book from this device keeps its cloud copy. Restore cloud listings brings it back. Concurrent edits are kept as separate copies, so neither version’s notes disappear.</p></details>`);
        for (const id of Object.keys(labels)) {
            const row = document.createElement('div');
            row.className = 'cloud-provider';
            const name = document.createElement('strong');
            name.textContent = labels[id];
            const detail = document.createElement('small');
            detail.textContent = id === 'google' ? 'GoodReadence_Library' : id === 'dropbox' ? 'Your Dropbox App Folder' : 'Your OneDrive App Folder · personal account';
            const text = document.createElement('span');
            text.append(name, detail);
            const button = document.createElement('button');
            button.dataset.provider = id;
            button.textContent = this.enabled[id] ? 'Connect' : 'Not available yet';
            button.disabled = !this.enabled[id];
            button.onclick = async () => { if (id === 'google' && !window.google) {
                try {
                    await prepareGoogle();
                    this.panel.querySelector('.cloud-status').textContent = 'Google sign-in is ready. Choose Connect again to continue.';
                }
                catch (e) {
                    this.panel.querySelector('.cloud-status').textContent = e.message;
                }
                return;
            } await this.run(() => this.manager.connect(this.providers[id]())); };
            row.append(text, button);
            this.panel.querySelector('.cloud-providers').append(row);
        }
        this.panel.querySelector('[data-auto]').onchange = e => this.manager.setAuto(e.target.checked);
        this.panel.querySelector('[data-now]').onclick = () => this.run(() => manager.sync());
        this.panel.querySelector('[data-disconnect]').onclick = () => this.run(() => manager.disconnect());
        this.panel.querySelector('[data-restore]').onclick = () => this.run(() => manager.restoreListings());
        this.badge = document.createElement('div');
        this.badge.className = 'cloud-library-status';
        this.badge.innerHTML = '<span role="status" aria-live="polite"></span><button type="button">Sync now</button>';
        this.badge.querySelector('button').onclick = () => this.run(() => manager.sync());
        document.querySelector('.library-header').after(this.badge);
        manager.addEventListener('status', () => this.paint());
        setInterval(() => this.paint(), 60000);
        new MutationObserver(() => { if (!this.panel.hidden && this.enabled.google && !window.google && !this.preparingGoogle) {
            this.preparingGoogle = true;
            this.paint();
            prepareGoogle().catch(() => { this.panel.querySelector('.cloud-status').textContent = 'Google sign-in could not load. Check your connection and choose Prepare sign-in to retry.'; }).finally(() => { this.preparingGoogle = false; this.paint(); });
        } }).observe(this.panel, { attributes: true, attributeFilter: ['hidden'] });
        this.paint();
    }
    async run(action) { try {
        await action();
    }
    catch (e) {
        this.panel.querySelector('.cloud-status').textContent = e.message;
    }
    finally {
        this.paint();
    } }
    paint() {
        const { status, provider } = this.manager, working = status.phase === 'connecting' || status.phase === 'syncing';
        for (const button of this.panel.querySelectorAll('[data-provider]')) {
            const id = button.dataset.provider;
            button.disabled = !this.enabled[id] || working || !!provider && provider.id !== id;
            button.textContent = provider?.id === id ? (status.phase === 'reconnect' ? 'Reconnect' : 'Connected') : this.enabled[id] ? 'Connect' : 'Not available yet';
            if (provider?.id === id && status.phase !== 'reconnect')
                button.disabled = true;
        }
        if (this.enabled.google && !window.google) {
            const button = this.panel.querySelector('[data-provider=google]');
            button.disabled = working || this.preparingGoogle || !!provider && provider.id !== 'google';
            button.textContent = this.preparingGoogle ? 'Preparing sign-in…' : 'Prepare sign-in';
        }
        this.panel.querySelector('[data-auto]').checked = !!provider && status.auto;
        this.panel.querySelector('[data-auto]').disabled = !provider;
        for (const button of this.panel.querySelectorAll('[data-now],[data-restore]'))
            button.disabled = !provider || working || !navigator.onLine;
        this.panel.querySelector('[data-disconnect]').disabled = !provider && status.phase !== 'connecting';
        this.panel.querySelector('.cloud-status').textContent = status.message;
        const progress = this.panel.querySelector('progress');
        progress.hidden = status.progress === undefined;
        progress.value = status.progress || 0;
        this.panel.querySelector('.cloud-setup-note').textContent = Object.values(this.enabled).some(Boolean) ? 'Connect one drive to sync your shelf. Your existing ZIP backups stay available.' : 'Cloud sign-in is not available on this site yet. ZIP backup, QR transfer and local-folder backups are ready.';
        this.badge.hidden = !provider && !status.provider;
        const minutes = status.lastSynced ? Math.max(0, Math.floor((Date.now() - status.lastSynced) / 60000)) : 0;
        this.badge.querySelector('span').textContent = !navigator.onLine ? 'Offline — saved locally' : status.phase === 'synced' && provider ? 'Synced to ' + labels[provider.id] + ' · ' + (minutes === 0 ? 'Just now' : minutes < 60 ? minutes + ' min ago' : Math.floor(minutes / 60) + ' hr ago') : status.message;
        this.badge.querySelector('button').disabled = !provider || working || !navigator.onLine;
    }
}
