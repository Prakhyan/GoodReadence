import { BaseProvider, type RemoteFile } from './BaseProvider.js';
import { type Progress } from '../types/CloudStorageProvider.js';
export declare class GoogleDriveProvider extends BaseProvider {
    readonly id: "google";
    private folders;
    constructor(clientId: string);
    private folderList;
    protected initialize(): Promise<void>;
    protected listFiles(): Promise<RemoteFile[]>;
    protected readFile(file: RemoteFile, progress?: Progress, limit?: number): Promise<Blob>;
    protected writeFile(name: string, file: Blob, existing?: RemoteFile, progress?: Progress): Promise<any>;
}
