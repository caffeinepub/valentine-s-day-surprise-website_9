import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

// Remote snapshot types for Valentine's Day app
export interface ValentineSnapshot {
  landingMessage: string;
  videoSlots: Array<{
    heading: string;
    videoUrl: string | null;
  }>;
  finalMessage: string;
  savedAt: bigint;
}

export interface CreateSnapshotResult {
  __kind__: "Ok";
  saveId: string;
  writeToken: string;
}

export interface CreateSnapshotError {
  __kind__: "Err";
  message: string;
}

export type CreateSnapshotResponse = CreateSnapshotResult | CreateSnapshotError;

export interface UpdateSnapshotSuccess {
  __kind__: "Ok";
  savedAt: bigint;
}

export interface UpdateSnapshotError {
  __kind__: "Err";
  message: string;
}

export type UpdateSnapshotResponse = UpdateSnapshotSuccess | UpdateSnapshotError;

export interface FetchSnapshotSuccess {
  __kind__: "Ok";
  snapshot: ValentineSnapshot;
}

export interface FetchSnapshotError {
  __kind__: "Err";
  message: string;
}

export type FetchSnapshotResponse = FetchSnapshotSuccess | FetchSnapshotError;

export interface backendInterface {
  createValentineSnapshot: (snapshot: ValentineSnapshot) => Promise<CreateSnapshotResponse>;
  updateValentineSnapshot: (saveId: string, writeToken: string, snapshot: ValentineSnapshot) => Promise<UpdateSnapshotResponse>;
  fetchValentineSnapshot: (saveId: string) => Promise<FetchSnapshotResponse>;
}
