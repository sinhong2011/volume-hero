import { beforeAll, describe, expect, test } from "bun:test";

/**
 * The AES-GCM path needs WebCrypto (present in Bun) plus IndexedDB for key
 * storage (not present). A minimal in-memory IndexedDB stand-in lets the real
 * module run unmodified, so these tests exercise the shipping code path rather
 * than a reimplementation of it.
 */
beforeAll(() => {
  const store = new Map<string, unknown>();

  const request = <T>(resolve: () => T) => {
    const req: Record<string, unknown> = { result: undefined, error: null };
    queueMicrotask(() => {
      req.result = resolve();
      (req.onsuccess as (() => void) | undefined)?.();
    });
    return req;
  };

  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => undefined,
    transaction() {
      const tx: Record<string, unknown> = { oncomplete: null, onerror: null, error: null };
      const objectStore = {
        get: (key: string) => request(() => store.get(key)),
        put: (value: unknown, key: string) => {
          store.set(key, value);
          queueMicrotask(() => (tx.oncomplete as (() => void) | undefined)?.());
          return request(() => undefined);
        },
      };
      tx.objectStore = () => objectStore;
      return tx;
    },
  };

  (globalThis as Record<string, unknown>).indexedDB = {
    open: () => {
      const req: Record<string, unknown> = { result: db, error: null };
      queueMicrotask(() => {
        (req.onupgradeneeded as (() => void) | undefined)?.();
        (req.onsuccess as (() => void) | undefined)?.();
      });
      return req;
    },
  };
});

describe("encryptSecret / decryptSecret", () => {
  test("round-trips a secret", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    const secret = "AKIAIOSFODNN7EXAMPLE";
    const sealed = await encryptSecret(secret);
    expect(sealed).toStartWith("v2:");
    expect(sealed).not.toContain(secret);
    expect(await decryptSecret(sealed)).toBe(secret);
  });

  test("round-trips unicode and long values", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    for (const secret of ["pä$$wörd–✓", "x".repeat(512), "a/b+c=d"]) {
      expect(await decryptSecret(await encryptSecret(secret))).toBe(secret);
    }
  });

  test("uses a fresh nonce, so the same input never yields the same blob", async () => {
    const { encryptSecret } = await import("./crypto");
    const a = await encryptSecret("same-input");
    const b = await encryptSecret("same-input");
    expect(a).not.toBe(b);
  });

  test("empty input stays empty in both directions", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    expect(await encryptSecret("")).toBe("");
    expect(await decryptSecret("")).toBe("");
  });

  test("tampered ciphertext fails closed rather than returning garbage", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    const sealed = await encryptSecret("secret-value");
    const body = sealed.slice(3);
    const flipped = `v2:${body.slice(0, -4)}${body.slice(-4) === "AAAA" ? "BBBB" : "AAAA"}`;

    // The rejection is the expected outcome here; keep its stack out of the
    // test log so a passing run stays readable.
    const original = console.error;
    console.error = () => {};
    try {
      expect(await decryptSecret(flipped)).toBe("");
    } finally {
      console.error = original;
    }
  });
});

describe("legacy XOR migration", () => {
  /** Reproduces exactly what the previous scheme wrote to storage. */
  const legacyEncrypt = (text: string): string => {
    const key = "VolumeHero2024";
    let out = "";
    for (let i = 0; i < text.length; i++) {
      out += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(out);
  };

  test("reads values written by the old scheme", async () => {
    const { decryptSecret } = await import("./crypto");
    for (const secret of ["hunter2", "AKIAIOSFODNN7EXAMPLE", "p@ss/w+rd="]) {
      expect(await decryptSecret(legacyEncrypt(secret))).toBe(secret);
    }
  });

  test("legacy values carry no v2 prefix, so the two formats never collide", () => {
    expect(legacyEncrypt("anything").startsWith("v2:")).toBe(false);
  });
});
