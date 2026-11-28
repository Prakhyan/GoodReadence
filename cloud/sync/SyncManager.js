import { CloudError } from '../types/CloudStorageProvider.js';
import { mergeStates, stable } from './merge.js';
export class SyncManager extends EventTarget {
    local;
    provider = null;
    profile = null;
    status = { phase: 'disconnected', message: 'Not connected', auto: true };
    generation = 0;
    connecting = null;
    running = null;
    timer;
    hidden = new Set();
    change = 0;
    downloads = new Map();
    constructor(local) {
        super();
        this.local = local;
        addEventListener('gr:changed', e => { const detail = e.detail; if (detail?.kind === 'import')
            local.clearHash(detail.book?.id); this.queue(); });
        addEventListener('gr:restored', () => { local.clearHash(); this.queue(); });
        addEventListener('offline', () => this.publish('offline', 'Offline — saved locally'));
        addEventListener('online', () => { if (this.provider && this.status.auto)
            this.sync().catch(() => { }); });
        setInterval(() => { if (this.provider && this.status.auto && document.visibilityState === 'visible' && navigator.onLine)
            this.sync().catch(() => { }); }, 60000);
    }
    publish(phase, message, progress) { this.status = { ...this.status, phase, message, provider: this.provider?.id, progress }; this.dispatchEvent(new Event('status')); }
    async initialize() { const saved = await this.local.setting('connection'); if (saved)
        this.status = { ...this.status, phase: 'reconnect', provider: saved.provider, auto: saved.auto, lastSynced: saved.lastSynced, message: 'Reconnect to resume cloud sync. Saved books stay available.' }; this.dispatchEvent(new Event('status')); }
    async connect(provider) { if (this.status.phase === 'connecting' || this.running)
        throw new CloudError('Wait for the current sync, or disconnect it first.'); if (this.provider)
        await this.disconnect(); const generation = ++this.generation; this.connecting = provider; this.publish('connecting', 'Opening secure sign-in…'); try {
        const profile = await provider.connect();
        if (generation !== this.generation) {
            await provider.disconnect();
            return;
        }
        this.connecting = null;
        this.provider = provider;
        this.profile = profile;
        this.hidden = new Set(await this.local.setting('hidden:' + profile.id) || []);
        await this.persist();
        await this.sync();
    }
    catch (e) {
        if (generation === this.generation)
            this.connecting = null;
        if (generation === this.generation)
            this.publish(e instanceof CloudError && e.code === 'auth' ? 'reconnect' : 'error', e.message);
        throw e;
    } }
    persist() { return this.local.save('connection', this.profile ? { provider: this.profile.provider, auto: this.status.auto, lastSynced: this.status.lastSynced } : null); }
    async disconnect() { ++this.generation; clearTimeout(this.timer); const p = this.provider || this.connecting; this.connecting = null; this.provider = null; this.profile = null; await p?.disconnect(); this.downloads.clear(); await this.local.save('connection', null); this.publish('disconnected', 'Disconnected on this device. Cloud copies are kept.'); }
    setAuto(auto) { this.status.auto = auto; this.persist().catch(() => { }); this.dispatchEvent(new Event('status')); if (auto)
        this.queue(); }
    queue() { this.change++; if (this.status.phase === 'connecting')
        return; if (this.profile)
        this.local.save('pending:' + this.profile.id, true).catch(() => this.publish('error', 'Could not save the sync queue. Local books are still saved.')); if (!this.provider || this.status.phase === 'reconnect')
        return; this.publish(navigator.onLine ? 'queued' : 'offline', navigator.onLine ? 'Changes saved locally · waiting to sync' : 'Offline — saved locally'); clearTimeout(this.timer); if (this.status.auto)
        this.timer = setTimeout(() => this.sync().catch(() => { }), 2500); }
    sync() {
        if (this.running)
            return this.running;
        if (!this.provider || !this.profile)
            return Promise.resolve();
        if (!navigator.onLine) {
            this.publish('offline', 'Offline — saved locally');
            return Promise.resolve();
        }
        const provider = this.provider, profile = this.profile, generation = this.generation;
        const work = async () => {
            const changed = this.change, current = () => this.generation === generation && this.provider === provider;
            this.publish('syncing', 'Checking your cloud library…');
            try {
                const local = await this.local.snapshot(profile.id, this.hidden), index = await provider.readLibraryState(), journals = await provider.readDeviceStates();
                let merged = await mergeStates([...(index ? [index] : []), ...journals, local.state], this.local.host.deviceId);
                this.local.validate(merged);
                for (const [hash, file] of local.files) {
                    if (!current())
                        return;
                    this.publish('syncing', 'Saving a book to your ' + profile.displayName + '…', 0);
                    await provider.uploadBookFile(hash, file, p => this.publish('syncing', 'Saving a book to your ' + profile.displayName + '…', p));
                }
                if (!current())
                    return;
                // A per-device journal is committed before the shared index. Racing index writes
                // can therefore always be reconstructed without losing another device's edits.
                const own = journals.find(s => s.deviceId === this.local.host.deviceId);
                if (!own || stable(own.books) !== stable(merged.books))
                    await provider.writeDeviceState(merged);
                if (!current())
                    return;
                if (!index || stable(index.books) !== stable(merged.books))
                    await provider.writeLibraryState(merged);
                if (!current())
                    return;
                merged = await this.local.apply(merged, profile.id, this.hidden, current);
                if (!current())
                    return;
                this.status.lastSynced = Date.now();
                await this.persist();
                await this.local.save('pending:' + profile.id, this.change !== changed);
                const conflicts = Object.values(merged.books).filter(b => b.metadata.grConflictOf).length;
                this.publish(this.change === changed ? 'synced' : 'queued', (this.change === changed ? 'Synced to ' + profile.displayName + ' · Just now' : 'New changes saved locally · waiting to sync') + (conflicts ? ' · Other-device edits kept as separate copies' : '') + (local.oversized ? ' · ' + local.oversized + ' large book(s) need ZIP backup' : ''));
                if (this.change !== changed && this.status.auto)
                    this.timer = setTimeout(() => this.sync().catch(() => { }), 2500);
            }
            catch (e) {
                if (!current())
                    return;
                await this.local.save('pending:' + profile.id, true).catch(() => { });
                this.publish(!navigator.onLine ? 'offline' : e instanceof CloudError && e.code === 'auth' ? 'reconnect' : 'error', !navigator.onLine ? 'Offline — saved locally' : e instanceof CloudError ? e.message : e instanceof DOMException && e.name === 'QuotaExceededError' ? 'Device storage is full. Local books are kept; free space and sync again.' : 'Sync did not finish. Your local library is safe. Try again.');
                throw e;
            }
        };
        const task = (async () => { if (!navigator.locks)
            throw new CloudError('This browser cannot safely coordinate cloud sync between tabs. ZIP backups remain available.'); await navigator.locks.request('gr-cloud-sync', async () => { await work(); }); })();
        const result = task.finally(() => { this.running = null; });
        this.running = result;
        return result;
    }
    async hideLocalBook(id) { this.hidden.add(id); if (this.profile)
        await this.local.save('hidden:' + this.profile.id, [...this.hidden]); this.queue(); }
    async restoreListings() { this.hidden.clear(); if (this.profile)
        await this.local.save('hidden:' + this.profile.id, []); await this.sync(); }
    async ensureBook(book, progress) { const ref = book.grCloud; if (!ref)
        throw new CloudError('This file is missing. Choose the original file again.', 'invalid'); if (!navigator.onLine)
        throw new CloudError('This book isn’t on this device yet. Go online to download it.', 'offline'); if (!this.provider || this.profile?.id !== ref.account)
        throw new CloudError('Connect the cloud account used for this book, then open it again.', 'auth'); if (this.downloads.has(book.id))
        return this.downloads.get(book.id); const provider = this.provider, generation = this.generation; const promise = (async () => { const blob = await provider.downloadBookFile(ref.hash, progress); if (blob.size !== ref.size)
        throw new CloudError('The downloaded book is incomplete. Try again.', 'invalid'); const file = new File([blob], ref.filename, { type: ref.mime }); await this.local.storeFile(book, file, ref.hash, () => this.generation === generation); return file; })().finally(() => this.downloads.delete(book.id)); this.downloads.set(book.id, promise); return promise; }
}
