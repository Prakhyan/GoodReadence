import { type LibraryState, type BookMetadata } from '../types/CloudStorageProvider.js';
export interface CloudReference {
    account: string;
    hash: string;
    size: number;
    mime: string;
    filename: string;
    downloaded?: boolean;
}
interface Host {
    deviceId: string;
    digest: (blob: Blob) => Promise<string>;
    validate: (state: unknown) => unknown;
    refresh: () => Promise<void>;
    activeId: () => string | null;
}
export declare class LocalStore {
    readonly host: Host;
    private hashes;
    constructor(host: Host);
    clearHash(id?: string): void;
    private db;
    setting<T>(key: string): Promise<T | undefined>;
    save(key: string, value: unknown): Promise<void>;
    read(): Promise<{
        books: BookMetadata[];
        files: Map<string, Blob>;
    }>;
    snapshot(account: string, hidden: Set<string>): Promise<{
        state: LibraryState;
        files: Map<string, Blob>;
        oversized: number;
    }>;
    validate(state: LibraryState): void;
    apply(remote: LibraryState, account: string, hidden: Set<string>, current: () => boolean): Promise<LibraryState>;
    storeFile(book: BookMetadata, file: Blob, expected: string, current: () => boolean): Promise<void>;
}
export {};
