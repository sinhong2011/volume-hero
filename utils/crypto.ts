// XOR obfuscation for credential storage.
// Note: this is NOT strong encryption — the key is bundled with the extension source.
// It prevents casual inspection of storage values but is not resistant to extraction.
const OBFUSCATION_KEY = "VolumeHero2024";

export function simpleEncrypt(text: string): string {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

export function simpleDecrypt(encoded: string): string {
  if (!encoded) return "";
  try {
    const decoded = atob(encoded);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode =
        decoded.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return "";
  }
}
