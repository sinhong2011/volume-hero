/**
 * Audio Equalizer types and presets for Volume Hero extension
 *
 * The filter nodes themselves live in the single audio chain owned by
 * `utils/volume.ts` — `createMediaElementSource()` may only be called once per
 * element, so there can only be one chain builder. This module holds the shape
 * of the settings and the presets offered in the UI.
 */

export interface EQSettings {
  bassBoost: number; // -12 to 12 dB
  trebleBoost: number; // -12 to 12 dB
}

export const FLAT_EQ: EQSettings = { bassBoost: 0, trebleBoost: 0 };

/** Whether an EQ setting is a no-op, and so does not require an audio chain. */
export function isFlatEQ(settings: EQSettings): boolean {
  return settings.bassBoost === 0 && settings.trebleBoost === 0;
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
} as const satisfies Record<string, EQSettings>;

export type EQPresetName = keyof typeof EQ_PRESETS;

/** Match a set of EQ values back to a preset name, if one fits exactly. */
export function matchEQPreset(settings: EQSettings): EQPresetName | null {
  const entries = Object.entries(EQ_PRESETS) as [EQPresetName, EQSettings][];
  const found = entries.find(
    ([, preset]) =>
      preset.bassBoost === settings.bassBoost && preset.trebleBoost === settings.trebleBoost
  );
  return found?.[0] ?? null;
}
