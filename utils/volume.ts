/**
 * Volume control utilities for Volume Hero extension
 * Handles native volume and Web Audio API gain for volume boost beyond 100%
 */

// Store AudioContext and GainNode references per media element
const audioContextMap = new WeakMap<HTMLMediaElement, AudioContext>();
const gainNodeMap = new WeakMap<HTMLMediaElement, GainNode>();
const sourceNodeMap = new WeakMap<
  HTMLMediaElement,
  MediaElementAudioSourceNode
>();
const processedElements = new WeakSet<HTMLMediaElement>();

/**
 * Calculate the gain value for Web Audio API
 * @param volume - Volume level (0.0 to 6.0)
 * @returns Gain value for GainNode
 */
export function calculateGainValue(volume: number): number {
  // Clamp volume between 0 and 6
  return Math.max(0, Math.min(6, volume));
}

/**
 * Create or get existing AudioContext for a media element
 * @param mediaElement - The HTML media element
 * @returns AudioContext instance
 */
export function createAudioContext(
  mediaElement: HTMLMediaElement
): AudioContext {
  let audioContext = audioContextMap.get(mediaElement);

  if (!audioContext) {
    audioContext = new AudioContext();
    audioContextMap.set(mediaElement, audioContext);
  }

  return audioContext;
}

/**
 * Setup Web Audio API gain node for volume boost beyond 100%
 * @param mediaElement - The HTML media element
 * @param audioContext - The AudioContext instance
 * @returns GainNode instance
 */
function setupGainNode(
  mediaElement: HTMLMediaElement,
  audioContext: AudioContext
): GainNode {
  let gainNode = gainNodeMap.get(mediaElement);
  let sourceNode = sourceNodeMap.get(mediaElement);

  if (!gainNode || !sourceNode) {
    // Create source node from media element (can only be done once per element)
    sourceNode = audioContext.createMediaElementSource(mediaElement);
    sourceNodeMap.set(mediaElement, sourceNode);

    // Create gain node
    gainNode = audioContext.createGain();
    gainNodeMap.set(mediaElement, gainNode);

    // Connect: source → gain → destination
    sourceNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
  }

  return gainNode;
}

/**
 * Apply volume to a media element
 * For volumes > 1.0, uses Web Audio API gain node
 * @param mediaElement - The HTML media element
 * @param volumeLevel - Volume level (0.0 to 6.0)
 */
export function applyVolumeToMedia(
  mediaElement: HTMLMediaElement,
  volumeLevel: number
): void {
  try {
    // Clamp volume to valid range
    const clampedVolume = Math.max(0, Math.min(6, volumeLevel));

    if (clampedVolume <= 1.0) {
      // For volume <= 100%, use native volume property
      mediaElement.volume = clampedVolume;

      // If we have a gain node, reset it to 1.0
      const gainNode = gainNodeMap.get(mediaElement);
      if (gainNode) {
        gainNode.gain.value = 1.0;
      }
    } else {
      // For volume > 100%, use Web Audio API
      // Set native volume to max
      mediaElement.volume = 1.0;

      // Create/get audio context and gain node
      const audioContext = createAudioContext(mediaElement);

      // Resume audio context if suspended (required by browsers)
      if (audioContext.state === "suspended") {
        audioContext.resume().catch((err) => {
          console.error("[VolumeHero] Failed to resume AudioContext:", err);
        });
      }

      const gainNode = setupGainNode(mediaElement, audioContext);

      // Set gain value for boost
      gainNode.gain.value = clampedVolume;
    }

    // Mark element as processed
    processedElements.add(mediaElement);

    console.log(
      `[VolumeHero] Applied volume ${Math.round(
        clampedVolume * 100
      )}% to media element`
    );
  } catch (error) {
    console.error("[VolumeHero] Failed to apply volume:", error);
  }
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
  const videos = Array.from(document.querySelectorAll("video"));
  const audios = Array.from(document.querySelectorAll("audio"));
  return [...videos, ...audios];
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
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
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
