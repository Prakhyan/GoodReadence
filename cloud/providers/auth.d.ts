import { type ProviderId, type UserProfile } from '../types/CloudStorageProvider.js';
declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (options: Record<string, unknown>) => {
                        requestAccessToken: (options: Record<string, unknown>) => void;
                    };
                    hasGrantedAllScopes: (token: unknown, ...scopes: string[]) => boolean;
                };
            };
        };
    }
}
export declare function prepareGoogle(): Promise<void>;
export declare class BrowserAuth {
    readonly provider: ProviderId;
    readonly clientId: string;
    private token;
    private expires;
    private generation;
    private popup;
    constructor(provider: ProviderId, clientId: string);
    get connected(): boolean;
    connect(): Promise<UserProfile>;
    private pkce;
    bearer(): string;
    disconnect(): void;
}
