/**
 * Credential encryption for sync provider secrets.
 *
 * Secrets are sealed with AES-GCM using a 256-bit key that is generated once
 * and kept in IndexedDB as a **non-extractable** CryptoKey. The raw key bytes
 * therefore never exist in extension storage or in the bundle, so reading
 * chrome.storage alone no longer reveals the credentials.
 *
 * This replaces an XOR obfuscation whose key was a string literal in the source
 * — recoverable by anyone who opened the bundle. Values written by that scheme
 * are still readable here (see `LEGACY_KEY`) so existing users keep working;
 * they are re-sealed with AES-GCM the next time the settings are saved.
 */

const DB_NAME = "volume-hero-keys";
const STORE_NAME = "keys";
const KEY_ID = "credential-key";

/** Marks a value produced by the AES-GCM path. */
const V2_PREFIX = "v2:";

/** Key of the superseded XOR scheme, kept only to read old values. */
const LEGACY_KEY = "VolumeHero2024";

const IV_BYTES = 12; // AES-GCM standard nonce length

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readKey(db: IDBDatabase): Promise<CryptoKey | undefined> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(KEY_ID);
    request.onsuccess = () => resolve(request.result as CryptoKey | undefined);
    request.onerror = () => reject(request.error);
  });
}

function writeKey(db: IDBDatabase, key: CryptoKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(key, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** In-flight/created key, so concurrent callers share one generation. */
let keyPromise: Promise<CryptoKey> | null = null;

function getKey(): Promise<CryptoKey> {
  keyPromise ??= (async () => {
    const db = await openDatabase();
    const existing = await readKey(db);
    if (existing) return existing;

    // extractable: false — the browser will use this key but never hand back
    // its bytes, so it cannot be exfiltrated even from extension code.
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]);
    await writeKey(db, key);
    return key;
  })();
  return keyPromise;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decode a value written by the superseded XOR scheme. */
function decryptLegacy(encoded: string): string {
  try {
    const decoded = atob(encoded);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ LEGACY_KEY.charCodeAt(i % LEGACY_KEY.length)
      );
    }
    return result;
  } catch {
    return "";
  }
}

/**
 * Seal a secret for storage. Returns a `v2:`-prefixed, base64 blob holding the
 * random nonce followed by the ciphertext.
 */
export async function encryptSecret(text: string): Promise<string> {
  if (!text) return "";
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(text)
    );

    const packed = new Uint8Array(iv.length + ciphertext.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(ciphertext), iv.length);
    return V2_PREFIX + toBase64(packed);
  } catch (error) {
    console.error("[VolumeHero] Failed to encrypt credential:", error);
    throw error;
  }
}

/**
 * Open a stored secret, transparently handling values written by the previous
 * XOR scheme so existing configurations keep working.
 */
export async function decryptSecret(encoded: string): Promise<string> {
  if (!encoded) return "";
  if (!encoded.startsWith(V2_PREFIX)) return decryptLegacy(encoded);

  try {
    const packed = fromBase64(encoded.slice(V2_PREFIX.length));
    const key = await getKey();
    // Copy out of the view so the buffers are plain ArrayBuffers, which is what
    // SubtleCrypto's BufferSource requires.
    const iv = packed.slice(0, IV_BYTES);
    const body = packed.slice(IV_BYTES);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, body);
    return new TextDecoder().decode(plaintext);
  } catch (error) {
    // A failure here means the key is gone (profile reset) or the value was
    // tampered with; treat it as "no credential" rather than crashing sync.
    console.error("[VolumeHero] Failed to decrypt credential:", error);
    return "";
  }
}
