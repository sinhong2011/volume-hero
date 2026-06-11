/**
 * WebDAV client for Volume Hero cloud sync
 * Supports syncing settings to WebDAV servers (Nextcloud, ownCloud, Box, etc.)
 */

import { simpleDecrypt, simpleEncrypt } from "./crypto";
import {
  type ExportData,
  exportAllSettings,
  getGlobalSettings,
  importSettings,
  saveGlobalSettings,
  type WebDAVConfig,
} from "./storage";

const SYNC_FILE_NAME = "volumehero-sync.json";

interface SyncResult {
  success: boolean;
  message: string;
  timestamp?: number;
  conflict?: { local: ExportData; remote: ExportData };
}

function buildSyncFileUrl(config: WebDAVConfig): string {
  let baseUrl = config.serverUrl.trim();
  if (!baseUrl.endsWith("/")) baseUrl += "/";
  return `${baseUrl}${SYNC_FILE_NAME}`;
}

function buildAuthHeader(config: WebDAVConfig): string {
  const password = simpleDecrypt(config.password);
  return `Basic ${btoa(`${config.username}:${password}`)}`;
}

export async function testWebDAVConnection(config: WebDAVConfig): Promise<SyncResult> {
  // Validate required fields
  if (!config.serverUrl.trim()) {
    return { success: false, message: "Server URL is required" };
  }
  if (!config.username.trim()) {
    return { success: false, message: "Username is required" };
  }
  if (!config.password) {
    return { success: false, message: "Password is required" };
  }

  try {
    const response = await fetch(config.serverUrl, {
      method: "PROPFIND",
      headers: { Authorization: buildAuthHeader(config), Depth: "0" },
    });
    if (response.ok || response.status === 207)
      return { success: true, message: "Connection successful" };
    if (response.status === 401) return { success: false, message: "Invalid username or password" };
    return { success: false, message: `Server error: ${response.status}` };
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function uploadToWebDAV(config: WebDAVConfig): Promise<SyncResult> {
  try {
    const data = await exportAllSettings();
    const response = await fetch(buildSyncFileUrl(config), {
      method: "PUT",
      headers: {
        Authorization: buildAuthHeader(config),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data, null, 2),
    });
    if (response.ok || response.status === 201 || response.status === 204) {
      return {
        success: true,
        message: "Settings uploaded successfully",
        timestamp: Date.now(),
      };
    }
    return { success: false, message: `Upload failed: ${response.status}` };
  } catch (error) {
    return {
      success: false,
      message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function downloadFromWebDAV(
  config: WebDAVConfig
): Promise<{ success: boolean; data?: ExportData; message: string }> {
  try {
    const response = await fetch(buildSyncFileUrl(config), {
      method: "GET",
      headers: { Authorization: buildAuthHeader(config) },
    });
    if (response.status === 404) return { success: false, message: "No remote settings found" };
    if (!response.ok) return { success: false, message: `Download failed: ${response.status}` };
    const data = (await response.json()) as ExportData;
    return { success: true, data, message: "Settings downloaded" };
  } catch (error) {
    return {
      success: false,
      message: `Download failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function syncWithWebDAV(
  config: WebDAVConfig,
  conflictResolution: "local" | "remote" | "newest" = "newest"
): Promise<SyncResult> {
  try {
    const remoteResult = await downloadFromWebDAV(config);
    const localData = await exportAllSettings();
    if (!remoteResult.success || !remoteResult.data) {
      return await uploadToWebDAV(config);
    }
    const remoteData = remoteResult.data;
    const useLocal =
      conflictResolution === "local" ||
      (conflictResolution === "newest" && localData.exportDate >= remoteData.exportDate);
    if (useLocal) return await uploadToWebDAV(config);
    await importSettings(remoteData, true);
    return {
      success: true,
      message: "Remote settings imported",
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      message: `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function updateWebDAVSyncStatus(
  status: "success" | "error" | "syncing",
  errorMessage?: string
): Promise<void> {
  const settings = await getGlobalSettings();
  await saveGlobalSettings({
    cloudSync: {
      ...settings.cloudSync,
      webdav: {
        ...settings.cloudSync.webdav,
        lastSyncTime: status === "success" ? Date.now() : settings.cloudSync.webdav.lastSyncTime,
        lastSyncStatus: status,
        lastSyncError: errorMessage,
      },
    },
  });
}

export async function performWebDAVSync(
  conflictResolution: "local" | "remote" | "newest" = "newest"
): Promise<SyncResult> {
  const settings = await getGlobalSettings();
  if (!settings.cloudSync.webdav.enabled) {
    return { success: false, message: "WebDAV sync is not enabled" };
  }
  await updateWebDAVSyncStatus("syncing");
  const result = await syncWithWebDAV(settings.cloudSync.webdav, conflictResolution);
  if (result.success) {
    await updateWebDAVSyncStatus("success");
  } else {
    await updateWebDAVSyncStatus("error", result.message);
  }
  return result;
}

export function encryptPassword(password: string): string {
  return simpleEncrypt(password);
}

export function getPasswordLength(encryptedPassword: string): number {
  return simpleDecrypt(encryptedPassword).length;
}
