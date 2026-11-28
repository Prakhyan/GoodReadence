import { type CloudStorageProvider, type ProviderId, type UserProfile, type BookMetadata, type Progress } from '../types/CloudStorageProvider.js';
import { LocalStore } from './LocalStore.js';
export interface SyncStatus {
    phase: 'disconnected' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'queued' | 'reconnect' | 'error';
    provider?: ProviderId;
    message: string;
    lastSynced?: number;
    progress?: number;
    auto: boolean;
}
export declare class SyncManager extends EventTarget {
    readonly local: LocalStore;
    provider: CloudStorageProvider | null;
    profile: UserProfile | null;
    status: SyncStatus;
    private generation;
    private connecting;
    private running;
    private timer;
    private hidden;
    private change;
    private downloads;
    constructor(local: LocalStore);
    private publish;
    initialize(): Promise<void>;
    connect(provider: CloudStorageProvider): Promise<void>;
    private persist;
    disconnect(): Promise<void>;
    setAuto(auto: boolean): void;
    queue(): void;
    sync(): Promise<void>;
    hideLocalBook(id: string): Promise<void>;
    restoreListings(): Promise<void>;
    ensureBook(book: BookMetadata, progress?: Progress): Promise<Blob>;
}
