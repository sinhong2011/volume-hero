import { type Accessor, createSignal, onMount } from "solid-js";
import * as m from "@/src/paraglide/messages";
import {
  type AvailableLanguageTag,
  availableLanguageTags,
  isAvailableLanguageTag,
  languageTag,
  setLanguageTag,
} from "@/src/paraglide/runtime";
import { getGlobalSettings, saveGlobalSettings } from "@/utils/storage";

// Re-export types for compatibility
export type SupportedLocale = AvailableLanguageTag;

// Locale display names
export const SUPPORTED_LOCALES: { code: AvailableLanguageTag; name: string }[] =
  [
    { code: "en", name: "English" },
    { code: "zh-CN", name: "简体中文" },
    { code: "zh-TW", name: "繁體中文" },
    { code: "ja", name: "日本語" },
    { code: "ko", name: "한국어" },
  ];

// Global reactive state for language
const [currentLocale, setCurrentLocale] = createSignal<AvailableLanguageTag>(
  languageTag()
);
let initialized = false;

// Set Paraglide to use a getter function that returns our reactive signal
setLanguageTag(() => currentLocale());

/**
 * Initialize the i18n system by loading saved language preference
 */
export async function initI18n(): Promise<void> {
  if (initialized) return;

  try {
    const settings = await getGlobalSettings();
    const locale = settings.language;
    if (locale && isAvailableLanguageTag(locale)) {
      setCurrentLocale(locale);
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
export async function changeLanguage(
  locale: AvailableLanguageTag
): Promise<void> {
  if (!availableLanguageTags.includes(locale)) {
    console.warn(`[VolumeHero] Unsupported locale: ${locale}`);
    return;
  }

  setCurrentLocale(locale);
  await saveGlobalSettings({ language: locale });
}

/**
 * Get the current locale (accessor)
 */
export function getLocale(): AvailableLanguageTag {
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
    locale: currentLocale as Accessor<AvailableLanguageTag>,
    setLocale: changeLanguage,
  };
}

// Export messages for direct import
export { m };
