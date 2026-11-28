import { BaseProvider } from './BaseProvider.js';
import { BrowserAuth } from './auth.js';
import { CloudError, MAX_BOOK } from '../types/CloudStorageProvider.js';
export class DropboxProvider extends BaseProvider {
    id = 'dropbox';
    constructor(clientId) { super(new BrowserAuth('dropbox', clientId)); }
    async initialize() { } // The App Folder app registration, not a user-selected path, enforces the boundary.
    async rpc(path, body) { return (await this.request('https://api.dropboxapi.com/2/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json(); }
    async listFiles() { const out = []; let d = await this.rpc('files/list_folder', { path: '', recursive: false, limit: 2000 }); while (true) {
        out.push(...d.entries.filter((f) => f['.tag'] === 'file').map((f) => ({ id: f.path_lower, name: f.name, version: f.rev })));
        if (!d.has_more)
            break;
        d = await this.rpc('files/list_folder/continue', { cursor: d.cursor });
    } return out; }
    async readFile(file, progress, limit = MAX_BOOK) { return this.blob(await this.request('https://content.dropboxapi.com/2/files/download', { method: 'POST', headers: { 'Dropbox-API-Arg': JSON.stringify({ path: file.id }) } }), limit, progress); }
    async content(path, arg, body) { const response = await this.request('https://content.dropboxapi.com/2/files/' + path, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': JSON.stringify(arg) }, body }, true, [409]); const text = await response.text(), data = text ? JSON.parse(text) : null; if (response.status === 409) {
        const error = data?.error, offset = error?.correct_offset ?? error?.lookup_failed?.correct_offset;
        if (Number.isSafeInteger(offset))
            return { retryOffset: offset };
        throw new CloudError('Dropbox data changed. Sync again to merge both devices.', 'conflict');
    } return data; }
    async writeFile(name, file, existing, progress) { const commit = { path: '/' + name, mode: existing ? { '.tag': 'update', update: existing.version } : { '.tag': 'add' }, autorename: false, mute: true, strict_conflict: true }; const chunk = 8 * 1024 * 1024; let d; if (file.size <= chunk)
        d = await this.content('upload', commit, file);
    else {
        const first = await this.content('upload_session/start', { close: false }, file.slice(0, chunk));
        if (!first?.session_id)
            throw new CloudError('Dropbox did not start the upload.');
        let offset = chunk, attempts = 0;
        progress?.(offset / file.size * 100);
        while (offset < file.size) {
            if (++attempts > Math.ceil(file.size / chunk) * 2 + 8)
                throw new CloudError('Dropbox could not resume this upload. Sync again.');
            const end = Math.min(file.size, offset + chunk), last = end === file.size;
            d = await this.content(last ? 'upload_session/finish' : 'upload_session/append_v2', last ? { cursor: { session_id: first.session_id, offset }, commit } : { cursor: { session_id: first.session_id, offset }, close: false }, file.slice(offset, end));
            if (d?.retryOffset !== undefined) {
                if (d.retryOffset < 0 || d.retryOffset >= file.size)
                    throw new CloudError('Dropbox upload session needs restarting.');
                offset = d.retryOffset;
                continue;
            }
            offset = end;
            progress?.(offset / file.size * 100);
        }
    } if (!d?.path_lower || !d?.rev)
        throw new CloudError('Dropbox did not confirm the upload. Sync again.'); progress?.(100); return { id: d.path_lower, name: d.name, version: d.rev }; }
}
