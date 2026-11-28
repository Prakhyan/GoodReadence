import { BrowserAuth } from './auth.js';
import { type CloudStorageProvider, type LibraryState, type Progress, type ProviderId } from '../types/CloudStorageProvider.js';
export interface RemoteFile {
    id: string;
    name: string;
    version?: string;
    download?: string;
}
export declare abstract class BaseProvider implements CloudStorageProvider {
    protected auth: BrowserAuth;
    abstract readonly id: ProviderId;
    protected files: Map<string, RemoteFile>;
    protected controller: AbortController;
    protected accountIdentity: string;
    private states;
    constructor(auth: BrowserAuth);
    connect(): Promise<{
        id: string;
        displayName: string;
        provider: ProviderId;
    }>;
    disconnect(): Promise<void>;
    protected abstract initialize(): Promise<void>;
    protected abstract listFiles(): Promise<RemoteFile[]>;
    protected abstract readFile(file: RemoteFile, progress?: Progress, limit?: number): Promise<Blob>;
    protected abstract writeFile(name: string, file: Blob, existing?: RemoteFile, progress?: Progress): Promise<RemoteFile>;
    protected request(url: string, init?: RequestInit, authorized?: boolean, allowed?: number[]): Promise<Response>;
    private pause;
    protected blob(response: Response, limit?: number, progress?: Progress): Promise<Blob>;
    protected refresh(): Promise<RemoteFile[]>;
    private readState;
    readLibraryState(): Promise<LibraryState | null>;
    readDeviceStates(): Promise<LibraryState[]>;
    private putState;
    writeLibraryState(state: LibraryState): Promise<void>;
    writeDeviceState(state: LibraryState): Promise<void>;
    uploadBookFile(id: string, file: Blob, progress?: Progress): Promise<void>;
    downloadBookFile(id: string, progress?: Progress): Promise<Blob>;
}
