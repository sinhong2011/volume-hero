/**
 * Content script for Volume Hero extension
 * Handles media element detection and volume application
 */

import { onMediaDetected, processExistingMedia, startObserving } from "@/content/media-observer";
import { type EQSettings, FLAT_EQ } from "@/utils/audio-eq";
import { showVolumeOSD } from "@/utils/osd";
import {
  extractDomain,
  getDomainSettings,
  getGlobalSettings,
  isDomainAllowed,
} from "@/utils/storage";
import {
  applyEQToMedia,
  applyVolumeToMedia,
  getAllMediaElements,
  getAllMediaInfo,
} from "@/utils/volume";

let currentVolume = 1.0;
let currentEQ: EQSettings = { ...FLAT_EQ };
let hasManuallyApplied = false;
let osdEnabled = true;
let osdDuration = 1500;

/** Apply the current volume and EQ to one element, in that order. */
function applySettingsToElement(element: HTMLMediaElement): void {
  applyEQToMedia(element, currentEQ);
  applyVolumeToMedia(element, currentVolume);
}

/** True only in the page's top-level document. */
const isTopFrame = window.top === window;

/**
 * Resolve which site's settings apply to this frame.
 *
 * The script runs in every frame, and a sub-frame's own URL is the *player's*
 * origin (youtube.com inside example.com), not the site the user is actually
 * on. Per-site settings are keyed by the address-bar domain, so a sub-frame
 * asks the background, which reads it from `sender.tab.url`. Cross-origin
 * frames cannot determine this on their own at all.
 */
async function resolveDomain(): Promise<string> {
  if (isTopFrame) return extractDomain(window.location.href);
  try {
    const response = await browser.runtime.sendMessage({ type: "GET_FRAME_DOMAIN" });
    return response?.domain ?? "";
  } catch {
    return "";
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  // Embedded players (Bilibili Live, YouTube/Twitch embeds) live in frames.
  // Running only in the top document meant their media was never reachable.
  allFrames: true,
  // srcdoc/about:blank frames inherit their parent's origin and are used by
  // several players; without this they get no content script.
  matchAboutBlank: true,

  async main() {
    const domain = await resolveDomain();
    if (!domain) return;

    // Check if domain is allowed (respects both blacklist and whitelist)
    const allowed = await isDomainAllowed(domain);
    if (!allowed) return;

    // Load global settings for OSD
    const globalSettings = await getGlobalSettings();
    osdEnabled = globalSettings.showOSD;
    osdDuration = globalSettings.osdDurationMs;

    // Load saved settings
    const settings = await getDomainSettings(domain);
    currentVolume = settings.volume;
    currentEQ = {
      bassBoost: settings.bassBoost ?? 0,
      trebleBoost: settings.trebleBoost ?? 0,
    };

    // Only apply on load if autoApply is enabled
    const shouldAutoApply = settings.autoApply || globalSettings.autoApplyAllByDefault;

    // Setup media detection callback
    onMediaDetected((element) => {
      if (shouldAutoApply || hasManuallyApplied) {
        applySettingsToElement(element);
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
  message: { type: string; volume?: number; showOsd?: boolean; eq?: EQSettings },
  _sender: unknown,
  sendResponse: (response?: unknown) => void
): boolean {
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
    // Restricted to the top frame so a page with several player frames shows
    // one OSD rather than one per frame.
    if (osdEnabled && message.showOsd === true && isTopFrame) {
      showVolumeOSD(Math.round(currentVolume * 100), false, osdDuration);
    }

    // Answer synchronously. Returning true without ever calling sendResponse
    // leaves the sender's message channel open until it times out.
    sendResponse({ ok: true, applied: mediaElements.length });
    return false;
  }

  if (message.type === "APPLY_EQ" && message.eq) {
    currentEQ = message.eq;
    hasManuallyApplied = true;

    const mediaElements = getAllMediaElements();
    mediaElements.forEach((element) => {
      applyEQToMedia(element, currentEQ);
    });

    sendResponse({ ok: true, applied: mediaElements.length });
    return false;
  }

  if (message.type === "GET_VOLUME") {
    sendResponse({ volume: currentVolume, eq: currentEQ });
    return false;
  }

  if (message.type === "GET_MEDIA_INFO") {
    const mediaInfo = getAllMediaInfo();
    sendResponse({ mediaInfo });
    return false;
  }

  return false;
}
