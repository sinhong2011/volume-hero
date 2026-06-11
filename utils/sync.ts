/**
 * Unified sync interface for Volume Hero
 * Provides a common interface for WebDAV and S3 sync providers
 */

import { performS3Sync, testS3Connection, updateS3SyncStatus } from "./s3";
import { getGlobalSettings } from "./storage";
import { performWebDAVSync, testWebDAVConnection, updateWebDAVSyncStatus } from "./webdav";

export interface SyncResult {
  success: boolean;
  message: string;
  timestamp?: number;
  conflict?: { local: import("./storage").ExportData; remote: import("./storage").ExportData };
}

/**
 * Test connection for the currently selected sync provider
 */
export async function testConnection(): Promise<SyncResult> {
  const settings = await getGlobalSettings();
  const provider = settings.cloudSync.provider;

  if (provider === "webdav") {
    return await testWebDAVConnection(settings.cloudSync.webdav);
  }
  if (provider === "s3") {
    return await testS3Connection(settings.cloudSync.s3);
  }

  return { success: false, message: "Unknown sync provider" };
}

/**
 * Perform sync with the currently selected provider
 */
export async function performSync(
  conflictResolution: "local" | "remote" | "newest" = "newest"
): Promise<SyncResult> {
  const settings = await getGlobalSettings();
  const provider = settings.cloudSync.provider;

  if (provider === "webdav") {
    return await performWebDAVSync(conflictResolution);
  }
  if (provider === "s3") {
    return await performS3Sync(conflictResolution);
  }

  return { success: false, message: "Unknown sync provider" };
}

/**
 * Update sync status for the currently selected provider
 */
export async function updateSyncStatus(
  status: "success" | "error" | "syncing",
  errorMessage?: string
): Promise<void> {
  const settings = await getGlobalSettings();
  const provider = settings.cloudSync.provider;

  if (provider === "webdav") {
    await updateWebDAVSyncStatus(status, errorMessage);
  } else if (provider === "s3") {
    await updateS3SyncStatus(status, errorMessage);
  }
}

/**
 * Get the current sync provider configuration
 */
export async function getCurrentSyncConfig() {
  const settings = await getGlobalSettings();
  const provider = settings.cloudSync.provider;

  if (provider === "webdav") {
    return {
      provider,
      config: settings.cloudSync.webdav,
    };
  }
  if (provider === "s3") {
    return {
      provider,
      config: settings.cloudSync.s3,
    };
  }

  return null;
}

/**
 * Check if sync is enabled for the current provider
 */
export async function isSyncEnabled(): Promise<boolean> {
  const settings = await getGlobalSettings();
  const provider = settings.cloudSync.provider;

  if (provider === "webdav") {
    return settings.cloudSync.webdav.enabled;
  }
  if (provider === "s3") {
    return settings.cloudSync.s3.enabled;
  }

  return false;
}

/**
 * Check if auto-sync is enabled for the current provider
 */
export async function isAutoSyncEnabled(): Promise<boolean> {
  const settings = await getGlobalSettings();
  const provider = settings.cloudSync.provider;

  if (provider === "webdav") {
    return settings.cloudSync.webdav.enabled && settings.cloudSync.webdav.autoSync;
  }
  if (provider === "s3") {
    return settings.cloudSync.s3.enabled && settings.cloudSync.s3.autoSync;
  }

  return false;
}

/**
 * Get sync interval in minutes for the current provider
 */
export async function getSyncInterval(): Promise<number> {
  const settings = await getGlobalSettings();
  const provider = settings.cloudSync.provider;

  if (provider === "webdav") {
    return settings.cloudSync.webdav.syncIntervalMinutes;
  }
  if (provider === "s3") {
    return settings.cloudSync.s3.syncIntervalMinutes;
  }

  return 30; // default
}

/**
 * Auto-sync interval timer
 */
let autoSyncInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start auto-sync for the current provider
 */
export async function startAutoSync(): Promise<void> {
  stopAutoSync();

  const enabled = await isAutoSyncEnabled();
  if (!enabled) return;

  const intervalMinutes = await getSyncInterval();
  const intervalMs = intervalMinutes * 60 * 1000;

  autoSyncInterval = setInterval(() => {
    performSync("newest").catch(console.error);
  }, intervalMs);
}

/**
 * Stop auto-sync
 */
export function stopAutoSync(): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}
