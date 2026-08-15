import { type Accessor, createSignal } from "solid-js";
import { onMount } from "@/compat/solid-js";
import * as m from "@/src/paraglide/messages";
import {
  getLocale,
  isLocale,
  type Locale,
  locales,
  overwriteGetLocale,
} from "@/src/paraglide/runtime";
import { getGlobalSettings, getGlobalSettingsSync, saveGlobalSettings } from "@/utils/storage";

// Re-export types for compatibility
export type SupportedLocale = Locale;

// Locale display names
export const SUPPORTED_LOCALES: { code: Locale; name: string }[] = [
  { code: "en", name: "English" },
  { code: "zh-CN", name: "简体中文" },
  { code: "zh-TW", name: "繁體中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
];

// Global reactive state for language - initialized from sync cache for instant display
const getInitialLocale = (): Locale => {
  // Try to get cached language setting synchronously for instant display
  const cachedSettings = getGlobalSettingsSync();
  if (cachedSettings.language && isLocale(cachedSettings.language)) {
    return cachedSettings.language;
  }
  return getLocale();
};

const [currentLocale, setCurrentLocale] = createSignal<Locale>(getInitialLocale());
let initialized = false;

// Point Paraglide at the reactive signal. Paraglide 2 replaced v1's
// `setLanguageTag(getter)` with `overwriteGetLocale`, which serves the same
// purpose: every message lookup reads the signal, so changing it re-renders
// the UI instead of requiring a reload.
overwriteGetLocale(() => currentLocale());

/**
 * Initialize the i18n system by loading saved language preference
 * This verifies the cached value and updates if needed
 */
export async function initI18n(): Promise<void> {
  if (initialized) return;

  try {
    const settings = await getGlobalSettings();
    const locale = settings.language;
    if (locale && isLocale(locale)) {
      // Only update if different from current (already set from cache)
      if (currentLocale() !== locale) {
        setCurrentLocale(locale);
      }
    }
    initialized = true;
  } catch (error) {
    console.error("[VolumeHero] Failed to load language setting:", error);
    initialized = true;
  }
}

/**
 * Change the current language and save to storage
 */
export async function changeLanguage(locale: Locale): Promise<void> {
  if (!locales.includes(locale)) {
    console.warn(`[VolumeHero] Unsupported locale: ${locale}`);
    return;
  }

  setCurrentLocale(locale);
  await saveGlobalSettings({ language: locale });
}

/**
 * Get the current locale (accessor)
 */
export function getCurrentLocale(): Locale {
  return currentLocale();
}

// Message key type - all exported message function names from Paraglide
export type MessageKey = keyof typeof m;

// Messages type - the type of the messages object
export type Messages = typeof m;

/**
 * SolidJS hook for i18n using Paraglide JS
 * Returns the messages object and locale management functions
 */
export function useI18n() {
  // Initialize on first use (non-blocking)
  onMount(() => {
    // Fire and forget - don't await, let it update reactively when done
    initI18n().catch((err) => {
      console.error("[VolumeHero] Failed to initialize i18n:", err);
    });
  });

  return {
    m,
    locale: currentLocale as Accessor<Locale>,
    setLocale: changeLanguage,
  };
}

// Export messages for direct import
export { m };
