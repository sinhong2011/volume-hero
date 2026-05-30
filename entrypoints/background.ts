/**
 * Background script for Volume Hero extension
 * Handles extension events and tab communication
 */

import {
  extractDomain,
  getDomainSettings,
  getGlobalSettings,
  getGlobalSettingsSync,
  saveDomainSettings,
} from "@/utils/storage";
import { startAutoSync } from "@/utils/sync";
import type { MediaInfo, TabMediaInfo } from "@/utils/volume";

// Track previous volume for mute toggle
const previousVolume: Map<number, number> = new Map();

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
  });

  // Handle tab updates to re-inject content script if needed
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // When a page finishes loading, we could notify the content script
    if (changeInfo.status === "complete" && tab.url) {
      // Content script will auto-initialize based on its own logic
      console.log(`[VolumeHero] Tab ${tabId} updated: ${tab.url}`);
    }
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
          newVolume = previousVolume.get(activeTab.id) ?? 1.0;
        } else {
          // Mute - save current volume and set to 0
          previousVolume.set(activeTab.id, settings.volume);
          newVolume = 0;
        }
        break;
    }

    // Save and apply the new volume
    await saveDomainSettings(domain, { volume: newVolume });
    await applyVolumeToTab(activeTab.id, newVolume);

    // Update badge to show current volume
    updateBadge(activeTab.id, newVolume);

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
      applyVolumeToTab(tabId, volume).then((result) => {
        // Update badge when volume is applied
        updateBadge(tabId, volume);
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
      updateBadge(tabId, volume);
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
        updateBadge(activeInfo.tabId, settings.volume);
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
function updateBadge(tabId: number, volume: number): void {
  const globalSettings = getGlobalSettingsSync();
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

/**
 * Query all tabs and get media info from each
 */
async function getAllTabsWithMedia(): Promise<TabMediaInfo[]> {
  const tabs = await browser.tabs.query({});
  const tabsWithMedia: TabMediaInfo[] = [];

  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;

    // Skip chrome:// and other restricted URLs
    if (
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("about:") ||
      tab.url.startsWith("moz-extension://") ||
      tab.url.startsWith("edge://")
    ) {
      continue;
    }

    try {
      const response = await browser.tabs.sendMessage(tab.id, {
        type: "GET_MEDIA_INFO",
      });

      if (response?.mediaInfo && response.mediaInfo.length > 0) {
        // Check if any media is playing (not paused)
        const playingMedia = response.mediaInfo.filter((m: MediaInfo) => !m.paused);

        if (playingMedia.length > 0) {
          tabsWithMedia.push({
            tabId: tab.id,
            title: tab.title || "Unknown",
            favicon: tab.favIconUrl || "",
            url: tab.url,
            mediaInfo: playingMedia,
            isActive: tab.active,
          });
        }
      }
    } catch (error) {
      // Tab doesn't have content script or is not accessible
      console.debug(`[VolumeHero] Cannot access tab ${tab.id}:`, error);
    }
  }

  return tabsWithMedia;
}

/**
 * Apply volume to a specific tab
 */
async function applyVolumeToTab(tabId: number, volume: number): Promise<boolean> {
  try {
    await browser.tabs.sendMessage(tabId, {
      type: "APPLY_VOLUME",
      volume,
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
