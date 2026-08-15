import { describe, expect, test } from "bun:test";
import { EQ_PRESETS, type EQSettings, FLAT_EQ, isFlatEQ, matchEQPreset } from "./audio-eq";

describe("isFlatEQ", () => {
  test("treats the flat preset as flat", () => {
    expect(isFlatEQ(FLAT_EQ)).toBe(true);
    expect(isFlatEQ(EQ_PRESETS.flat)).toBe(true);
  });

  test("detects a non-zero band", () => {
    expect(isFlatEQ({ bassBoost: 3, trebleBoost: 0 })).toBe(false);
    expect(isFlatEQ({ bassBoost: 0, trebleBoost: -2 })).toBe(false);
  });

  test("negative cut is not flat", () => {
    // A cut still requires the audio chain, so it must not be reported flat.
    expect(isFlatEQ(EQ_PRESETS.vocal_clarity)).toBe(false);
  });
});

describe("matchEQPreset", () => {
  test("round-trips every preset", () => {
    for (const [name, preset] of Object.entries(EQ_PRESETS)) {
      expect(matchEQPreset(preset)).toBe(name as keyof typeof EQ_PRESETS);
    }
  });

  test("returns null for custom values", () => {
    expect(matchEQPreset({ bassBoost: 5, trebleBoost: 5 })).toBeNull();
  });
});

describe("EQ preset bounds", () => {
  test("every preset stays within the -12..12 dB range the UI allows", () => {
    for (const preset of Object.values(EQ_PRESETS) as EQSettings[]) {
      expect(preset.bassBoost).toBeGreaterThanOrEqual(-12);
      expect(preset.bassBoost).toBeLessThanOrEqual(12);
      expect(preset.trebleBoost).toBeGreaterThanOrEqual(-12);
      expect(preset.trebleBoost).toBeLessThanOrEqual(12);
    }
  });
});
