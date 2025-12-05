import * as i18n from "@solid-primitives/i18n";
import { type Accessor, createMemo, createSignal, onMount } from "solid-js";
import { getGlobalSettings, saveGlobalSettings } from "@/utils/storage";
import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type TranslationKey,
  translations,
} from "./translations";

// Global reactive state for language
const [currentLocale, setCurrentLocale] = createSignal<SupportedLocale>("en");
let initialized = false;

// Flattened dictionaries for each locale (computed once)
const flattenedDicts = Object.fromEntries(
  Object.entries(translations).map(([locale, dict]) => [
    locale,
    i18n.flatten(dict),
  ])
) as Record<SupportedLocale, i18n.Flatten<typeof translations.en>>;

/**
 * Initialize the i18n system by loading saved language preference
 */
export async function initI18n(): Promise<void> {
  if (initialized) return;

  try {
    const settings = await getGlobalSettings();
    const locale = settings.language as SupportedLocale;
    if (locale && translations[locale]) {
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
export async function changeLanguage(locale: SupportedLocale): Promise<void> {
  if (!translations[locale]) {
    console.warn(`[VolumeHero] Unsupported locale: ${locale}`);
    return;
  }

  setCurrentLocale(locale);
  await saveGlobalSettings({ language: locale });
}

/**
 * Get the current locale (accessor)
 */
export function getLocale(): SupportedLocale {
  return currentLocale();
}

export type TranslatorFn = (key: TranslationKey) => string;

/**
 * SolidJS hook for i18n using @solid-primitives/i18n
 * Returns a reactive t() function that updates when language changes
 */
export function useI18n() {
  // Initialize on first use (non-blocking)
  onMount(() => {
    // Fire and forget - don't await, let it update reactively when done
    initI18n().catch((err) => {
      console.error("[VolumeHero] Failed to initialize i18n:", err);
    });
  });

  // Create a reactive memo that returns the current flattened dictionary
  const dict = createMemo(() => flattenedDicts[currentLocale()]);

  // Create the translator using solid-primitives/i18n
  const t = i18n.translator(dict);

  return {
    t: t as TranslatorFn,
    locale: currentLocale as Accessor<SupportedLocale>,
    setLocale: changeLanguage,
  };
}

export { type TranslationKey, type SupportedLocale, SUPPORTED_LOCALES };
