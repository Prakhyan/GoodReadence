import { validateState } from '../types/CloudStorageProvider.js';
export function stable(value) { if (Array.isArray(value))
    return '[' + value.map(stable).join(',') + ']'; if (value && typeof value === 'object')
    return '{' + Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}'; return JSON.stringify(value); }
export function metadata(book) { const b = structuredClone(book); for (const k of ['grCloud', 'demo', 'ts', 'lastReadAt', 'type'])
    delete b[k]; return b; }
export function compareClock(a = {}, b = {}) { let greater = false, less = false; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    greater ||= (a[k] || 0) > (b[k] || 0);
    less ||= (a[k] || 0) < (b[k] || 0);
} return greater && less ? null : greater ? 1 : less ? -1 : 0; }
export async function sha(text) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(n => n.toString(16).padStart(2, '0')).join(''); }
function content(b) { const m = metadata(b.metadata); delete m.grClock; delete m.grModifiedAt; return stable({ hash: b.hash, metadata: m }); }
export async function mergeStates(states, deviceId) {
    const result = { kind: 'goodreadence-library', schema: 2, deviceId, updatedAt: Date.now(), books: Object.create(null) };
    const incoming = states.flatMap(s => Object.values(validateState(s).books)).sort((a, b) => stable(a).localeCompare(stable(b)));
    for (const source of incoming) {
        const b = structuredClone(source), existing = result.books[b.id];
        if (!existing) {
            result.books[b.id] = b;
            continue;
        }
        const relation = compareClock(b.metadata.grClock, existing.metadata.grClock);
        if (b.hash === existing.hash && content(b) === content(existing)) {
            existing.metadata.grClock = Object.fromEntries([...new Set([...Object.keys(b.metadata.grClock || {}), ...Object.keys(existing.metadata.grClock || {})])].map(k => [k, Math.max(b.metadata.grClock?.[k] || 0, existing.metadata.grClock?.[k] || 0)]));
            existing.lastModified = Math.max(b.lastModified, existing.lastModified);
            existing.metadata.grModifiedAt = existing.lastModified;
            continue;
        }
        if (relation === -1)
            continue;
        if (relation === 1 && b.hash === existing.hash) {
            result.books[b.id] = b;
            continue;
        }
        // Clock skew cannot decide causality. Timestamps only select the primary copy;
        // the other concurrent revision remains a complete, readable book record.
        const newer = b.lastModified > existing.lastModified || b.lastModified === existing.lastModified && stable(b) > stable(existing) ? b : existing, older = newer === b ? existing : b;
        const conflict = structuredClone(older), id = 'cloud-conflict:' + await sha(stable({ id: older.id, hash: older.hash, clock: older.metadata.grClock, content: content(older) }));
        conflict.id = id;
        conflict.metadata.id = id;
        conflict.metadata.grConflictOf = older.metadata.grConflictOf || older.id;
        conflict.metadata.grOriginalName = older.metadata.grOriginalName || older.metadata.name;
        conflict.metadata.name = String(conflict.metadata.grOriginalName) + ' · another device';
        result.books[id] = conflict;
        result.books[newer.id] = newer;
    }
    return validateState(result);
}
