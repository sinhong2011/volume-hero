/**
 * S3-compatible storage client for Volume Hero cloud sync
 * Supports AWS S3, MinIO, Backblaze B2, Wasabi, and other S3-compatible services
 * Uses s3-lite-client for lightweight, browser-optimized S3 operations
 */

import { S3Client } from "@bradenmacdonald/s3-lite-client";
import { simpleDecrypt, simpleEncrypt } from "./crypto";
import {
  type ExportData,
  exportAllSettings,
  getGlobalSettings,
  importSettings,
  type S3Config,
  saveGlobalSettings,
} from "./storage";

const SYNC_FILE_NAME = "volumehero-sync.json";

interface SyncResult {
  success: boolean;
  message: string;
  timestamp?: number;
  conflict?: { local: ExportData; remote: ExportData };
}

/**
 * Create S3 client instance with decrypted credentials
 */
function createS3Client(config: S3Config): S3Client {
  const accessKeyId = simpleDecrypt(config.accessKeyId);
  const secretAccessKey = simpleDecrypt(config.secretAccessKey);

  // Build endpoint URL
  let endPoint = config.endpoint?.trim();
  if (!endPoint) {
    // Use standard AWS S3 endpoint
    endPoint = `https://s3.${config.region}.amazonaws.com`;
  }
  // Remove trailing slash
  if (endPoint.endsWith("/")) {
    endPoint = endPoint.slice(0, -1);
  }

  return new S3Client({
    endPoint,
    region: config.region,
    bucket: config.bucketName,
    accessKey: accessKeyId,
    secretKey: secretAccessKey,
  });
}

/**
 * Test S3 connection
 */
export async function testS3Connection(config: S3Config): Promise<SyncResult> {
  // Validate required fields
  if (!config.bucketName.trim()) {
    return { success: false, message: "Bucket name is required" };
  }
  if (!config.region.trim()) {
    return { success: false, message: "Region is required" };
  }
  if (!config.accessKeyId) {
    return { success: false, message: "Access Key ID is required" };
  }
  if (!config.secretAccessKey) {
    return { success: false, message: "Secret Access Key is required" };
  }

  try {
    const client = createS3Client(config);

    // Try to check if the file exists (HEAD request)
    // 404 is OK - it means we can access the bucket but file doesn't exist yet
    try {
      await client.statObject(SYNC_FILE_NAME);
      return { success: true, message: "Connection successful (file exists)" };
    } catch (error) {
      // If it's a 404, that's fine - bucket is accessible
      if (error instanceof Error && error.message.includes("404")) {
        return { success: true, message: "Connection successful" };
      }
      // Check for access denied
      if (error instanceof Error && error.message.includes("403")) {
        return { success: false, message: "Access denied - check credentials" };
      }
      throw error;
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Upload settings to S3
 */
export async function uploadToS3(config: S3Config): Promise<SyncResult> {
  try {
    const client = createS3Client(config);
    const data = await exportAllSettings();
    const jsonData = JSON.stringify(data, null, 2);

    await client.putObject(SYNC_FILE_NAME, jsonData, {
      metadata: { "Content-Type": "application/json" },
    });

    return {
      success: true,
      message: "Settings uploaded successfully",
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Download settings from S3
 */
export async function downloadFromS3(
  config: S3Config
): Promise<{ success: boolean; data?: ExportData; message: string }> {
  try {
    const client = createS3Client(config);

    const response = await client.getObject(SYNC_FILE_NAME);
    const data = (await response.json()) as ExportData;
    return { success: true, data, message: "Settings downloaded" };
  } catch (error) {
    // Check for 404 - file doesn't exist
    if (error instanceof Error && error.message.includes("404")) {
      return { success: false, message: "No remote settings found" };
    }
    return {
      success: false,
      message: `Download failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Generate presigned URL for uploading settings to S3
 * @param config S3 configuration
 * @param expiresIn Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL for PUT operation
 */
export async function generateUploadPresignedUrl(
  config: S3Config,
  expiresIn = 3600
): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    const client = createS3Client(config);
    const url = await client.getPresignedUrl("PUT", SYNC_FILE_NAME, {
      expirySeconds: expiresIn,
    });
    return {
      success: true,
      url,
      message: "Presigned upload URL generated",
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate presigned URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Generate presigned URL for downloading settings from S3
 * @param config S3 configuration
 * @param expiresIn Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL for GET operation
 */
export async function generateDownloadPresignedUrl(
  config: S3Config,
  expiresIn = 3600
): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    const client = createS3Client(config);
    const url = await client.getPresignedUrl("GET", SYNC_FILE_NAME, {
      expirySeconds: expiresIn,
    });
    return {
      success: true,
      url,
      message: "Presigned download URL generated",
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to generate presigned URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Upload settings using a presigned URL
 * @param presignedUrl The presigned URL for upload
 * @returns Upload result
 */
export async function uploadWithPresignedUrl(presignedUrl: string): Promise<SyncResult> {
  try {
    const data = await exportAllSettings();
    const jsonData = JSON.stringify(data, null, 2);

    const response = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: jsonData,
    });

    if (response.ok) {
      return {
        success: true,
        message: "Settings uploaded successfully",
        timestamp: Date.now(),
      };
    }
    return {
      success: false,
      message: `Upload failed: ${response.status} ${response.statusText}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Download settings using a presigned URL
 * @param presignedUrl The presigned URL for download
 * @returns Download result with data
 */
export async function downloadWithPresignedUrl(
  presignedUrl: string
): Promise<{ success: boolean; data?: ExportData; message: string }> {
  try {
    const response = await fetch(presignedUrl, {
      method: "GET",
    });

    if (response.status === 404) {
      return { success: false, message: "No remote settings found" };
    }
    if (!response.ok) {
      return {
        success: false,
        message: `Download failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as ExportData;
    return { success: true, data, message: "Settings downloaded" };
  } catch (error) {
    return {
      success: false,
      message: `Download failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Sync settings with S3
 */
export async function syncWithS3(
  config: S3Config,
  conflictResolution: "local" | "remote" | "newest" = "newest"
): Promise<SyncResult> {
  try {
    const remoteResult = await downloadFromS3(config);
    const localData = await exportAllSettings();

    if (!remoteResult.success || !remoteResult.data) {
      // No remote data, upload local
      return await uploadToS3(config);
    }

    const remoteData = remoteResult.data;
    const useLocal =
      conflictResolution === "local" ||
      (conflictResolution === "newest" && localData.exportDate >= remoteData.exportDate);

    if (useLocal) {
      return await uploadToS3(config);
    }

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

/**
 * Update sync status in settings
 */
export async function updateS3SyncStatus(
  status: "success" | "error" | "syncing",
  errorMessage?: string
): Promise<void> {
  const settings = await getGlobalSettings();
  await saveGlobalSettings({
    cloudSync: {
      ...settings.cloudSync,
      s3: {
        ...settings.cloudSync.s3,
        lastSyncTime: status === "success" ? Date.now() : settings.cloudSync.s3.lastSyncTime,
        lastSyncStatus: status,
        lastSyncError: errorMessage,
      },
    },
  });
}

/**
 * Perform S3 sync
 */
export async function performS3Sync(
  conflictResolution: "local" | "remote" | "newest" = "newest"
): Promise<SyncResult> {
  const settings = await getGlobalSettings();
  if (!settings.cloudSync.s3.enabled) {
    return { success: false, message: "S3 sync is not enabled" };
  }

  await updateS3SyncStatus("syncing");
  const result = await syncWithS3(settings.cloudSync.s3, conflictResolution);

  if (result.success) {
    await updateS3SyncStatus("success");
  } else {
    await updateS3SyncStatus("error", result.message);
  }

  return result;
}

/**
 * Encrypt access key
 */
export function encryptAccessKey(key: string): string {
  return simpleEncrypt(key);
}

/**
 * Get length of encrypted access key
 */
export function getAccessKeyLength(encryptedKey: string): number {
  return simpleDecrypt(encryptedKey).length;
}
