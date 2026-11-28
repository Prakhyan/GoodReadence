import { BaseProvider, type RemoteFile } from './BaseProvider.js';
import { type Progress } from '../types/CloudStorageProvider.js';
export declare class DropboxProvider extends BaseProvider {
    readonly id: "dropbox";
    constructor(clientId: string);
    protected initialize(): Promise<void>;
    private rpc;
    protected listFiles(): Promise<RemoteFile[]>;
    protected readFile(file: RemoteFile, progress?: Progress, limit?: number): Promise<Blob>;
    private content;
    protected writeFile(name: string, file: Blob, existing?: RemoteFile, progress?: Progress): Promise<{
        id: any;
        name: any;
        version: any;
    }>;
}
