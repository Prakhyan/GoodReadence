import { SyncManager } from '../sync/SyncManager.js';
import type { CloudStorageProvider, ProviderId } from '../types/CloudStorageProvider.js';
export declare class CloudSyncSettings {
    private manager;
    private providers;
    private enabled;
    private panel;
    private badge;
    private preparingGoogle;
    constructor(manager: SyncManager, providers: Record<ProviderId, () => CloudStorageProvider>, enabled: Record<ProviderId, boolean>);
    private run;
    paint(): void;
}
