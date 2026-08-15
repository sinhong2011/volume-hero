import { beforeAll, describe, expect, test } from "bun:test";

/**
 * `utils/storage.ts` touches the `browser.*` extension APIs at module scope
 * (it registers a storage.onChanged listener), so a minimal stub is installed
 * before importing it. Only the allowlist logic is under test here.
 */
beforeAll(() => {
  (globalThis as Record<string, unknown>).browser = {
    storage: {
      local: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      sync: { get: async () => ({}), set: async () => {} },
      session: { get: async () => ({}), set: async () => {} },
      onChanged: { addListener: () => {} },
    },
  };
});

describe("storage.sync allowlist", () => {
  test("never mirrors cloud credentials", async () => {
    const { pickSyncedSettings, SYNCED_SETTING_KEYS } = await import("./storage");

    expect(SYNCED_SETTING_KEYS).not.toContain("cloudSync");

    const settings = {
      language: "en",
      defaultVolume: 1,
      maxVolumeLimit: 6,
      volumeStepSize: 0.1,
      defaultBassBoost: 0,
      defaultTrebleBoost: 0,
      keyboardShortcuts: {},
      blacklistedDomains: [],
      whitelistedDomains: [],
      compactMode: false,
      showOtherTabsSection: true,
      showOSD: true,
      osdDurationMs: 1500,
      autoApplyAllByDefault: false,
      showBadge: true,
      volumePreferenceMode: "saved",
      cloudSync: {
        provider: "s3",
        webdav: { password: "SECRET-WEBDAV" },
        s3: { accessKeyId: "SECRET-AKID", secretAccessKey: "SECRET-SAK" },
      },
      statistics: { totalSitesBoosted: 42 },
    } as never;

    const picked = pickSyncedSettings(settings);
    const serialised = JSON.stringify(picked);

    for (const secret of ["SECRET-WEBDAV", "SECRET-AKID", "SECRET-SAK"]) {
      expect(serialised).not.toContain(secret);
    }
    expect(picked).not.toHaveProperty("cloudSync");
  });

  test("never mirrors device-local statistics", async () => {
    const { pickSyncedSettings, SYNCED_SETTING_KEYS } = await import("./storage");
    expect(SYNCED_SETTING_KEYS).not.toContain("statistics");
    const picked = pickSyncedSettings({ statistics: { totalSitesBoosted: 42 } } as never);
    expect(picked).not.toHaveProperty("statistics");
  });

  test("carries the preferences a user expects to follow them", async () => {
    const { SYNCED_SETTING_KEYS } = await import("./storage");
    for (const key of [
      "language",
      "maxVolumeLimit",
      "volumeStepSize",
      "keyboardShortcuts",
      "blacklistedDomains",
      "whitelistedDomains",
      "showOSD",
      "showBadge",
    ]) {
      expect(SYNCED_SETTING_KEYS).toContain(key as never);
    }
  });

  test("stays well inside the 8KB per-item sync quota", async () => {
    const { pickSyncedSettings } = await import("./storage");
    // A deliberately heavy but plausible profile: lots of blocked domains.
    const picked = pickSyncedSettings({
      language: "en",
      keyboardShortcuts: { a: 1, b: 2, c: 3, d: 4 },
      blacklistedDomains: Array.from({ length: 100 }, (_, i) => `blocked-site-${i}.example.com`),
      whitelistedDomains: [],
    } as never);
    expect(JSON.stringify(picked).length).toBeLessThan(8192);
  });
});
