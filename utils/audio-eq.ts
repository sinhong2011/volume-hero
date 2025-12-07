/**
 * Audio Equalizer utilities for Volume Hero extension
 * Provides bass and treble boost using Web Audio API BiquadFilters
 */

// Store filter references per media element
const bassFilterMap = new WeakMap<HTMLMediaElement, BiquadFilterNode>();
const trebleFilterMap = new WeakMap<HTMLMediaElement, BiquadFilterNode>();
const eqAudioContextMap = new WeakMap<HTMLMediaElement, AudioContext>();
const eqSourceNodeMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
const eqGainNodeMap = new WeakMap<HTMLMediaElement, GainNode>();

export interface EQSettings {
  bassBoost: number; // -12 to 12 dB
  trebleBoost: number; // -12 to 12 dB
}

/**
 * Get or create EQ filter chain for a media element
 * Note: This integrates with the existing volume.ts audio chain
 */
export function setupEQChain(
  mediaElement: HTMLMediaElement,
  audioContext: AudioContext,
  sourceNode: MediaElementAudioSourceNode,
  gainNode: GainNode
): { bassFilter: BiquadFilterNode; trebleFilter: BiquadFilterNode } {
  let bassFilter = bassFilterMap.get(mediaElement);
  let trebleFilter = trebleFilterMap.get(mediaElement);

  if (!bassFilter || !trebleFilter) {
    // Create bass filter (lowshelf)
    bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 200; // Frequency below which bass boost applies
    bassFilter.gain.value = 0;
    bassFilterMap.set(mediaElement, bassFilter);

    // Create treble filter (highshelf)
    trebleFilter = audioContext.createBiquadFilter();
    trebleFilter.type = "highshelf";
    trebleFilter.frequency.value = 3000; // Frequency above which treble boost applies
    trebleFilter.gain.value = 0;
    trebleFilterMap.set(mediaElement, trebleFilter);

    // Reconnect the audio chain: source -> bass -> treble -> gain -> destination
    sourceNode.disconnect();
    gainNode.disconnect();

    sourceNode.connect(bassFilter);
    bassFilter.connect(trebleFilter);
    trebleFilter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    eqAudioContextMap.set(mediaElement, audioContext);
    eqSourceNodeMap.set(mediaElement, sourceNode);
    eqGainNodeMap.set(mediaElement, gainNode);
  }

  return { bassFilter, trebleFilter };
}

/**
 * Apply EQ settings to a media element
 */
export function applyEQToMedia(mediaElement: HTMLMediaElement, settings: EQSettings): void {
  const bassFilter = bassFilterMap.get(mediaElement);
  const trebleFilter = trebleFilterMap.get(mediaElement);

  if (bassFilter) {
    // Clamp bass boost to valid range
    const bassGain = Math.max(-12, Math.min(12, settings.bassBoost));
    bassFilter.gain.value = bassGain;
  }

  if (trebleFilter) {
    // Clamp treble boost to valid range
    const trebleGain = Math.max(-12, Math.min(12, settings.trebleBoost));
    trebleFilter.gain.value = trebleGain;
  }
}

/**
 * Get current EQ settings for a media element
 */
export function getMediaEQSettings(mediaElement: HTMLMediaElement): EQSettings | null {
  const bassFilter = bassFilterMap.get(mediaElement);
  const trebleFilter = trebleFilterMap.get(mediaElement);

  if (!bassFilter || !trebleFilter) {
    return null;
  }

  return {
    bassBoost: bassFilter.gain.value,
    trebleBoost: trebleFilter.gain.value,
  };
}

/**
 * Reset EQ to flat (no boost)
 */
export function resetEQ(mediaElement: HTMLMediaElement): void {
  applyEQToMedia(mediaElement, { bassBoost: 0, trebleBoost: 0 });
}

/**
 * Check if EQ is set up for a media element
 */
export function hasEQSetup(mediaElement: HTMLMediaElement): boolean {
  return bassFilterMap.has(mediaElement) && trebleFilterMap.has(mediaElement);
}

/**
 * Preset EQ configurations
 */
export const EQ_PRESETS = {
  flat: { bassBoost: 0, trebleBoost: 0 },
  bass_boost: { bassBoost: 6, trebleBoost: 0 },
  treble_boost: { bassBoost: 0, trebleBoost: 6 },
  vocal_clarity: { bassBoost: -3, trebleBoost: 4 },
  movie: { bassBoost: 4, trebleBoost: 2 },
  music: { bassBoost: 3, trebleBoost: 3 },
} as const;

export type EQPresetName = keyof typeof EQ_PRESETS;

/**
 * Apply an EQ preset
 */
export function applyEQPreset(mediaElement: HTMLMediaElement, presetName: EQPresetName): void {
  const preset = EQ_PRESETS[presetName];
  applyEQToMedia(mediaElement, preset);
}
