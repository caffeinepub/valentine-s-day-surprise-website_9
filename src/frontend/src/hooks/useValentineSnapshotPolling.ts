// Polling hook for detecting remote snapshot updates without overwriting local edits

import { useEffect, useRef, useState } from 'react';
import { useActor } from './useActor';
import { getSnapshotVersion, getGlobalLatestVersion } from '../lib/valentineRemoteProgress';

interface PollingOptions {
  saveId?: string;
  isGlobalLatest: boolean;
  currentVersion?: bigint;
  hasUnsavedChanges: boolean;
  enabled: boolean;
  intervalMs?: number;
}

interface PollingResult {
  hasNewerVersion: boolean;
  newerVersion?: bigint;
  clearNotification: () => void;
}

export function useValentineSnapshotPolling({
  saveId,
  isGlobalLatest,
  currentVersion,
  hasUnsavedChanges,
  enabled,
  intervalMs = 10000, // Poll every 10 seconds
}: PollingOptions): PollingResult {
  const { actor } = useActor();
  const [hasNewerVersion, setHasNewerVersion] = useState(false);
  const [newerVersion, setNewerVersion] = useState<bigint | undefined>(undefined);
  const lastCheckedVersionRef = useRef<bigint | undefined>(currentVersion);

  useEffect(() => {
    if (!enabled || !actor || currentVersion === undefined) {
      return;
    }

    // Update last checked version when current version changes
    lastCheckedVersionRef.current = currentVersion;

    const checkForUpdates = async () => {
      try {
        let versionInfo;
        
        if (isGlobalLatest) {
          versionInfo = await getGlobalLatestVersion(actor);
        } else if (saveId) {
          versionInfo = await getSnapshotVersion(actor, saveId);
        }

        if (!versionInfo) {
          return;
        }

        // Check if remote version is newer than our current version
        if (versionInfo.version > (lastCheckedVersionRef.current || BigInt(0))) {
          // Only notify if user has no unsaved changes
          if (!hasUnsavedChanges) {
            setHasNewerVersion(true);
            setNewerVersion(versionInfo.version);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial check
    checkForUpdates();

    // Set up polling interval
    const intervalId = setInterval(checkForUpdates, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [actor, saveId, isGlobalLatest, currentVersion, hasUnsavedChanges, enabled, intervalMs]);

  const clearNotification = () => {
    setHasNewerVersion(false);
    setNewerVersion(undefined);
  };

  return {
    hasNewerVersion,
    newerVersion,
    clearNotification,
  };
}
