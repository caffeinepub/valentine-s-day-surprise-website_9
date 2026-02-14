import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Valentine {
    color: string;
    text: string;
    photoSrc?: ExternalBlob;
}
export type Time = bigint;
export interface ValentineSnapshot {
    writeTokenHash: string;
    saveId: string;
    createdBy: Principal;
    valentine: Valentine;
    version: bigint;
    lastUpdateTimestamp: Time;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearAllValentineSnapshots(): Promise<void>;
    createValentineSnapshot(valentine: Valentine): Promise<[string, string]>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGlobalLatest(): Promise<ValentineSnapshot | null>;
    getGlobalLatestVersion(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getValentineSnapshot(saveId: string): Promise<ValentineSnapshot | null>;
    getValentineSnapshotVersion(saveId: string): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    listValentineSnapshots(limit: bigint): Promise<Array<ValentineSnapshot>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveGlobalLatest(valentine: Valentine): Promise<bigint>;
    updateValentineSnapshot(saveId: string, expectedVersion: bigint, valentine: Valentine, writeToken: string): Promise<bigint>;
}
