/**
 * Media Observer module for Volume Hero extension
 * Detects and monitors media elements on the page using MutationObserver
 */

import { getAllMediaElements, isElementProcessed } from "@/utils/volume";

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

  // Descend into open shadow roots, which querySelectorAll does not cross.
  // Players built as web components keep their <video> there, so without this
  // they are only found if they happen to exist at the initial page scan.
  if (element.shadowRoot) {
    observeShadowRoot(element.shadowRoot);
  }
  for (const descendant of element.querySelectorAll("*")) {
    if (descendant.shadowRoot) observeShadowRoot(descendant.shadowRoot);
  }
}

/** Roots already under observation, so each is only wired up once. */
const observedRoots = new WeakSet<ShadowRoot>();

/**
 * Scan a shadow root for media and keep watching it for later additions.
 * A MutationObserver on the document does not see mutations inside a shadow
 * root, so each one needs its own observer.
 */
function observeShadowRoot(root: ShadowRoot): void {
  if (observedRoots.has(root)) return;
  observedRoots.add(root);

  for (const mediaEl of root.querySelectorAll("video, audio")) {
    if (isMediaElement(mediaEl)) notifyCallbacks(mediaEl);
  }

  for (const element of root.querySelectorAll("*")) {
    if (element.shadowRoot) observeShadowRoot(element.shadowRoot);
  }

  const shadowObserver = new MutationObserver(handleMutations);
  shadowObserver.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset"],
  });
  shadowObservers.push(shadowObserver);
}

/** Observers created for shadow roots, disconnected alongside the main one. */
const shadowObservers: MutationObserver[] = [];

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

  // Open shadow roots that already exist at start-up.
  for (const element of document.querySelectorAll("*")) {
    if (element.shadowRoot) observeShadowRoot(element.shadowRoot);
  }
}

/**
 * Stop observing the DOM
 */
export function stopObserving(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  for (const shadowObserver of shadowObservers) {
    shadowObserver.disconnect();
  }
  shadowObservers.length = 0;
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

  mediaElements.forEach((element) => {
    notifyCallbacks(element);
  });
}
