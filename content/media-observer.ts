/**
 * Media Observer module for Volume Hero extension
 * Detects and monitors media elements on the page using MutationObserver
 */

import { applyVolumeToMedia, getAllMediaElements, isElementProcessed } from "@/utils/volume";

type MediaCallback = (element: HTMLMediaElement) => void;

let observer: MutationObserver | null = null;
let mediaCallbacks: MediaCallback[] = [];

/**
 * Check if an element is a media element
 * @param element - DOM element to check
 * @returns Whether the element is a video or audio element
 */
function isMediaElement(element: Element): element is HTMLMediaElement {
  return element.tagName === "VIDEO" || element.tagName === "AUDIO";
}

/**
 * Process a single element and its descendants for media elements
 * @param element - Element to process
 */
function processElement(element: Element): void {
  // Check if the element itself is a media element
  if (isMediaElement(element)) {
    notifyCallbacks(element);
  }

  // Check descendants for media elements
  const mediaElements = element.querySelectorAll("video, audio");
  mediaElements.forEach((mediaEl) => {
    if (isMediaElement(mediaEl)) {
      notifyCallbacks(mediaEl);
    }
  });
}

/**
 * Notify all registered callbacks about a new media element
 * @param element - Media element to notify about
 */
function notifyCallbacks(element: HTMLMediaElement): void {
  if (isElementProcessed(element)) {
    return;
  }

  mediaCallbacks.forEach((callback) => {
    try {
      callback(element);
    } catch (error) {
      console.error("[VolumeHero] Media callback error:", error);
    }
  });
}

/**
 * MutationObserver callback handler
 * @param mutations - List of mutations
 */
function handleMutations(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    // Handle added nodes
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processElement(node as Element);
        }
      });
    }

    // Handle attribute changes (src, srcset changes)
    if (mutation.type === "attributes") {
      const target = mutation.target;
      if (target.nodeType === Node.ELEMENT_NODE && isMediaElement(target as Element)) {
        notifyCallbacks(target as HTMLMediaElement);
      }
    }
  }
}

/**
 * Start observing the DOM for media elements
 */
export function startObserving(): void {
  if (observer) {
    return; // Already observing
  }

  observer = new MutationObserver(handleMutations);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset"],
  });

  console.log("[VolumeHero] Started observing DOM for media elements");
}

/**
 * Stop observing the DOM
 */
export function stopObserving(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
    console.log("[VolumeHero] Stopped observing DOM");
  }
}

/**
 * Register a callback to be called when new media elements are detected
 * @param callback - Function to call with new media elements
 */
export function onMediaDetected(callback: MediaCallback): void {
  mediaCallbacks.push(callback);
}

/**
 * Remove a registered callback
 * @param callback - Function to remove
 */
export function offMediaDetected(callback: MediaCallback): void {
  mediaCallbacks = mediaCallbacks.filter((cb) => cb !== callback);
}

/**
 * Process all existing media elements on the page
 */
export function processExistingMedia(): void {
  const mediaElements = getAllMediaElements();
  console.log(`[VolumeHero] Found ${mediaElements.length} existing media elements`);

  mediaElements.forEach((element) => {
    notifyCallbacks(element);
  });
}

/**
 * Initialize media observer with volume application
 * @param volumeLevel - Volume level to apply (0.0 to 3.0)
 */
export function initializeWithVolume(volumeLevel: number): void {
  onMediaDetected((element) => {
    applyVolumeToMedia(element, volumeLevel);
  });

  // Process existing elements first
  processExistingMedia();

  // Start observing for new elements
  startObserving();
}
