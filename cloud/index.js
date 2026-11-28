import { GoogleDriveProvider } from './providers/GoogleDriveProvider.js';
import { DropboxProvider } from './providers/DropboxProvider.js';
import { OneDriveProvider } from './providers/OneDriveProvider.js';
import { LocalStore } from './sync/LocalStore.js';
import { SyncManager } from './sync/SyncManager.js';
import { CloudSyncSettings } from './components/CloudSyncSettings.js';
import { prepareGoogle } from './providers/auth.js';
export async function initialize(config) {
    const local = new LocalStore(window.GRCloudHost), manager = new SyncManager(local), providers = { google: () => new GoogleDriveProvider(config.googleClientId || ''), dropbox: () => new DropboxProvider(config.dropboxClientId || ''), onedrive: () => new OneDriveProvider(config.oneDriveClientId || '') };
    const enabled = { google: !!config.googleClientId, dropbox: !!config.dropboxClientId && config.dropboxAppFolderConfirmed === true, onedrive: !!config.oneDriveClientId };
    const ui = new CloudSyncSettings(manager, providers, enabled);
    await manager.initialize();
    Object.assign(window.GRCloud, { manager, paint: () => ui.paint(), configured: async () => enabled, connect: (id) => { if (!enabled[id])
            throw Error('This connection is not available yet.'); return manager.connect(providers[id]()); }, sync: () => manager.sync(), disconnect: () => manager.disconnect(), clearFileHashes: () => local.clearHash(), prepareGoogle, ensureBook: (b, progress) => manager.ensureBook(b, progress), hideLocalBook: (id) => manager.hideLocalBook(id), setStatus: () => { } });
    Object.defineProperty(window.GRCloud, 'state', { configurable: true, get: () => ({ provider: manager.provider?.id || null, auto: manager.status.auto, busy: manager.status.phase === 'syncing' }) });
    return manager;
}
