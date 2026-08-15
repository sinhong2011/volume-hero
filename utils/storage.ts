/**
 * Storage utilities for Volume Hero extension
 * Manages per-domain volume settings persistence
 * Includes in-memory caching for fast popup loading
 */

export interface DomainSettings {
  volume: number; // 0.0 to 6.0 (representing 0% to 600%)
  autoApply: boolean; // whether to auto-apply on page load
  lastApplied: number; // Unix timestamp (milliseconds)
  bassBoost?: number; // -12 to 12 dB (default: 0)
  trebleBoost?: number; // -12 to 12 dB (default: 0)
}

// Keyboard shortcut configuration
export interface KeyboardShortcut {
  key: string; // e.g., 'ArrowUp', 'a', 'M'
  modifiers: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
}

export interface KeyboardShortcuts {
  volumeUp: KeyboardShortcut;
  volumeDown: KeyboardShortcut;
  volumeReset: KeyboardShortcut;
  volumeMute: KeyboardShortcut;
}

// Sync provider type
export type SyncProvider = "webdav" | "s3";

// WebDAV configuration
export interface WebDAVConfig {
  enabled: boolean;
  serverUrl: string;
  username: string;
  password: string; // Will be encrypted before storage
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSyncTime: number | null;
  lastSyncStatus: "success" | "error" | "never" | "syncing";
  lastSyncError?: string;
}

// S3-compatible storage configuration
export interface S3Config {
  enabled: boolean;
  accessKeyId: string; // Will be encrypted before storage
  secretAccessKey: string; // Will be encrypted before storage
  bucketName: string;
  region: string;
  endpoint?: string; // Optional custom endpoint for S3-compatible services
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSyncTime: number | null;
  lastSyncStatus: "success" | "error" | "never" | "syncing";
  lastSyncError?: string;
}

// Cloud sync configuration
export interface CloudSyncConfig {
  provider: SyncProvider;
  webdav: WebDAVConfig;
  s3: S3Config;
}

// Usage statistics
export interface UsageStatistics {
  totalSitesBoosted: number;
  totalVolumeAdjustments: number;
  volumeUsageHistogram: Record<number, number>; // volume level -> count
  firstUsedDate: number;
  lastUsedDate: number;
}

// Volume preference mode
export type VolumePreferenceMode = "saved" | "last";

export interface GlobalSettings {
  language: string; // Locale code: 'en', 'zh_CN', 'zh_TW'

  // Volume & Audio Settings
  defaultVolume: number; // 1.0 to 6.0 (default: 1.0 = 100%)
  maxVolumeLimit: number; // 1.0 to 6.0 (default: 6.0 = 600%)
  volumeStepSize: number; // 0.05, 0.10, 0.15, 0.25 (default: 0.10 = 10%)
  defaultBassBoost: number; // -12 to 12 dB (default: 0)
  defaultTrebleBoost: number; // -12 to 12 dB (default: 0)

  // Keyboard Shortcuts
  keyboardShortcuts: KeyboardShortcuts;

  // Domain Management
  blacklistedDomains: string[]; // Domains where extension is disabled
  whitelistedDomains: string[]; // If not empty, only these domains are enabled

  // UI Settings
  compactMode: boolean;
  showOtherTabsSection: boolean;

  // Behavior & Notifications
  showOSD: boolean; // On-screen display for volume changes
  osdDurationMs: number; // How long to show OSD (default: 1500)
  autoApplyAllByDefault: boolean; // Auto-apply on all sites by default
  showBadge: boolean; // Show volume percentage on extension icon
  volumePreferenceMode: VolumePreferenceMode; // 'saved' or 'last'

  // Cloud Sync (WebDAV & S3)
  cloudSync: CloudSyncConfig;

  // Statistics
  statistics: UsageStatistics;
}

const STORAGE_PREFIX = "volumehero:";
const GLOBAL_SETTINGS_KEY = "volumehero:global";

/**
 * Preferences mirrored to `storage.sync` so they follow the user between
 * browsers signed into the same profile.
 *
 * This is an explicit allowlist rather than "everything", for three reasons:
 *
 * - `cloudSync` holds credentials. They are sealed with a key that lives in
 *   this device's IndexedDB, so a copy on another device could not be opened
 *   anyway — and syncing the ciphertext would push secrets through an extra
 *   service for no benefit.
 * - `statistics` is device-local and written often; `storage.sync` enforces
 *   write-rate limits that routine counters would trip.
 * - Per-domain volumes stay in `storage.local` entirely. There can be
 *   thousands of them, which would blow the 100KB sync quota; the WebDAV/S3
 *   backup remains the way to move those between machines.
 */
export const SYNCED_SETTING_KEYS = [
  "language",
  "defaultVolume",
  "maxVolumeLimit",
  "volumeStepSize",
  "defaultBassBoost",
  "defaultTrebleBoost",
  "keyboardShortcuts",
  "blacklistedDomains",
  "whitelistedDomains",
  "compactMode",
  "showOtherTabsSection",
  "showOSD",
  "osdDurationMs",
  "autoApplyAllByDefault",
  "showBadge",
  "volumePreferenceMode",
] as const satisfies readonly (keyof GlobalSettings)[];

type SyncedSettings = Partial<Pick<GlobalSettings, (typeof SYNCED_SETTING_KEYS)[number]>>;

/** Narrow a settings object down to the subset that may be synced. */
export function pickSyncedSettings(settings: GlobalSettings): SyncedSettings {
  const picked: Record<string, unknown> = {};
  for (const key of SYNCED_SETTING_KEYS) {
    picked[key] = settings[key];
  }
  return picked as SyncedSettings;
}

/**
 * Read the synced preference subset, if any.
 *
 * `storage.sync` is unavailable in some contexts (Firefox without a signed-in
 * account, enterprise policy), so a failure here is normal and simply means
 * the local copy wins.
 */
async function readSyncedSettings(): Promise<SyncedSettings | null> {
  try {
    if (!browser.storage.sync) return null;
    const result = await browser.storage.sync.get(GLOBAL_SETTINGS_KEY);
    return (result[GLOBAL_SETTINGS_KEY] as SyncedSettings | undefined) ?? null;
  } catch (error) {
    console.debug("[VolumeHero] storage.sync unavailable for read:", error);
    return null;
  }
}

/**
 * Mirror the synced subset. Best-effort: exceeding the sync quota or running
 * without sync must never block the authoritative local write.
 */
async function writeSyncedSettings(settings: GlobalSettings): Promise<void> {
  try {
    if (!browser.storage.sync) return;
    await browser.storage.sync.set({ [GLOBAL_SETTINGS_KEY]: pickSyncedSettings(settings) });
  } catch (error) {
    console.debug("[VolumeHero] Could not mirror settings to storage.sync:", error);
  }
}

/**
 * Default settings for new domains
 */
export const DEFAULT_SETTINGS: DomainSettings = {
  volume: 1.0,
  autoApply: false,
  lastApplied: 0, // sentinel: 0 means "never saved"; spread sites add Date.now() explicitly
  bassBoost: 0,
  trebleBoost: 0,
};

// ============================================================================
// In-memory cache for fast access (avoids async storage calls on popup open)
// ============================================================================

/** Cache for domain settings - keyed by domain name */
const domainSettingsCache = new Map<string, DomainSettings>();

/** Cache for global settings */
let globalSettingsCache: GlobalSettings | null = null;

/** Flag to track if cache has been warmed from storage */
let cacheWarmed = false;

/**
 * Warm the cache by pre-loading frequently accessed settings
 * Call this early (e.g., when popup opens) to populate cache
 */
export async function warmCache(domain?: string): Promise<void> {
  try {
    // Load global settings into cache. This goes through getGlobalSettings so
    // the warmed value is the fully merged one — defaults filled in and synced
    // preferences applied — rather than the raw local record.
    if (!globalSettingsCache) {
      await getGlobalSettings();
    }

    // Load specific domain settings if provided
    if (domain && !domainSettingsCache.has(domain)) {
      const key = getStorageKey(domain);
      const result = await browser.storage.local.get(key);
      if (result[key]) {
        domainSettingsCache.set(domain, result[key] as DomainSettings);
      }
    }

    cacheWarmed = true;
  } catch (error) {
    console.error("[VolumeHero] Failed to warm cache:", error);
  }
}

/**
 * Get domain settings synchronously from cache (returns default if not cached)
 * Use this for instant UI rendering, then verify with async version
 */
export function getDomainSettingsSync(domain: string): DomainSettings {
  if (!domain) {
    return { ...DEFAULT_SETTINGS, lastApplied: Date.now() };
  }
  return domainSettingsCache.get(domain) ?? { ...DEFAULT_SETTINGS, lastApplied: Date.now() };
}

/**
 * Get global settings synchronously from cache (returns default if not cached)
 */
export function getGlobalSettingsSync(): GlobalSettings {
  return globalSettingsCache ?? { ...DEFAULT_GLOBAL_SETTINGS };
}

/**
 * Check if cache has been warmed
 */
export function isCacheWarmed(): boolean {
  return cacheWarmed;
}

/**
 * Update cache entry for domain settings
 */
function updateDomainCache(domain: string, settings: DomainSettings): void {
  domainSettingsCache.set(domain, settings);
}

/**
 * Update cache for global settings
 */
function updateGlobalCache(settings: GlobalSettings): void {
  globalSettingsCache = settings;
}

/**
 * Drop the cached global settings when another device pushes a change through
 * Chrome Sync, so the next read picks the new values up instead of serving a
 * stale in-memory copy for the lifetime of the page or service worker.
 */
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && GLOBAL_SETTINGS_KEY in changes) {
    globalSettingsCache = null;
  }
});

/**
 * Invalidate cache entry for a domain
 */
export function invalidateDomainCache(domain: string): void {
  domainSettingsCache.delete(domain);
}

/**
 * Extract domain from URL, stripping www. prefix
 * @param url - Full URL string
 * @returns Domain name (hostname without www.)
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch (error) {
    console.error("[VolumeHero] Failed to extract domain from URL:", url, error);
    return "";
  }
}

/**
 * Get storage key for a domain
 * @param domain - Domain name
 * @returns Storage key string
 */
function getStorageKey(domain: string): string {
  return `${STORAGE_PREFIX}${domain}`;
}

/**
 * Get domain settings from storage (with cache)
 * @param domain - Domain name
 * @returns Promise resolving to domain settings or default settings
 */
export async function hasDomainSettings(domain: string): Promise<boolean> {
  if (!domain) return false;
  if (domainSettingsCache.has(domain)) return true;
  const key = getStorageKey(domain);
  const result = await browser.storage.local.get(key);
  return !!result[key];
}

export async function getDomainSettings(domain: string): Promise<DomainSettings> {
  if (!domain) {
    return { ...DEFAULT_SETTINGS, lastApplied: Date.now() };
  }

  // Check cache first for fast access
  const cached = domainSettingsCache.get(domain);
  if (cached) {
    return cached;
  }

  try {
    const key = getStorageKey(domain);
    const result = await browser.storage.local.get(key);

    if (result[key]) {
      const settings = result[key] as DomainSettings;
      // Update cache
      updateDomainCache(domain, settings);
      return settings;
    }

    return { ...DEFAULT_SETTINGS, lastApplied: Date.now() };
  } catch (error) {
    console.error("[VolumeHero] Failed to get domain settings:", error);
    return { ...DEFAULT_SETTINGS, lastApplied: Date.now() };
  }
}

/**
 * Save domain settings to storage (with cache update)
 * @param domain - Domain name
 * @param settings - Settings to save
 * @returns Promise resolving when save is complete
 */
export async function saveDomainSettings(
  domain: string,
  settings: Partial<DomainSettings>
): Promise<void> {
  if (!domain) {
    console.error("[VolumeHero] Cannot save settings: no domain provided");
    return;
  }

  try {
    const key = getStorageKey(domain);
    const currentSettings = await getDomainSettings(domain);

    const newSettings: DomainSettings = {
      ...currentSettings,
      ...settings,
      lastApplied: Date.now(),
    };

    // Update cache immediately for fast subsequent reads
    updateDomainCache(domain, newSettings);

    await browser.storage.local.set({ [key]: newSettings });
  } catch (error) {
    console.error("[VolumeHero] Failed to save domain settings:", error);
    throw error;
  }
}

/**
 * Remove domain settings from storage
 * @param domain - Domain name
 * @returns Promise resolving when removal is complete
 */
export async function removeDomainSettings(domain: string): Promise<void> {
  if (!domain) {
    return;
  }

  try {
    const key = getStorageKey(domain);
    // Invalidate cache
    invalidateDomainCache(domain);
    await browser.storage.local.remove(key);
  } catch (error) {
    console.error("[VolumeHero] Failed to remove domain settings:", error);
    throw error;
  }
}

/**
 * Stored domain entry with domain name and settings
 */
export interface StoredDomainEntry {
  domain: string;
  settings: DomainSettings;
}

/**
 * Get all stored domain settings from storage
 * @returns Promise resolving to array of domain entries
 */
export async function getAllDomainSettings(): Promise<StoredDomainEntry[]> {
  try {
    const allData = await browser.storage.local.get(null);
    const domainEntries: StoredDomainEntry[] = [];

    for (const [key, value] of Object.entries(allData)) {
      // Filter for domain-specific keys (volumehero: prefix but not global settings)
      if (key.startsWith(STORAGE_PREFIX) && key !== GLOBAL_SETTINGS_KEY) {
        const domain = key.slice(STORAGE_PREFIX.length);
        if (domain && value) {
          domainEntries.push({
            domain,
            settings: value as DomainSettings,
          });
        }
      }
    }

    // Sort by lastApplied (most recent first)
    domainEntries.sort((a, b) => b.settings.lastApplied - a.settings.lastApplied);

    return domainEntries;
  } catch (error) {
    console.error("[VolumeHero] Failed to get all domain settings:", error);
    return [];
  }
}

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  volumeUp: { key: "ArrowUp", modifiers: { alt: true, shift: true } },
  volumeDown: { key: "ArrowDown", modifiers: { alt: true, shift: true } },
  volumeReset: { key: "r", modifiers: { alt: true, shift: true } },
  volumeMute: { key: "m", modifiers: { alt: true, shift: true } },
};

/**
 * Default WebDAV configuration
 */
export const DEFAULT_WEBDAV_CONFIG: WebDAVConfig = {
  enabled: false,
  serverUrl: "",
  username: "",
  password: "",
  autoSync: false,
  syncIntervalMinutes: 30,
  lastSyncTime: null,
  lastSyncStatus: "never",
};

/**
 * Default S3 configuration
 */
export const DEFAULT_S3_CONFIG: S3Config = {
  enabled: false,
  accessKeyId: "",
  secretAccessKey: "",
  bucketName: "",
  region: "us-east-1",
  endpoint: "",
  autoSync: false,
  syncIntervalMinutes: 30,
  lastSyncTime: null,
  lastSyncStatus: "never",
};

/**
 * Default cloud sync configuration
 */
export const DEFAULT_CLOUD_SYNC_CONFIG: CloudSyncConfig = {
  provider: "webdav",
  webdav: DEFAULT_WEBDAV_CONFIG,
  s3: DEFAULT_S3_CONFIG,
};

/**
 * Default usage statistics
 */
export const DEFAULT_STATISTICS: UsageStatistics = {
  totalSitesBoosted: 0,
  totalVolumeAdjustments: 0,
  volumeUsageHistogram: {},
  firstUsedDate: Date.now(),
  lastUsedDate: Date.now(),
};

/**
 * Default global settings
 */
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  language: "en",

  // Volume & Audio Settings
  defaultVolume: 1.0,
  maxVolumeLimit: 6.0,
  volumeStepSize: 0.1,
  defaultBassBoost: 0,
  defaultTrebleBoost: 0,

  // Keyboard Shortcuts
  keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,

  // Domain Management
  blacklistedDomains: [],
  whitelistedDomains: [],

  // UI Settings
  compactMode: false,
  showOtherTabsSection: true,

  // Behavior & Notifications
  showOSD: true,
  osdDurationMs: 1500,
  autoApplyAllByDefault: false,
  showBadge: true,
  volumePreferenceMode: "saved",

  // Cloud Sync
  cloudSync: DEFAULT_CLOUD_SYNC_CONFIG,

  // Statistics
  statistics: DEFAULT_STATISTICS,
};

/**
 * Get global extension settings from storage (with cache)
 * @returns Promise resolving to global settings
 */
export async function getGlobalSettings(): Promise<GlobalSettings> {
  // Check cache first
  if (globalSettingsCache) {
    return globalSettingsCache;
  }

  try {
    const [result, synced] = await Promise.all([
      browser.storage.local.get(GLOBAL_SETTINGS_KEY),
      readSyncedSettings(),
    ]);

    if (result[GLOBAL_SETTINGS_KEY] || synced) {
      // Synced preferences win over the local copy so a change made on another
      // machine is reflected here; anything outside the synced allowlist
      // (credentials, statistics) comes from local only.
      const storedSettings = {
        ...(result[GLOBAL_SETTINGS_KEY] as Partial<GlobalSettings> | undefined),
        ...synced,
      } as Partial<GlobalSettings>;
      // Merge with defaults to ensure new properties are included
      // and updated default values are respected
      const settings: GlobalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        ...storedSettings,
        // Ensure nested objects are properly merged
        keyboardShortcuts: {
          ...DEFAULT_GLOBAL_SETTINGS.keyboardShortcuts,
          ...storedSettings.keyboardShortcuts,
        },
        cloudSync: {
          ...DEFAULT_GLOBAL_SETTINGS.cloudSync,
          ...storedSettings.cloudSync,
          webdav: {
            ...DEFAULT_GLOBAL_SETTINGS.cloudSync.webdav,
            ...storedSettings.cloudSync?.webdav,
          },
          s3: {
            ...DEFAULT_GLOBAL_SETTINGS.cloudSync.s3,
            ...storedSettings.cloudSync?.s3,
          },
        },
        statistics: {
          ...DEFAULT_GLOBAL_SETTINGS.statistics,
          ...storedSettings.statistics,
        },
      };
      updateGlobalCache(settings);

      // Backfill the mirror for profiles configured before syncing existed.
      // Without this, an existing user's preferences would not reach their
      // other devices until they happened to change a setting. Fire-and-forget
      // so a read is never delayed by the network-backed sync area.
      if (!synced && result[GLOBAL_SETTINGS_KEY]) {
        void writeSyncedSettings(settings);
      }

      return settings;
    }

    return { ...DEFAULT_GLOBAL_SETTINGS };
  } catch (error) {
    console.error("[VolumeHero] Failed to get global settings:", error);
    return { ...DEFAULT_GLOBAL_SETTINGS };
  }
}

/**
 * Save global extension settings to storage (with cache update)
 * @param settings - Settings to save
 * @returns Promise resolving when save is complete
 */
export async function saveGlobalSettings(settings: Partial<GlobalSettings>): Promise<void> {
  try {
    const currentSettings = await getGlobalSettings();

    const newSettings: GlobalSettings = {
      ...currentSettings,
      ...settings,
    };

    // Update cache immediately
    updateGlobalCache(newSettings);

    // storage.local is authoritative; the sync mirror is best-effort so a sync
    // quota error can never lose the user's setting.
    await browser.storage.local.set({ [GLOBAL_SETTINGS_KEY]: newSettings });
    await writeSyncedSettings(newSettings);
  } catch (error) {
    console.error("[VolumeHero] Failed to save global settings:", error);
    throw error;
  }
}

// ============================================================================
// Statistics Tracking
// ============================================================================

// Serialises all statistics reads/writes to prevent concurrent read-modify-write races.
let statsWriteQueue: Promise<void> = Promise.resolve();

/**
 * Record a volume adjustment for statistics
 */
export function recordVolumeAdjustment(volume: number): Promise<void> {
  statsWriteQueue = statsWriteQueue.then(async () => {
    try {
      const settings = await getGlobalSettings();
      const stats = { ...settings.statistics };
      stats.totalVolumeAdjustments++;
      stats.lastUsedDate = Date.now();
      // Round to nearest 10% for histogram (keys are percentages: 0–600)
      const roundedVolume = Math.round(volume * 10) * 10;
      stats.volumeUsageHistogram[roundedVolume] =
        (stats.volumeUsageHistogram[roundedVolume] || 0) + 1;
      await saveGlobalSettings({ statistics: stats });
    } catch (error) {
      console.error("[VolumeHero] Failed to record volume adjustment:", error);
    }
  });
  return statsWriteQueue;
}

/**
 * Record a new site being boosted
 */
export function recordSiteBoosted(): Promise<void> {
  statsWriteQueue = statsWriteQueue.then(async () => {
    try {
      const settings = await getGlobalSettings();
      const stats = { ...settings.statistics };
      stats.totalSitesBoosted++;
      stats.lastUsedDate = Date.now();
      await saveGlobalSettings({ statistics: stats });
    } catch (error) {
      console.error("[VolumeHero] Failed to record site boosted:", error);
    }
  });
  return statsWriteQueue;
}

/**
 * Reset all statistics
 */
export async function resetStatistics(): Promise<void> {
  await saveGlobalSettings({ statistics: DEFAULT_STATISTICS });
}

// ============================================================================
// Domain Blacklist/Whitelist Management
// ============================================================================

/**
 * Check if a domain is blacklisted
 */
export async function isDomainBlacklisted(domain: string): Promise<boolean> {
  const settings = await getGlobalSettings();
  return settings.blacklistedDomains.includes(domain);
}

/**
 * Check if extension should be active on a domain
 * Takes into account both blacklist and whitelist
 */
export async function isDomainAllowed(domain: string): Promise<boolean> {
  const settings = await getGlobalSettings();

  // If whitelist is not empty, only allow whitelisted domains
  if (settings.whitelistedDomains.length > 0) {
    return settings.whitelistedDomains.includes(domain);
  }

  // Otherwise, block blacklisted domains
  return !settings.blacklistedDomains.includes(domain);
}

/**
 * Add domain to blacklist
 */
export async function addToBlacklist(domain: string): Promise<void> {
  const settings = await getGlobalSettings();
  if (!settings.blacklistedDomains.includes(domain)) {
    await saveGlobalSettings({
      blacklistedDomains: [...settings.blacklistedDomains, domain],
    });
  }
}

/**
 * Remove domain from blacklist
 */
export async function removeFromBlacklist(domain: string): Promise<void> {
  const settings = await getGlobalSettings();
  await saveGlobalSettings({
    blacklistedDomains: settings.blacklistedDomains.filter((d) => d !== domain),
  });
}

/**
 * Add domain to whitelist
 */
export async function addToWhitelist(domain: string): Promise<void> {
  const settings = await getGlobalSettings();
  if (!settings.whitelistedDomains.includes(domain)) {
    await saveGlobalSettings({
      whitelistedDomains: [...settings.whitelistedDomains, domain],
    });
  }
}

/**
 * Remove domain from whitelist
 */
export async function removeFromWhitelist(domain: string): Promise<void> {
  const settings = await getGlobalSettings();
  await saveGlobalSettings({
    whitelistedDomains: settings.whitelistedDomains.filter((d) => d !== domain),
  });
}

// ============================================================================
// Bulk Domain Operations
// ============================================================================

/**
 * Remove multiple domain settings at once
 */
export async function removeMultipleDomainSettings(domains: string[]): Promise<void> {
  try {
    const keysToRemove = domains.map((d) => `${STORAGE_PREFIX}${d}`);
    // Invalidate cache for all domains
    for (const domain of domains) {
      invalidateDomainCache(domain);
    }
    await browser.storage.local.remove(keysToRemove);
  } catch (error) {
    console.error("[VolumeHero] Failed to remove multiple domain settings:", error);
    throw error;
  }
}

/**
 * Clear all domain settings (but keep global settings)
 */
export async function clearAllDomainSettings(): Promise<void> {
  try {
    const allDomains = await getAllDomainSettings();
    const keysToRemove = allDomains.map((d) => `${STORAGE_PREFIX}${d.domain}`);

    // Clear cache
    for (const entry of allDomains) {
      invalidateDomainCache(entry.domain);
    }

    await browser.storage.local.remove(keysToRemove);
  } catch (error) {
    console.error("[VolumeHero] Failed to clear all domain settings:", error);
    throw error;
  }
}

// ============================================================================
// Import/Export Functions
// ============================================================================

export interface ExportData {
  version: string;
  exportDate: number;
  globalSettings: GlobalSettings;
  domainSettings: StoredDomainEntry[];
}

/**
 * Export all settings as JSON
 */
export async function exportAllSettings(): Promise<ExportData> {
  const globalSettings = await getGlobalSettings();
  const domainSettings = await getAllDomainSettings();

  return {
    version: "1.0.0",
    exportDate: Date.now(),
    globalSettings,
    domainSettings,
  };
}

/**
 * Import settings from JSON
 * @param data - Exported data to import
 * @param overwrite - Whether to overwrite existing settings
 */
export async function importSettings(
  data: ExportData,
  overwrite: boolean = true
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  try {
    // Import global settings
    if (overwrite) {
      // Preserve cloud sync credentials if they exist
      const currentSettings = await getGlobalSettings();
      const importedSettings = {
        ...data.globalSettings,
        cloudSync: currentSettings.cloudSync, // Keep current cloud sync config
      };
      await saveGlobalSettings(importedSettings);
    }

    // Import domain settings
    for (const entry of data.domainSettings) {
      if (!overwrite) {
        const hasExisting = await hasDomainSettings(entry.domain);
        if (hasExisting) {
          skipped++;
          continue;
        }
      }

      await saveDomainSettings(entry.domain, entry.settings);
      imported++;
    }

    return { imported, skipped };
  } catch (error) {
    console.error("[VolumeHero] Failed to import settings:", error);
    throw error;
  }
}
