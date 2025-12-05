/**
 * SolidJS hook for volume control state management
 * Provides reactive state for volume slider with auto-save and debouncing
 */

import { createSignal, onCleanup, onMount } from "solid-js";
import {
  DEFAULT_SETTINGS,
  type DomainSettings,
  extractDomain,
  getDomainSettings,
  saveDomainSettings,
} from "@/utils/storage";
import type { MediaInfo, TabMediaInfo } from "@/utils/volume";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface VolumeControlState {
  domain: () => string;
  volume: () => number;
  autoApply: () => boolean;
  saveStatus: () => SaveStatus;
  isLoading: () => boolean;
  mediaInfo: () => MediaInfo[];
  tabsWithMedia: () => TabMediaInfo[];
  tabVolumes: () => Map<number, number>;
  setVolume: (value: number) => void;
  setAutoApply: (value: boolean) => void;
  resetVolume: () => void;
  applyToTab: () => Promise<void>;
  refreshMediaInfo: () => Promise<void>;
  refreshAllTabsMedia: () => Promise<void>;
  setTabVolume: (tabId: number, volume: number) => void;
  focusTab: (tabId: number) => Promise<void>;
}

const DEBOUNCE_DELAY = 500; // ms

/**
 * Create volume control hook
 * @returns Volume control state and actions
 */
export function useVolumeControl(): VolumeControlState {
  const [domain, setDomain] = createSignal<string>("");
  const [volume, setVolumeSignal] = createSignal<number>(
    DEFAULT_SETTINGS.volume
  );
  const [autoApply, setAutoApplySignal] = createSignal<boolean>(
    DEFAULT_SETTINGS.autoApply
  );
  const [saveStatus, setSaveStatus] = createSignal<SaveStatus>("idle");
  const [isLoading, setIsLoading] = createSignal<boolean>(true);
  const [mediaInfo, setMediaInfo] = createSignal<MediaInfo[]>([]);
  const [tabsWithMedia, setTabsWithMedia] = createSignal<TabMediaInfo[]>([]);
  const [tabVolumes, setTabVolumes] = createSignal<Map<number, number>>(
    new Map()
  );

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  const tabVolumeTimeouts: Map<
    number,
    ReturnType<typeof setTimeout>
  > = new Map();

  /**
   * Fetch media info from the active tab
   */
  async function refreshMediaInfo(): Promise<void> {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];

      if (activeTab?.id) {
        const response = await browser.tabs.sendMessage(activeTab.id, {
          type: "GET_MEDIA_INFO",
        });
        if (response?.mediaInfo) {
          setMediaInfo(response.mediaInfo);
        }
      }
    } catch (error) {
      console.error("[VolumeHero] Failed to get media info:", error);
      setMediaInfo([]);
    }
  }

  /**
   * Fetch all tabs that have playing media
   */
  async function refreshAllTabsMedia(): Promise<void> {
    try {
      const response = await browser.runtime.sendMessage({
        type: "GET_ALL_TABS_MEDIA",
      });
      if (response && Array.isArray(response)) {
        setTabsWithMedia(response);

        // Clean up timeouts for tabs that no longer exist
        const currentTabIds = new Set(
          (response as TabMediaInfo[]).map((t) => t.tabId)
        );
        for (const [tabId, timeout] of tabVolumeTimeouts.entries()) {
          if (!currentTabIds.has(tabId)) {
            clearTimeout(timeout);
            tabVolumeTimeouts.delete(tabId);
          }
        }

        // Initialize tab volumes from domain settings - fetch in parallel
        const tabsData = response as TabMediaInfo[];
        const volumePromises = tabsData.map(async (tab) => {
          if (tab.isActive) {
            return { tabId: tab.tabId, volume: volume() };
          }
          const tabDomain = extractDomain(tab.url);
          if (tabDomain) {
            const settings = await getDomainSettings(tabDomain);
            return { tabId: tab.tabId, volume: settings.volume };
          }
          return { tabId: tab.tabId, volume: 1.0 };
        });

        const volumeResults = await Promise.all(volumePromises);
        const newVolumes = new Map<number, number>();
        for (const { tabId, volume: vol } of volumeResults) {
          newVolumes.set(tabId, vol);
        }
        setTabVolumes(newVolumes);
      }
    } catch (error) {
      console.error("[VolumeHero] Failed to get all tabs media:", error);
      setTabsWithMedia([]);
    }
  }

  /**
   * Set volume for a specific tab with debouncing
   * Also persists to domain settings for non-active tabs
   */
  function setTabVolume(tabId: number, vol: number): void {
    const clampedVol = Math.max(0, Math.min(6, vol));

    // Update local state immediately
    setTabVolumes((prev) => {
      const newMap = new Map(prev);
      newMap.set(tabId, clampedVol);
      return newMap;
    });

    // Clear existing timeout for this tab
    const existingTimeout = tabVolumeTimeouts.get(tabId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Debounce the actual apply and save
    const timeout = setTimeout(async () => {
      try {
        // Apply volume to tab
        await browser.runtime.sendMessage({
          type: "APPLY_VOLUME_TO_TAB",
          tabId,
          volume: clampedVol,
        });

        // Save domain settings for non-active tabs
        const tab = tabsWithMedia().find((t) => t.tabId === tabId);
        if (tab && !tab.isActive) {
          const tabDomain = extractDomain(tab.url);
          if (tabDomain) {
            await saveDomainSettings(tabDomain, { volume: clampedVol });
          }
        }

        // Clean up completed timeout
        tabVolumeTimeouts.delete(tabId);
      } catch (error) {
        console.error(
          `[VolumeHero] Failed to apply volume to tab ${tabId}:`,
          error
        );
      }
    }, DEBOUNCE_DELAY);

    tabVolumeTimeouts.set(tabId, timeout);
  }

  /**
   * Focus/jump to a specific tab
   */
  async function focusTab(tabId: number): Promise<void> {
    try {
      await browser.runtime.sendMessage({
        type: "FOCUS_TAB",
        tabId,
      });
    } catch (error) {
      console.error(`[VolumeHero] Failed to focus tab ${tabId}:`, error);
    }
  }

  // Load initial settings from active tab
  onMount(async () => {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];

      if (activeTab?.url) {
        const currentDomain = extractDomain(activeTab.url);
        setDomain(currentDomain);

        if (currentDomain) {
          // Load domain settings first (critical for UI), then show UI immediately
          const settings = await getDomainSettings(currentDomain);
          setVolumeSignal(settings.volume);
          setAutoApplySignal(settings.autoApply);

          // Mark as loaded so UI can render
          setIsLoading(false);

          // Fetch media info and all tabs in parallel (non-blocking)
          Promise.all([refreshMediaInfo(), refreshAllTabsMedia()]).catch(
            (err) => {
              console.error("[VolumeHero] Failed to refresh media:", err);
            }
          );
          return;
        }
      }

      // No domain case - still try to load tabs media
      setIsLoading(false);
      refreshAllTabsMedia().catch((err) => {
        console.error("[VolumeHero] Failed to refresh all tabs media:", err);
      });
    } catch (error) {
      console.error("[VolumeHero] Failed to load initial settings:", error);
      setIsLoading(false);
    }
  });

  // Cleanup timeout on unmount
  onCleanup(() => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    // Clear all tab volume timeouts
    for (const timeout of tabVolumeTimeouts.values()) {
      clearTimeout(timeout);
    }
    tabVolumeTimeouts.clear();
  });

  /**
   * Save settings with debouncing
   */
  async function saveSettings(
    settings: Partial<DomainSettings>
  ): Promise<void> {
    const currentDomain = domain();
    if (!currentDomain) return;

    setSaveStatus("saving");

    try {
      await saveDomainSettings(currentDomain, settings);
      setSaveStatus("saved");

      // Reset status after delay
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (error) {
      console.error("[VolumeHero] Failed to save settings:", error);
      setSaveStatus("error");
    }
  }

  /**
   * Set volume with debounced save
   */
  function setVolume(value: number): void {
    const clampedValue = Math.max(0, Math.min(6, value));
    setVolumeSignal(clampedValue);

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Debounce save
    saveTimeout = setTimeout(() => {
      saveSettings({ volume: clampedValue });
      applyToTab();
    }, DEBOUNCE_DELAY);
  }

  /**
   * Set auto-apply setting with immediate save
   */
  function setAutoApply(value: boolean): void {
    setAutoApplySignal(value);
    saveSettings({ autoApply: value });
  }

  /**
   * Reset volume to 100%
   */
  function resetVolume(): void {
    setVolume(1.0);
  }

  /**
   * Apply current volume to active tab
   */
  async function applyToTab(): Promise<void> {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];

      if (activeTab?.id) {
        await browser.tabs.sendMessage(activeTab.id, {
          type: "APPLY_VOLUME",
          volume: volume(),
        });
      }
    } catch (error) {
      console.error("[VolumeHero] Failed to apply volume to tab:", error);
    }
  }

  return {
    domain,
    volume,
    autoApply,
    saveStatus,
    isLoading,
    mediaInfo,
    tabsWithMedia,
    tabVolumes,
    setVolume,
    setAutoApply,
    resetVolume,
    applyToTab,
    refreshMediaInfo,
    refreshAllTabsMedia,
    setTabVolume,
    focusTab,
  };
}
