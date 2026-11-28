import { BaseProvider } from './BaseProvider.js';
import { BrowserAuth } from './auth.js';
import { CloudError, MAX_BOOK } from '../types/CloudStorageProvider.js';
export class OneDriveProvider extends BaseProvider {
    id = 'onedrive';
    root = '';
    constructor(clientId) { super(new BrowserAuth('onedrive', clientId)); }
    async initialize() { const d = await (await this.request('https://graph.microsoft.com/v1.0/me/drive/special/approot')).json(); if (!d.id)
        throw new CloudError('OneDrive app folder is unavailable.'); this.root = d.id; this.accountIdentity = 'onedrive:' + d.id; }
    async listFiles() { let url = 'https://graph.microsoft.com/v1.0/me/drive/items/' + encodeURIComponent(this.root) + '/children?$top=200'; const out = []; while (url) {
        if (new URL(url).origin !== 'https://graph.microsoft.com')
            throw new CloudError('Unexpected OneDrive page.', 'invalid');
        const d = await (await this.request(url)).json();
        out.push(...d.value.filter((f) => f.file).map((f) => ({ id: f.id, name: f.name, version: f.eTag })));
        url = d['@odata.nextLink'] || '';
    } return out; }
    async readFile(file, progress, limit = MAX_BOOK) { const d = await (await this.request('https://graph.microsoft.com/v1.0/me/drive/items/' + encodeURIComponent(file.id) + '?$select=id,@microsoft.graph.downloadUrl')).json(); const url = d['@microsoft.graph.downloadUrl']; if (typeof url !== 'string')
        throw new CloudError('The OneDrive file could not be found.'); return this.blob(await this.request(url, {}, false), limit, progress); }
    async writeFile(name, file, existing, progress) {
        const path = 'https://graph.microsoft.com/v1.0/me/drive/items/' + encodeURIComponent(this.root) + ':/' + encodeURIComponent(name) + ':';
        if (file.size <= 4 * 1024 * 1024) {
            const headers = { 'Content-Type': file.type || 'application/octet-stream' };
            if (existing?.version)
                headers['If-Match'] = existing.version;
            const r = await this.request(path + '/content', { method: 'PUT', headers, body: file });
            const d = await r.json();
            progress?.(100);
            return { id: d.id, name: d.name, version: d.eTag };
        }
        const headers = { 'Content-Type': 'application/json' };
        if (existing?.version)
            headers['If-Match'] = existing.version;
        const session = await (await this.request(path + '/createUploadSession', { method: 'POST', headers, body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': existing ? 'replace' : 'fail', name } }) })).json();
        if (typeof session.uploadUrl !== 'string')
            throw new CloudError('OneDrive could not start the upload.');
        let offset = 0;
        const chunk = 10 * 320 * 1024;
        while (offset < file.size) {
            const end = Math.min(file.size, offset + chunk), r = await this.request(session.uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${offset}-${end - 1}/${file.size}` }, body: file.slice(offset, end) }, false), d = await r.json();
            if (r.status === 200 || r.status === 201) {
                progress?.(100);
                return { id: d.id, name: d.name, version: d.eTag };
            }
            const next = Number(d.nextExpectedRanges?.[0]?.split('-')[0]);
            if (r.status !== 202 || !Number.isSafeInteger(next) || next <= offset || next > file.size)
                throw new CloudError('OneDrive returned an invalid upload position.');
            offset = next;
            progress?.(offset / file.size * 100);
        }
        throw new CloudError('OneDrive did not confirm the completed upload.');
    }
}
