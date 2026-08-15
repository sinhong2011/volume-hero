import { describe, expect, test } from "bun:test";
import { calculateGainValue, formatDuration, MAX_VOLUME } from "./volume";

describe("calculateGainValue", () => {
  test("passes through values inside the range", () => {
    expect(calculateGainValue(0)).toBe(0);
    expect(calculateGainValue(1)).toBe(1);
    expect(calculateGainValue(2.5)).toBe(2.5);
    expect(calculateGainValue(MAX_VOLUME)).toBe(MAX_VOLUME);
  });

  test("clamps out-of-range input rather than trusting the caller", () => {
    expect(calculateGainValue(-1)).toBe(0);
    expect(calculateGainValue(99)).toBe(MAX_VOLUME);
  });

  test("falls back to unity for non-finite input", () => {
    // Assigning NaN to an AudioParam throws, so a corrupt stored volume must
    // degrade to normal playback rather than breaking audio entirely.
    expect(calculateGainValue(Number.NaN)).toBe(1);
    expect(calculateGainValue(Number.POSITIVE_INFINITY)).toBe(1);
    expect(calculateGainValue(Number.NEGATIVE_INFINITY)).toBe(1);
  });
});

describe("formatDuration", () => {
  test("formats under an hour as M:SS", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(599)).toBe("9:59");
  });

  test("formats an hour or more as H:MM:SS", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  test("returns a placeholder for values media elements report before load", () => {
    expect(formatDuration(Number.NaN)).toBe("--:--");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("--:--");
    expect(formatDuration(-1)).toBe("--:--");
  });
});
