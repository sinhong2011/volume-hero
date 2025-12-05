/**
 * Content script for Volume Hero extension
 * Handles media element detection and volume application
 */

import {
  onMediaDetected,
  processExistingMedia,
  startObserving,
} from "@/content/media-observer";
import { extractDomain, getDomainSettings } from "@/utils/storage";
import {
  applyVolumeToMedia,
  getAllMediaElements,
  getAllMediaInfo,
} from "@/utils/volume";

let currentVolume = 1.0;
let isInitialized = false;

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

    // Load saved settings
    const settings = await getDomainSettings(domain);
    currentVolume = settings.volume;

    // Only apply on load if autoApply is enabled
    const shouldAutoApply = settings.autoApply;

    console.log(
      `[VolumeHero] Domain: ${domain}, AutoApply: ${shouldAutoApply}, Volume: ${Math.round(
        currentVolume * 100
      )}%`
    );

    // Setup media detection callback
    onMediaDetected((element) => {
      if (shouldAutoApply || isInitialized) {
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
  isInitialized = true;
}

/**
 * Handle messages from popup or background script
 * @param message - Message object
 * @returns Response or undefined
 */
function handleMessage(
  message: { type: string; volume?: number },
  _sender: unknown,
  _sendResponse: (response?: unknown) => void
): boolean {
  console.log("[VolumeHero] Received message:", message);

  if (message.type === "APPLY_VOLUME" && typeof message.volume === "number") {
    currentVolume = message.volume;

    // Apply to all existing media elements
    const mediaElements = getAllMediaElements();
    mediaElements.forEach((element) => {
      applyVolumeToMedia(element, currentVolume);
    });

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
