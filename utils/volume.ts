/**
 * Volume control utilities for Volume Hero extension
 * Handles native volume and Web Audio API gain for volume boost beyond 100%
 */

import { type EQSettings, isFlatEQ } from "./audio-eq";

export const MAX_VOLUME = 6;

/**
 * The Web Audio chain built for a boosted element.
 *
 * `createMediaElementSource()` can only be called once per element and
 * permanently reroutes its audio, so the whole chain is created together, once,
 * and reused. Nodes are always connected in this order:
 *
 *   source → bass → treble → gain → limiter → destination
 *
 * The EQ filters sit before the gain so their boost is amplified with the
 * signal, and the limiter sits last so it catches whatever the gain produces.
 */
interface AudioChain {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  bass: BiquadFilterNode;
  treble: BiquadFilterNode;
  gain: GainNode;
  limiter: DynamicsCompressorNode;
}

const chainMap = new WeakMap<HTMLMediaElement, AudioChain>();
const processedElements = new WeakSet<HTMLMediaElement>();

/** Last EQ requested per element, so re-applying volume keeps the EQ. */
const eqMap = new WeakMap<HTMLMediaElement, EQSettings>();

/**
 * Ramp time for gain changes. Assigning `gain.value` directly steps the signal
 * discontinuously, which is audible as a click or pop while dragging the
 * slider; a short exponential approach removes it without perceptible lag.
 */
const GAIN_RAMP_SECONDS = 0.03;

/**
 * Calculate the gain value for Web Audio API
 * @param volume - Volume level (0.0 to 6.0)
 * @returns Gain value for GainNode
 */
export function calculateGainValue(volume: number): number {
  // Math.min/Math.max propagate NaN, and assigning NaN to an AudioParam throws.
  // Fall back to unity so a malformed stored value can never break playback.
  if (!Number.isFinite(volume)) return 1;
  return Math.max(0, Math.min(MAX_VOLUME, volume));
}

/**
 * Build (or fetch) the audio chain for an element.
 *
 * Returns null when the chain cannot be created — most commonly because the
 * media is cross-origin without CORS headers, where routing through Web Audio
 * would output silence. In that case the caller falls back to native volume.
 */
function getOrCreateChain(mediaElement: HTMLMediaElement): AudioChain | null {
  const existing = chainMap.get(mediaElement);
  if (existing) return existing;

  try {
    const context = new AudioContext();
    const source = context.createMediaElementSource(mediaElement);

    const bass = context.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 200;
    bass.gain.value = 0;

    const treble = context.createBiquadFilter();
    treble.type = "highshelf";
    treble.frequency.value = 3000;
    treble.gain.value = 0;

    const gain = context.createGain();
    gain.gain.value = 1;

    // Catch the peaks that boosting past 100% would otherwise clip into hard
    // distortion. The soft knee and fast release keep speech and music intact
    // while making high boost levels usable rather than merely loud.
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;

    source.connect(bass);
    bass.connect(treble);
    treble.connect(gain);
    gain.connect(limiter);
    limiter.connect(context.destination);

    const chain: AudioChain = { context, source, bass, treble, gain, limiter };
    chainMap.set(mediaElement, chain);
    return chain;
  } catch (error) {
    // Typically a cross-origin element without CORS headers.
    console.error("[VolumeHero] Could not create audio chain:", error);
    return null;
  }
}

/** Smoothly move an AudioParam to a target value. */
function rampTo(param: AudioParam, value: number, context: AudioContext): void {
  const now = context.currentTime;
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value, now, GAIN_RAMP_SECONDS);
}

/** Resume a context that the browser suspended pending user interaction. */
function resumeIfSuspended(context: AudioContext): void {
  if (context.state === "suspended") {
    context.resume().catch((err) => {
      console.error("[VolumeHero] Failed to resume AudioContext:", err);
    });
  }
}

/**
 * Apply volume to a media element
 * For volumes > 1.0, uses Web Audio API gain node
 * @param mediaElement - The HTML media element
 * @param volumeLevel - Volume level (0.0 to 6.0)
 */
export function applyVolumeToMedia(mediaElement: HTMLMediaElement, volumeLevel: number): void {
  try {
    const clampedVolume = calculateGainValue(volumeLevel);
    const eq = eqMap.get(mediaElement);
    const needsChain = clampedVolume > 1.0 || (eq !== undefined && !isFlatEQ(eq));
    const existingChain = chainMap.get(mediaElement);

    // Only build the Web Audio chain when it is actually needed: creating it is
    // irreversible for the element, so plain playback should never pay for it.
    if (!needsChain && !existingChain) {
      mediaElement.volume = clampedVolume;
      processedElements.add(mediaElement);
      return;
    }

    const chain = existingChain ?? getOrCreateChain(mediaElement);
    if (!chain) {
      // Chain unavailable (e.g. cross-origin): degrade to native volume, which
      // still covers everything up to 100%.
      mediaElement.volume = Math.min(1, clampedVolume);
      processedElements.add(mediaElement);
      return;
    }

    // Native volume stays at unity once the chain exists; the gain node is the
    // single place volume is controlled, so the two never fight each other.
    mediaElement.volume = 1.0;
    rampTo(chain.gain.gain, clampedVolume, chain.context);
    resumeIfSuspended(chain.context);

    processedElements.add(mediaElement);
  } catch (error) {
    console.error("[VolumeHero] Failed to apply volume:", error);
  }
}

/**
 * Apply equalizer settings to a media element.
 *
 * Building the chain is deferred until the EQ is actually non-flat, so enabling
 * the feature costs nothing for users who leave it at its defaults.
 */
export function applyEQToMedia(mediaElement: HTMLMediaElement, settings: EQSettings): void {
  eqMap.set(mediaElement, settings);

  const existingChain = chainMap.get(mediaElement);
  if (!existingChain && isFlatEQ(settings)) return;

  const chain = existingChain ?? getOrCreateChain(mediaElement);
  if (!chain) return;

  rampTo(chain.bass.gain, Math.max(-12, Math.min(12, settings.bassBoost)), chain.context);
  rampTo(chain.treble.gain, Math.max(-12, Math.min(12, settings.trebleBoost)), chain.context);
  resumeIfSuspended(chain.context);
}

/** Read back the EQ currently applied to an element. */
export function getMediaEQSettings(mediaElement: HTMLMediaElement): EQSettings | null {
  const chain = chainMap.get(mediaElement);
  if (!chain) return eqMap.get(mediaElement) ?? null;
  return { bassBoost: chain.bass.gain.value, trebleBoost: chain.treble.gain.value };
}

/**
 * Check if a media element has been processed
 * @param mediaElement - The HTML media element
 * @returns Whether the element has been processed
 */
export function isElementProcessed(mediaElement: HTMLMediaElement): boolean {
  return processedElements.has(mediaElement);
}

/**
 * Reset volume to default (100%) for a media element
 * @param mediaElement - The HTML media element
 */
export function resetVolume(mediaElement: HTMLMediaElement): void {
  applyVolumeToMedia(mediaElement, 1.0);
}

/**
 * Get all media elements on the page
 * @returns Array of HTMLMediaElement
 */
export function getAllMediaElements(): HTMLMediaElement[] {
  return collectMediaElements(document);
}

/**
 * Collect media elements from a root, descending into open shadow roots.
 *
 * A plain `querySelectorAll` does not cross a shadow boundary, which is why
 * media stayed unboosted on sites whose player is a web component.
 *
 * Frames are deliberately *not* traversed here: the content script runs in
 * every frame, so each one owns the media in its own document. Reaching across
 * would have two documents racing to build a chain on the same element, and
 * `createMediaElementSource` only permits one — the loser would silently fall
 * back to native volume and cap the boost at 100%.
 */
export function collectMediaElements(root: Document | ShadowRoot): HTMLMediaElement[] {
  const found: HTMLMediaElement[] = [];
  const seen = new Set<HTMLMediaElement>();

  const add = (element: HTMLMediaElement) => {
    if (seen.has(element)) return;
    seen.add(element);
    found.push(element);
  };

  const walk = (node: Document | ShadowRoot) => {
    for (const element of node.querySelectorAll<HTMLMediaElement>("video, audio")) {
      add(element);
    }

    // Descend into any open shadow roots below this node.
    for (const element of node.querySelectorAll("*")) {
      const shadow = element.shadowRoot;
      if (shadow) walk(shadow);
    }
  };

  walk(root);
  return found;
}

/**
 * Video/Audio information interface
 */
export interface MediaInfo {
  type: "video" | "audio";
  src: string;
  currentSrc: string;
  duration: number;
  currentTime: number;
  paused: boolean;
  muted: boolean;
  volume: number;
  playbackRate: number;
  // Video-specific properties
  videoWidth?: number;
  videoHeight?: number;
  // Readyness
  readyState: number;
  networkState: number;
}

/**
 * Tab-level media information interface
 * Contains info about a tab that has playing media
 */
export interface TabMediaInfo {
  tabId: number;
  title: string;
  favicon: string;
  url: string;
  mediaInfo: MediaInfo[];
  isActive: boolean;
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Extract information from a media element
 * @param mediaElement - The HTML media element
 * @returns MediaInfo object
 */
export function getMediaInfo(mediaElement: HTMLMediaElement): MediaInfo {
  const isVideo = mediaElement.tagName === "VIDEO";
  const videoEl = mediaElement as HTMLVideoElement;

  return {
    type: isVideo ? "video" : "audio",
    src: mediaElement.src || "",
    currentSrc: mediaElement.currentSrc || "",
    duration: mediaElement.duration || 0,
    currentTime: mediaElement.currentTime || 0,
    paused: mediaElement.paused,
    muted: mediaElement.muted,
    volume: mediaElement.volume,
    playbackRate: mediaElement.playbackRate,
    videoWidth: isVideo ? videoEl.videoWidth : undefined,
    videoHeight: isVideo ? videoEl.videoHeight : undefined,
    readyState: mediaElement.readyState,
    networkState: mediaElement.networkState,
  };
}

/**
 * Get information for all media elements on the page
 * @returns Array of MediaInfo objects
 */
export function getAllMediaInfo(): MediaInfo[] {
  const mediaElements = getAllMediaElements();
  return mediaElements.map(getMediaInfo);
}
