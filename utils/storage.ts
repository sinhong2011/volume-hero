/**
 * Storage utilities for Volume Hero extension
 * Manages per-domain volume settings persistence
 */

export interface DomainSettings {
  volume: number; // 0.0 to 6.0 (representing 0% to 600%)
  autoApply: boolean; // whether to auto-apply on page load
  lastApplied: number; // Unix timestamp (milliseconds)
}

export interface GlobalSettings {
  language: string; // Locale code: 'en', 'zh_CN', 'zh_TW'
}

const STORAGE_PREFIX = "volumehero:";
const GLOBAL_SETTINGS_KEY = "volumehero:global";

/**
 * Default settings for new domains
 */
export const DEFAULT_SETTINGS: DomainSettings = {
  volume: 1.0,
  autoApply: false,
  lastApplied: Date.now(),
};

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
    console.error(
      "[VolumeHero] Failed to extract domain from URL:",
      url,
      error
    );
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
 * Get domain settings from storage
 * @param domain - Domain name
 * @returns Promise resolving to domain settings or default settings
 */
export async function getDomainSettings(
  domain: string
): Promise<DomainSettings> {
  if (!domain) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const key = getStorageKey(domain);
    const result = await browser.storage.local.get(key);

    if (result[key]) {
      return result[key] as DomainSettings;
    }

    return { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.error("[VolumeHero] Failed to get domain settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save domain settings to storage
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
    domainEntries.sort(
      (a, b) => b.settings.lastApplied - a.settings.lastApplied
    );

    return domainEntries;
  } catch (error) {
    console.error("[VolumeHero] Failed to get all domain settings:", error);
    return [];
  }
}

/**
 * Default global settings
 */
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  language: "en",
};

/**
 * Get global extension settings from storage
 * @returns Promise resolving to global settings
 */
export async function getGlobalSettings(): Promise<GlobalSettings> {
  try {
    const result = await browser.storage.local.get(GLOBAL_SETTINGS_KEY);

    if (result[GLOBAL_SETTINGS_KEY]) {
      return result[GLOBAL_SETTINGS_KEY] as GlobalSettings;
    }

    return { ...DEFAULT_GLOBAL_SETTINGS };
  } catch (error) {
    console.error("[VolumeHero] Failed to get global settings:", error);
    return { ...DEFAULT_GLOBAL_SETTINGS };
  }
}

/**
 * Save global extension settings to storage
 * @param settings - Settings to save
 * @returns Promise resolving when save is complete
 */
export async function saveGlobalSettings(
  settings: Partial<GlobalSettings>
): Promise<void> {
  try {
    const currentSettings = await getGlobalSettings();

    const newSettings: GlobalSettings = {
      ...currentSettings,
      ...settings,
    };

    await browser.storage.local.set({ [GLOBAL_SETTINGS_KEY]: newSettings });
  } catch (error) {
    console.error("[VolumeHero] Failed to save global settings:", error);
    throw error;
  }
}
