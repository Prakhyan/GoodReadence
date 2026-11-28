export type ProviderId = 'google' | 'dropbox' | 'onedrive';
export type Progress = (pct: number) => void;
export interface UserProfile {
    id: string;
    displayName: string;
    provider: ProviderId;
}
export interface BookMetadata {
    id: string;
    name: string;
    n: number;
    format?: string;
    grClock?: Record<string, number>;
    grModifiedAt?: number;
    [key: string]: unknown;
}
export interface SyncedBook {
    id: string;
    hash: string;
    size: number;
    mime: string;
    filename: string;
    lastModified: number;
    metadata: BookMetadata;
}
export interface LibraryState {
    kind: 'goodreadence-library';
    schema: 2;
    deviceId: string;
    updatedAt: number;
    books: Record<string, SyncedBook>;
}
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
export declare class CloudError extends Error {
    code: 'auth' | 'offline' | 'quota' | 'network' | 'invalid' | 'conflict';
    constructor(message: string, code?: 'auth' | 'offline' | 'quota' | 'network' | 'invalid' | 'conflict');
}
export declare const MAX_BOOK: number;
export declare const MAX_STATE: number;
export declare function filename(id: string): string;
export declare function validateState(value: unknown): LibraryState;
