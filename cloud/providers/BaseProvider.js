import { CloudError, MAX_BOOK, MAX_STATE, validateState, filename } from '../types/CloudStorageProvider.js';
export class BaseProvider {
    auth;
    files = new Map();
    controller = new AbortController();
    accountIdentity = '';
    states = new Map();
    constructor(auth) {
        this.auth = auth;
    }
    async connect() { this.controller = new AbortController(); const user = await this.auth.connect(); try {
        await this.initialize();
        return { ...user, id: this.accountIdentity || user.id };
    }
    catch (e) {
        this.auth.disconnect();
        throw e;
    } }
    async disconnect() { this.controller.abort(); this.auth.disconnect(); this.files.clear(); this.states.clear(); }
    async request(url, init = {}, authorized = true, allowed = []) {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' || !(this.id === 'google' ? parsed.origin === 'https://www.googleapis.com' : this.id === 'dropbox' ? ['https://api.dropboxapi.com', 'https://content.dropboxapi.com'].includes(parsed.origin) : parsed.origin === 'https://graph.microsoft.com' || /(^|\.)(1drv\.com|onedrive\.live\.com|sharepoint\.com)$/.test(parsed.hostname)))
            throw new CloudError('Unexpected cloud endpoint.', 'invalid');
        if (!navigator.onLine)
            throw new CloudError('Offline — saved locally. Sync will resume when connected.', 'offline');
        let response;
        for (let attempt = 0; attempt < 4; attempt++) {
            const headers = new Headers(init.headers);
            if (authorized)
                headers.set('Authorization', 'Bearer ' + this.auth.bearer());
            try {
                response = await fetch(url, { ...init, headers, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(120000)]) });
            }
            catch (e) {
                if (this.controller.signal.aborted)
                    throw e;
                if (attempt === 3)
                    throw new CloudError('Cloud connection interrupted. Your local changes are queued.');
                await this.pause(500 * 2 ** attempt);
                continue;
            }
            if (![429, 500, 502, 503, 504].includes(response.status))
                break;
            const retry = Number(response.headers.get('Retry-After'));
            if (attempt < 3)
                await this.pause(Math.min(30000, Number.isFinite(retry) && retry > 0 ? retry * 1000 : 500 * 2 ** attempt));
        }
        if (!response)
            throw new CloudError('Cloud connection interrupted.');
        if (response.status === 401)
            throw new CloudError('Reconnect your cloud account. Your local books are safe.', 'auth');
        if ((response.status === 409 || response.status === 412) && !allowed.includes(response.status))
            throw new CloudError('Cloud data changed. Sync again to merge both devices.', 'conflict');
        if (!response.ok && response.status !== 308 && response.status !== 404 && !allowed.includes(response.status))
            throw new CloudError(response.status === 507 ? 'Your cloud drive is full. Free some space, then sync again.' : 'Cloud request could not finish (' + response.status + ').', response.status === 507 ? 'quota' : 'network');
        return response;
    }
    pause(ms) { return new Promise((resolve, reject) => { const signal = this.controller.signal; if (signal.aborted)
        return reject(new DOMException('Cancelled', 'AbortError')); const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); }, timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms); signal.addEventListener('abort', abort, { once: true }); }); }
    async blob(response, limit = MAX_BOOK, progress) { if (!response.ok)
        throw new CloudError('The cloud file is missing. Sync the original device again.'); const total = Number(response.headers.get('Content-Length')) || 0; if (total > limit)
        throw new CloudError('Cloud file exceeds the size limit.', 'invalid'); const reader = response.body?.getReader(); if (!reader)
        throw new CloudError('The cloud file is empty.', 'invalid'); const chunks = []; let size = 0; try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.byteLength;
            if (size > limit) {
                await reader.cancel();
                throw new CloudError('Cloud file exceeds the size limit.', 'invalid');
            }
            chunks.push(new Uint8Array(value));
            if (total)
                progress?.(Math.min(99, size / total * 100));
        }
    }
    finally {
        reader.releaseLock();
    } if (total && total !== size)
        throw new CloudError('The cloud file was incomplete.'); progress?.(100); return new Blob(chunks, { type: response.headers.get('Content-Type') || 'application/octet-stream' }); }
    async refresh() { const files = await this.listFiles(); if (files.length > 20000)
        throw new CloudError('This cloud library has too many files.', 'invalid'); this.files = new Map(files.filter(f => /^(library-state\.json|device-[-\w]{1,80}\.json|book-[a-f0-9]{64}\.bin)$/.test(f.name)).map(f => [f.name, f])); return files; }
    async readState(file) { const cached = this.states.get(file.id); if (file.version && cached?.version === file.version)
        return structuredClone(cached.state); const state = validateState(JSON.parse(await (await this.readFile(file, undefined, MAX_STATE)).text())); if (file.version)
        this.states.set(file.id, { version: file.version, state: structuredClone(state) }); return state; }
    async readLibraryState() { await this.refresh(); const file = this.files.get('library-state.json'); return file ? this.readState(file) : null; }
    async readDeviceStates() { const files = await this.refresh(); const states = []; for (const f of files)
        if (/^device-[-\w]{1,80}\.json$/.test(f.name))
            states.push(await this.readState(f)); return states; }
    async putState(name, state) { validateState(state); const body = new Blob([JSON.stringify(state)], { type: 'application/json' }); if (body.size > MAX_STATE)
        throw new CloudError('Too much reading data for a single sync. Export a ZIP backup.', 'invalid'); const file = await this.writeFile(name, body, this.files.get(name)); this.files.set(name, file); if (file.version)
        this.states.set(file.id, { version: file.version, state: structuredClone(state) }); }
    writeLibraryState(state) { return this.putState('library-state.json', state); }
    writeDeviceState(state) { return this.putState('device-' + state.deviceId + '.json', state); }
    async uploadBookFile(id, file, progress) { if (!file.size || file.size > MAX_BOOK)
        throw new CloudError('Cloud sync supports books up to 100 MB. Use ZIP for larger books.', 'invalid'); const name = filename(id); if (this.files.has(name)) {
        progress?.(100);
        return;
    } this.files.set(name, await this.writeFile(name, file, undefined, progress)); }
    async downloadBookFile(id, progress) { const name = filename(id); if (!this.files.has(name))
        await this.refresh(); const f = this.files.get(name); if (!f)
        throw new CloudError('This book has not finished uploading. Sync its original device first.'); return this.readFile(f, progress); }
}
