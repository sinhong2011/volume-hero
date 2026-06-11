/**
 * Content script for Volume Hero extension
 * Handles media element detection and volume application
 */

import { onMediaDetected, processExistingMedia, startObserving } from "@/content/media-observer";
import { showVolumeOSD } from "@/utils/osd";
import {
  extractDomain,
  getDomainSettings,
  getGlobalSettings,
  isDomainAllowed,
} from "@/utils/storage";
import { applyVolumeToMedia, getAllMediaElements, getAllMediaInfo } from "@/utils/volume";

let currentVolume = 1.0;
let hasManuallyApplied = false;
let osdEnabled = true;
let osdDuration = 1500;

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",

  async main() {
    console.log("[VolumeHero] Content script loaded");

    // Get current domain
    const domain = extractDomain(window.location.href);
    if (!domain) {
      console.log("[VolumeHero] No valid domain, skipping initialization");
      return;
    }

    // Check if domain is allowed (respects both blacklist and whitelist)
    const allowed = await isDomainAllowed(domain);
    if (!allowed) {
      console.log("[VolumeHero] Domain is not allowed, skipping initialization");
      return;
    }

    // Load global settings for OSD
    const globalSettings = await getGlobalSettings();
    osdEnabled = globalSettings.showOSD;
    osdDuration = globalSettings.osdDurationMs;

    // Load saved settings
    const settings = await getDomainSettings(domain);
    currentVolume = settings.volume;

    // Only apply on load if autoApply is enabled
    const shouldAutoApply = settings.autoApply || globalSettings.autoApplyAllByDefault;

    console.log(
      `[VolumeHero] Domain: ${domain}, AutoApply: ${shouldAutoApply}, Volume: ${Math.round(
        currentVolume * 100
      )}%`
    );

    // Setup media detection callback
    onMediaDetected((element) => {
      if (shouldAutoApply || hasManuallyApplied) {
        applyVolumeToMedia(element, currentVolume);
      }
    });

    // Wait for DOM to be ready before processing
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        initializeMediaObserver(shouldAutoApply);
      });
    } else {
      initializeMediaObserver(shouldAutoApply);
    }

    // Listen for messages from popup
    browser.runtime.onMessage.addListener(handleMessage);
  },
});

/**
 * Initialize media observer
 * @param shouldApply - Whether to apply volume immediately
 */
function initializeMediaObserver(shouldApply: boolean): void {
  if (shouldApply) {
    // Process existing elements
    processExistingMedia();
  }

  // Start observing for new elements
  startObserving();
}

/**
 * Handle messages from popup or background script
 * @param message - Message object
 * @returns Response or undefined
 */
function handleMessage(
  message: { type: string; volume?: number; showOsd?: boolean },
  _sender: unknown,
  _sendResponse: (response?: unknown) => void
): boolean {
  console.log("[VolumeHero] Received message:", message);

  if (message.type === "APPLY_VOLUME" && typeof message.volume === "number") {
    currentVolume = message.volume;
    hasManuallyApplied = true;

    // Apply to all existing media elements
    const mediaElements = getAllMediaElements();
    mediaElements.forEach((element) => {
      applyVolumeToMedia(element, currentVolume);
    });

    // Only show the on-page OSD when explicitly requested (keyboard/global
    // shortcuts). Popup-driven changes already show the volume in the popup.
    if (osdEnabled && message.showOsd === true) {
      showVolumeOSD(Math.round(currentVolume * 100), false, osdDuration);
    }

    console.log(
      `[VolumeHero] Applied volume ${Math.round(currentVolume * 100)}% to ${
        mediaElements.length
      } elements`
    );
    return true;
  }

  if (message.type === "GET_VOLUME") {
    _sendResponse({ volume: currentVolume });
    return true;
  }

  if (message.type === "GET_MEDIA_INFO") {
    const mediaInfo = getAllMediaInfo();
    _sendResponse({ mediaInfo });
    return true;
  }

  return false;
}
