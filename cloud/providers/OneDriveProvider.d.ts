import { BaseProvider, type RemoteFile } from './BaseProvider.js';
import { type Progress } from '../types/CloudStorageProvider.js';
export declare class OneDriveProvider extends BaseProvider {
    readonly id: "onedrive";
    private root;
    constructor(clientId: string);
    protected initialize(): Promise<void>;
    protected listFiles(): Promise<RemoteFile[]>;
    protected readFile(file: RemoteFile, progress?: Progress, limit?: number): Promise<Blob>;
    protected writeFile(name: string, file: Blob, existing?: RemoteFile, progress?: Progress): Promise<{
        id: any;
        name: any;
        version: any;
    }>;
}
