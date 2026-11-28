import { LocalStore } from './sync/LocalStore.js';
import { SyncManager } from './sync/SyncManager.js';
type Host = ConstructorParameters<typeof LocalStore>[0];
interface Configuration {
    googleClientId: string;
    dropboxClientId: string;
    oneDriveClientId: string;
    dropboxAppFolderConfirmed?: boolean;
}
declare global {
    interface Window {
        GRCloudHost: Host;
        GRCloud: Record<string, unknown>;
    }
}
export declare function initialize(config: Configuration): Promise<SyncManager>;
export {};
