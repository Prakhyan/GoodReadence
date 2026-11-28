import { type LibraryState, type BookMetadata } from '../types/CloudStorageProvider.js';
export declare function stable(value: unknown): string;
export declare function metadata(book: BookMetadata): BookMetadata;
export declare function compareClock(a?: Record<string, number>, b?: Record<string, number>): 1 | 0 | -1 | null;
export declare function sha(text: string): Promise<string>;
export declare function mergeStates(states: LibraryState[], deviceId: string): Promise<LibraryState>;
