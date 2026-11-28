export type ProviderId = 'google' | 'dropbox' | 'onedrive';
export type Progress = (pct: number) => void;
export interface UserProfile { id: string; displayName: string; provider: ProviderId }
export interface BookMetadata { id: string; name: string; n: number; format?: string; grClock?: Record<string, number>; grModifiedAt?: number; [key: string]: unknown }
export interface SyncedBook { id: string; hash: string; size: number; mime: string; filename: string; lastModified: number; metadata: BookMetadata }
export interface LibraryState { kind: 'goodreadence-library'; schema: 2; deviceId: string; updatedAt: number; books: Record<string, SyncedBook> }
export interface CloudStorageProvider {
 readonly id: ProviderId;
 connect(): Promise<UserProfile>;
 disconnect(): Promise<void>;
 readLibraryState(): Promise<LibraryState | null>;
 writeLibraryState(state: LibraryState): Promise<void>;
 uploadBookFile(bookId: string, file: Blob, onProgress?: Progress): Promise<void>;
 downloadBookFile(bookId: string, onProgress?: Progress): Promise<Blob>;
 /** Device journals make library-state.json a recoverable index, not a last-writer-wins bottleneck. */
 readDeviceStates(): Promise<LibraryState[]>;
 writeDeviceState(state: LibraryState): Promise<void>;
}
export class CloudError extends Error { constructor(message: string, public code: 'auth'|'offline'|'quota'|'network'|'invalid'|'conflict' = 'network') { super(message); this.name='CloudError'; } }
export const MAX_BOOK = 100 * 1024 * 1024;
export const MAX_STATE = 16 * 1024 * 1024;
export function filename(id: string): string { if(!/^[a-f0-9]{64}$/.test(id)) throw new CloudError('Invalid book identity.','invalid');return 'book-'+id+'.bin'; }
export function validateState(value: unknown): LibraryState {
 if(!value||typeof value!=='object')throw new CloudError('Cloud reading data is invalid.','invalid');
 const s=value as LibraryState;
 if(s.kind!=='goodreadence-library'||s.schema!==2||!/^[-\w]{1,80}$/.test(s.deviceId)||!Number.isFinite(s.updatedAt)||!s.books||typeof s.books!=='object'||Array.isArray(s.books)||Object.keys(s.books).length>10000)throw new CloudError('Unsupported cloud reading data.','invalid');
 for(const [key,b] of Object.entries(s.books)){if(['__proto__','constructor','prototype'].includes(key)||!b||key!==b.id||typeof key!=='string'||key.length>1000||!/^[a-f0-9]{64}$/.test(b.hash)||!Number.isSafeInteger(b.size)||b.size<1||b.size>MAX_BOOK||typeof b.mime!=='string'||typeof b.filename!=='string'||!Number.isFinite(b.lastModified)||!b.metadata||b.metadata.id!==key||typeof b.metadata.name!=='string'||b.metadata.name.length>2000||!Number.isSafeInteger(b.metadata.n)||b.metadata.n<1)throw new CloudError('Invalid cloud book record.','invalid');const clock=b.metadata.grClock;if(!clock||typeof clock!=='object'||Array.isArray(clock)||Object.keys(clock).length>1000||Object.entries(clock).some(([k,v])=>!/^[-\w]{1,80}$/.test(k)||!Number.isSafeInteger(v)||v<0))throw new CloudError('Invalid cloud revision.','invalid');}
 return s;
}
