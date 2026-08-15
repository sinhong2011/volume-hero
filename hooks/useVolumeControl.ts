/**
 * SolidJS hook for volume control state management
 * Provides reactive state for volume slider with auto-save and debouncing
 * Optimized for fast popup loading with non-blocking initialization
 */

import { debounce } from "es-toolkit";
import { createSignal, onCleanup, onMount } from "solid-js";
import toast from "solid-toast";
import { type EQSettings, FLAT_EQ } from "@/utils/audio-eq";
import {
  DEFAULT_SETTINGS,
  type DomainSettings,
  extractDomain,
  type GlobalSettings,
  getDomainSettings,
  getDomainSettingsSync,
  getGlobalSettings,
  saveDomainSettings,
} from "@/utils/storage";
import type { MediaInfo, TabMediaInfo } from "@/utils/volume";

export interface VolumeControlState {
  domain: () => string;
  volume: () => number;
  autoApply: () => boolean;
  isLoading: () => boolean;
  mediaInfo: () => MediaInfo[];
  tabsWithMedia: () => TabMediaInfo[];
  tabVolumes: () => Map<number, number>;
  globalSettings: () => GlobalSettings | null;
  eq: () => EQSettings;
  setVolume: (value: number) => void;
  setAutoApply: (value: boolean) => void;
  setEQ: (value: EQSettings) => void;
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
  const [volume, setVolumeSignal] = createSignal<number>(DEFAULT_SETTINGS.volume);
  const [autoApply, setAutoApplySignal] = createSignal<boolean>(DEFAULT_SETTINGS.autoApply);
  const [isLoading, setIsLoading] = createSignal<boolean>(true);
  const [mediaInfo, setMediaInfo] = createSignal<MediaInfo[]>([]);
  const [tabsWithMedia, setTabsWithMedia] = createSignal<TabMediaInfo[]>([]);
  const [tabVolumes, setTabVolumes] = createSignal<Map<number, number>>(new Map());
  const [globalSettings, setGlobalSettings] = createSignal<GlobalSettings | null>(null);
  const [eq, setEQSignal] = createSignal<EQSettings>({ ...FLAT_EQ });

  // Store debounced functions for tab volume changes (one per tab)
  const tabVolumeDebouncedFns = new Map<
    number,
    ReturnType<typeof debounce<(vol: number) => Promise<void>>>
  >();

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
        // Asked of the background rather than the tab directly: the content
        // script runs in every frame, and messaging a tab without a frame id
        // keeps only the first reply — usually the top document, which for an
        // embedded player has no media. The background merges all frames.
        const response = await browser.runtime.sendMessage({
          type: "GET_TAB_MEDIA",
          tabId: activeTab.id,
        });
        setMediaInfo(response?.mediaInfo ?? []);
      }
    } catch (error) {
      // Tabs without the content script (extension pages, the web store,
      // restricted URLs) simply have no receiver. That is an expected state,
      // not a failure, so it must not surface as a console error.
      console.debug("[VolumeHero] No media info from active tab:", error);
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

        // Clean up debounced functions for tabs that no longer exist
        const currentTabIds = new Set((response as TabMediaInfo[]).map((t) => t.tabId));
        for (const [tabId, debouncedFn] of tabVolumeDebouncedFns.entries()) {
          if (!currentTabIds.has(tabId)) {
            debouncedFn.cancel();
            tabVolumeDebouncedFns.delete(tabId);
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
   * Get or create a debounced function for applying volume to a specific tab
   */
  function getTabVolumeDebounced(
    tabId: number
  ): ReturnType<typeof debounce<(vol: number) => Promise<void>>> {
    let debouncedFn = tabVolumeDebouncedFns.get(tabId);
    if (!debouncedFn) {
      debouncedFn = debounce(async (vol: number) => {
        try {
          // Apply volume to tab
          await browser.runtime.sendMessage({
            type: "APPLY_VOLUME_TO_TAB",
            tabId,
            volume: vol,
          });

          // Save domain settings for non-active tabs
          const tab = tabsWithMedia().find((t) => t.tabId === tabId);
          if (tab && !tab.isActive) {
            const tabDomain = extractDomain(tab.url);
            if (tabDomain) {
              await saveDomainSettings(tabDomain, { volume: vol });
            }
          }
        } catch (error) {
          console.error(`[VolumeHero] Failed to apply volume to tab ${tabId}:`, error);
        }
      }, DEBOUNCE_DELAY);
      tabVolumeDebouncedFns.set(tabId, debouncedFn);
    }
    return debouncedFn;
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

    // Call debounced function to apply and save
    getTabVolumeDebounced(tabId)(clampedVol);
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

  // Load initial settings from active tab - optimized for fast popup display
  onMount(() => {
    // FAST PATH: Get tab info synchronously and show UI immediately with cached/default values
    // Then update reactively when async data arrives
    const initializeAsync = async () => {
      try {
        // Load global settings first
        const globalSettingsData = await getGlobalSettings();
        setGlobalSettings(globalSettingsData);

        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeTab = tabs[0];

        if (activeTab?.url) {
          const currentDomain = extractDomain(activeTab.url);
          setDomain(currentDomain);

          if (currentDomain) {
            // Try sync cache first for instant UI
            const cachedSettings = getDomainSettingsSync(currentDomain);
            setVolumeSignal(cachedSettings.volume);
            setAutoApplySignal(cachedSettings.autoApply);
            setEQSignal({
              bassBoost: cachedSettings.bassBoost ?? 0,
              trebleBoost: cachedSettings.trebleBoost ?? 0,
            });

            // Show UI immediately (don't wait for storage verification)
            setIsLoading(false);

            // Refresh the toolbar badge for the current tab so it reflects the
            // active volume as soon as the popup opens.
            if (activeTab.id) {
              browser.runtime
                .sendMessage({
                  type: "UPDATE_BADGE",
                  tabId: activeTab.id,
                  volume: cachedSettings.volume,
                })
                .catch(() => {});
            }

            // Verify/update from storage in background (will update UI if different)
            getDomainSettings(currentDomain).then((settings) => {
              // Only update if different from cached values
              if (settings.volume !== cachedSettings.volume) {
                setVolumeSignal(settings.volume);
                if (activeTab.id) {
                  browser.runtime
                    .sendMessage({
                      type: "UPDATE_BADGE",
                      tabId: activeTab.id,
                      volume: settings.volume,
                    })
                    .catch(() => {});
                }
              }
              if (settings.autoApply !== cachedSettings.autoApply) {
                setAutoApplySignal(settings.autoApply);
              }
              setEQSignal({
                bassBoost: settings.bassBoost ?? 0,
                trebleBoost: settings.trebleBoost ?? 0,
              });
            });

            // Fetch media info and all tabs in parallel (non-blocking)
            Promise.all([refreshMediaInfo(), refreshAllTabsMedia()]).catch((err) => {
              console.error("[VolumeHero] Failed to refresh media:", err);
            });
            return;
          }
        }

        // No domain case - show UI and load tabs media in background
        setIsLoading(false);
        refreshAllTabsMedia().catch((err) => {
          console.error("[VolumeHero] Failed to refresh all tabs media:", err);
        });
      } catch (error) {
        console.error("[VolumeHero] Failed to load initial settings:", error);
        setIsLoading(false);
      }
    };

    // Start async initialization immediately but don't block
    initializeAsync();
  });

  /**
   * Save settings to storage (non-debounced helper)
   */
  async function saveSettings(settings: Partial<DomainSettings>): Promise<void> {
    const currentDomain = domain();
    if (!currentDomain) return;

    try {
      await saveDomainSettings(currentDomain, settings);
      // Silent save - no toast for routine volume changes to avoid spam
    } catch (error) {
      console.error("[VolumeHero] Failed to save settings:", error);
      toast.error("Failed to save settings");
    }
  }

  /**
   * Debounced function to save volume and apply to tab
   */
  const debouncedSaveAndApply = debounce(async (clampedValue: number) => {
    await saveSettings({ volume: clampedValue });
    await applyToTab();
  }, DEBOUNCE_DELAY);

  /**
   * Debounced save for EQ, mirroring the volume path so dragging a band does
   * not write to storage on every frame.
   */
  const debouncedSaveEQ = debounce(async (settings: EQSettings) => {
    await saveSettings(settings);
    await applyEQToTab(settings);
  }, DEBOUNCE_DELAY);

  // Cleanup debounced functions on unmount
  onCleanup(() => {
    debouncedSaveAndApply.cancel();
    debouncedSaveEQ.cancel();
    // Cancel all tab volume debounced functions
    for (const debouncedFn of tabVolumeDebouncedFns.values()) {
      debouncedFn.cancel();
    }
    tabVolumeDebouncedFns.clear();
  });

  /**
   * Set volume with debounced save
   * Respects maxVolumeLimit from global settings
   */
  function setVolume(value: number): void {
    const settings = globalSettings();
    const maxLimit = settings?.maxVolumeLimit ?? 6;
    const clampedValue = Math.max(0, Math.min(maxLimit, value));
    setVolumeSignal(clampedValue);

    // Call debounced save and apply
    debouncedSaveAndApply(clampedValue);
  }

  /**
   * Set auto-apply setting with immediate save
   */
  function setAutoApply(value: boolean): void {
    setAutoApplySignal(value);
    saveSettings({ autoApply: value });
  }

  /**
   * Set the equalizer with a debounced save
   */
  function setEQ(value: EQSettings): void {
    const clamped: EQSettings = {
      bassBoost: Math.max(-12, Math.min(12, value.bassBoost)),
      trebleBoost: Math.max(-12, Math.min(12, value.trebleBoost)),
    };
    setEQSignal(clamped);
    debouncedSaveEQ(clamped);
  }

  /**
   * Push EQ settings to the active tab's content script.
   */
  async function applyEQToTab(settings: EQSettings): Promise<void> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (!activeTab?.id) return;
      await browser.tabs.sendMessage(activeTab.id, { type: "APPLY_EQ", eq: settings });
    } catch (error) {
      // No receiver on this tab (extension page, restricted URL) is an expected
      // state, not a failure — matching how media info handles the same case.
      console.debug("[VolumeHero] No tab to apply EQ to:", error);
    }
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
        // Routed through the background so every frame is addressed; an
        // embedded player lives in a sub-frame that a plain tab message would
        // not reliably reach. showOsd stays false because the popup already
        // shows the volume — only shortcuts use the on-page OSD.
        await browser.runtime.sendMessage({
          type: "APPLY_VOLUME_TO_TAB",
          tabId: activeTab.id,
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
    isLoading,
    mediaInfo,
    tabsWithMedia,
    tabVolumes,
    globalSettings,
    eq,
    setVolume,
    setAutoApply,
    setEQ,
    resetVolume,
    applyToTab,
    refreshMediaInfo,
    refreshAllTabsMedia,
    setTabVolume,
    focusTab,
  };
}
