/**
 * Background script for Volume Hero extension
 * Handles extension events and tab communication
 */

import {
  extractDomain,
  getDomainSettings,
  getGlobalSettings,
  saveDomainSettings,
} from "@/utils/storage";
import { startAutoSync } from "@/utils/sync";
import type { MediaInfo, TabMediaInfo } from "@/utils/volume";

// Track the pre-mute volume so "unmute" can restore it.
//
// This lives in session storage rather than a module-level Map for two reasons:
// the MV3 service worker is torn down after a short idle period (an in-memory
// value would silently reset unmute to 100%), and the key is the domain rather
// than the tab id so muting in one tab and unmuting in another tab on the same
// site restores the same level that domain settings are stored against.
const PREVIOUS_VOLUME_PREFIX = "previousVolume:";

async function getPreviousVolume(domain: string): Promise<number | undefined> {
  const key = PREVIOUS_VOLUME_PREFIX + domain;
  try {
    const result = await browser.storage.session.get(key);
    const value = result[key];
    return typeof value === "number" ? value : undefined;
  } catch (error) {
    console.error("[VolumeHero] Failed to read previous volume:", error);
    return undefined;
  }
}

async function setPreviousVolume(domain: string, volume: number): Promise<void> {
  try {
    await browser.storage.session.set({ [PREVIOUS_VOLUME_PREFIX + domain]: volume });
  } catch (error) {
    console.error("[VolumeHero] Failed to persist previous volume:", error);
  }
}

export default defineBackground(() => {
  console.log("[VolumeHero] Background script initialized", {
    id: browser.runtime.id,
  });

  // Initialize auto-sync on startup
  startAutoSync().catch((error) => {
    console.error("[VolumeHero] Failed to start auto-sync:", error);
  });

  // Handle extension installation
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      console.log("[VolumeHero] Extension installed");
    } else if (details.reason === "update") {
      console.log("[VolumeHero] Extension updated");
      // Restart auto-sync after update
      startAutoSync().catch((error) => {
        console.error("[VolumeHero] Failed to start auto-sync after update:", error);
      });
    }

    // Inject the content script into tabs that were already open before this
    // install/update, so media controls work without a manual page reload.
    if (details.reason === "install" || details.reason === "update") {
      injectContentScriptIntoExistingTabs();
    }
  });

  // Cover the case where the browser starts with restored tabs.
  browser.runtime.onStartup.addListener(() => {
    injectContentScriptIntoExistingTabs();
  });

  // Refresh the toolbar badge whenever a tab finishes loading, so the volume
  // number shows up on sites that auto-apply a boosted volume on page load.
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url) return;

    const domain = extractDomain(tab.url);
    if (!domain) {
      browser.action.setBadgeText({ text: "", tabId });
      return;
    }

    const [settings, globalSettings] = await Promise.all([
      getDomainSettings(domain),
      getGlobalSettings(),
    ]);
    // Only reflect the saved volume if it actually gets applied on load.
    const willApply = settings.autoApply || globalSettings.autoApplyAllByDefault;
    await updateBadge(tabId, willApply ? settings.volume : 1.0);
  });

  // Handle keyboard commands
  browser.commands.onCommand.addListener(async (command) => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const activeTab = tabs[0];

    if (!activeTab?.id || !activeTab?.url) return;

    const domain = extractDomain(activeTab.url);
    if (!domain) return;

    const settings = await getDomainSettings(domain);
    const globalSettings = await getGlobalSettings();
    const stepSize = globalSettings.volumeStepSize;
    let newVolume = settings.volume;

    switch (command) {
      case "volume-up":
        newVolume = Math.min(globalSettings.maxVolumeLimit, settings.volume + stepSize);
        break;
      case "volume-down":
        newVolume = Math.max(0, settings.volume - stepSize);
        break;
      case "volume-reset":
        newVolume = 1.0;
        break;
      case "volume-mute":
        if (settings.volume === 0) {
          // Unmute - restore previous volume
          newVolume = (await getPreviousVolume(domain)) ?? 1.0;
        } else {
          // Mute - save current volume and set to 0
          await setPreviousVolume(domain, settings.volume);
          newVolume = 0;
        }
        break;
    }

    // Save and apply the new volume (shortcuts show the on-page OSD)
    await saveDomainSettings(domain, { volume: newVolume });
    await applyVolumeToTab(activeTab.id, newVolume, true);

    // Update badge to show current volume
    await updateBadge(activeTab.id, newVolume);

    console.log(`[VolumeHero] Command ${command}: volume set to ${Math.round(newVolume * 100)}%`);
  });

  // Handle messages from popup
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GET_ALL_TABS_MEDIA") {
      getAllTabsWithMedia().then(sendResponse);
      return true; // Keep message channel open for async response
    }

    if (message.type === "APPLY_VOLUME_TO_TAB") {
      const { tabId, volume } = message;
      applyVolumeToTab(tabId, volume).then(async (result) => {
        // Update badge when volume is applied
        await updateBadge(tabId, volume);
        sendResponse(result);
      });
      return true;
    }

    if (message.type === "FOCUS_TAB") {
      const { tabId } = message;
      focusTab(tabId).then(sendResponse);
      return true;
    }

    if (message.type === "UPDATE_BADGE") {
      const { tabId, volume } = message;
      // updateBadge loads global settings (showBadge) itself before drawing.
      void updateBadge(tabId, volume);
      return false;
    }
  });

  // Update badge when tab is activated
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (tab.url) {
      const domain = extractDomain(tab.url);
      if (domain) {
        const settings = await getDomainSettings(domain);
        await updateBadge(activeInfo.tabId, settings.volume);
      } else {
        // Clear badge for non-applicable pages
        browser.action.setBadgeText({ text: "", tabId: activeInfo.tabId });
      }
    }
  });
});

/**
 * Update the extension badge with current volume
 */
async function updateBadge(tabId: number, volume: number): Promise<void> {
  // Read through the async accessor: the service worker is restarted often, and
  // the sync cache returns defaults while cold — which made a disabled badge
  // reappear after every restart.
  const globalSettings = await getGlobalSettings();
  if (!globalSettings.showBadge) {
    browser.action.setBadgeText({ text: "", tabId });
    return;
  }

  const percentage = Math.round(volume * 100);

  // Only show badge if volume is not 100%
  if (percentage === 100) {
    browser.action.setBadgeText({ text: "", tabId });
    return;
  }

  // Format the badge text
  let badgeText = `${percentage}`;
  if (percentage >= 1000) {
    badgeText = "MAX";
  }

  // Set badge color based on volume level
  let backgroundColor: string;
  if (percentage === 0) {
    backgroundColor = "#6b7280"; // gray for muted
  } else if (percentage <= 100) {
    backgroundColor = "#22c55e"; // green for normal
  } else if (percentage <= 300) {
    backgroundColor = "#f59e0b"; // amber for boosted
  } else {
    backgroundColor = "#ef4444"; // red for high boost
  }

  browser.action.setBadgeText({ text: badgeText, tabId });
  browser.action.setBadgeBackgroundColor({ color: backgroundColor, tabId });
  browser.action.setBadgeTextColor({ color: "#ffffff", tabId });
}

/** Path of the built content script, relative to the extension root. */
const CONTENT_SCRIPT_FILE = "/content-scripts/content.js" as const;

/**
 * Inject the content script into already-open http/https tabs that don't have
 * it yet (e.g. tabs that were open before the extension was installed or
 * updated). Tabs that already respond are skipped to avoid double-injection.
 */
async function injectContentScriptIntoExistingTabs(): Promise<void> {
  if (!browser.scripting?.executeScript) return;

  const tabs = await browser.tabs.query({}).catch((error) => {
    console.error("[VolumeHero] Failed to query tabs for injection:", error);
    return [];
  });

  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id || !tab.url || !/^https?:\/\//.test(tab.url)) return;

      // Already injected? A successful round-trip means the script is present.
      try {
        await browser.tabs.sendMessage(tab.id, { type: "GET_MEDIA_INFO" });
        return;
      } catch {
        // Not present yet — fall through to inject.
      }

      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: [CONTENT_SCRIPT_FILE],
        });
        console.log(`[VolumeHero] Injected content script into tab ${tab.id}`);
      } catch (error) {
        // Restricted pages (e.g. the web store) reject injection — expected.
        console.debug(`[VolumeHero] Could not inject into tab ${tab.id}:`, error);
      }
    })
  );
}

/**
 * Query all tabs and get media info from each
 */
async function getAllTabsWithMedia(): Promise<TabMediaInfo[]> {
  const tabs = await browser.tabs.query({});

  // Probe every tab concurrently. Doing this sequentially meant each
  // unresponsive tab burned its full message timeout before the next one was
  // even tried, which visibly stalled the popup's tab list on busy windows.
  const results = await Promise.all(
    tabs.map(async (tab): Promise<TabMediaInfo | null> => {
      if (!tab.id || !tab.url) return null;

      // Skip chrome:// and other restricted URLs
      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("about:") ||
        tab.url.startsWith("moz-extension://") ||
        tab.url.startsWith("edge://")
      ) {
        return null;
      }

      try {
        const response = await browser.tabs.sendMessage(tab.id, {
          type: "GET_MEDIA_INFO",
        });

        if (!response?.mediaInfo?.length) return null;

        // Check if any media is playing (not paused)
        const playingMedia = response.mediaInfo.filter((m: MediaInfo) => !m.paused);
        if (playingMedia.length === 0) return null;

        return {
          tabId: tab.id,
          title: tab.title || "Unknown",
          favicon: tab.favIconUrl || "",
          url: tab.url,
          mediaInfo: playingMedia,
          isActive: tab.active,
        };
      } catch (error) {
        // Tab doesn't have content script or is not accessible
        console.debug(`[VolumeHero] Cannot access tab ${tab.id}:`, error);
        return null;
      }
    })
  );

  return results.filter((tab): tab is TabMediaInfo => tab !== null);
}

/**
 * Apply volume to a specific tab
 */
async function applyVolumeToTab(tabId: number, volume: number, showOsd = false): Promise<boolean> {
  try {
    await browser.tabs.sendMessage(tabId, {
      type: "APPLY_VOLUME",
      volume,
      showOsd,
    });
    return true;
  } catch (error) {
    console.error(`[VolumeHero] Failed to apply volume to tab ${tabId}:`, error);
    return false;
  }
}

/**
 * Focus on a specific tab
 */
async function focusTab(tabId: number): Promise<boolean> {
  try {
    const tab = await browser.tabs.get(tabId);
    await browser.tabs.update(tabId, { active: true });
    if (tab.windowId) {
      await browser.windows.update(tab.windowId, { focused: true });
    }
    return true;
  } catch (error) {
    console.error(`[VolumeHero] Failed to focus tab ${tabId}:`, error);
    return false;
  }
}
