import { CircleCheck, Globe, Info, Languages, Settings } from "lucide-solid";
import { createSignal, For, Match, Show, Switch } from "solid-js";
import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type TranslatorFn,
  useI18n,
} from "@/utils/i18n";
import DomainManager from "./DomainManager";

type TabId = "general" | "domains" | "about";

export default function Options() {
  const { t, locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = createSignal<TabId>("general");

  const tabs: {
    id: TabId;
    labelKey:
      | "settings.tabs.general"
      | "settings.tabs.domains"
      | "settings.tabs.about";
    icon: typeof Settings;
  }[] = [
    { id: "general", labelKey: "settings.tabs.general", icon: Settings },
    { id: "domains", labelKey: "settings.tabs.domains", icon: Globe },
    { id: "about", labelKey: "settings.tabs.about", icon: Info },
  ];

  return (
    <div class="flex gap-6 min-h-[400px]">
      {/* Vertical Tabs */}
      <div class="flex flex-col gap-1 w-48 shrink-0">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">🔊</span>
          <div>
            <h1 class="text-lg font-bold">{t("extName")}</h1>
            <p class="text-base-content/60 text-xs">{t("settings.title")}</p>
          </div>
        </div>

        <For each={tabs}>
          {(tab) => (
            <button
              type="button"
              class={`btn btn-ghost justify-start gap-3 transition-all duration-200 ${
                activeTab() === tab.id
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon class="h-4 w-4" />
              {t(tab.labelKey)}
            </button>
          )}
        </For>
      </div>

      {/* Tab Content with Animation */}
      <div class="flex-1 bg-base-200 rounded-box p-6 overflow-hidden">
        <div
          class="transition-all duration-300 ease-out"
          style={{
            opacity: 1,
            transform: "translateX(0)",
          }}
        >
          <Switch>
            <Match when={activeTab() === "general"}>
              <GeneralSettings t={t} locale={locale} setLocale={setLocale} />
            </Match>
            <Match when={activeTab() === "domains"}>
              <div class="space-y-4">
                <div>
                  <h2 class="text-lg font-semibold flex items-center gap-2">
                    <Globe class="h-5 w-5" />
                    {t("domains.title")}
                  </h2>
                  <p class="text-sm text-base-content/70 mt-1">
                    {t("domains.description")}
                  </p>
                </div>
                <DomainManager />
              </div>
            </Match>
            <Match when={activeTab() === "about"}>
              <div class="space-y-4">
                <h2 class="text-lg font-semibold flex items-center gap-2">
                  <Info class="h-5 w-5" />
                  {t("settings.about")}
                </h2>
                <p class="text-base-content/70">
                  {t("settings.aboutDescription")}
                </p>
                <div class="text-sm text-base-content/50">
                  {t("settings.version")} 1.0.0
                </div>
              </div>
            </Match>
          </Switch>
        </div>
      </div>
    </div>
  );
}

interface GeneralSettingsProps {
  t: TranslatorFn;
  locale: () => SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
}

function GeneralSettings(props: GeneralSettingsProps) {
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveSuccess, setSaveSuccess] = createSignal(false);

  const handleLanguageChange = async (newLanguage: string) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await props.setLocale(newLanguage as SupportedLocale);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("[VolumeHero] Failed to save language setting:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div class="space-y-4">
      {/* Language Settings */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Languages class="h-5 w-5 text-base-content/70" />
          <div>
            <h3 class="font-medium">{props.t("settings.language")}</h3>
            <p class="text-sm text-base-content/60">
              {props.t("settings.languageDescription")}
            </p>
          </div>
        </div>
        <select
          class="select select-bordered select-sm w-40"
          value={props.locale()}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={isSaving()}
        >
          <For each={SUPPORTED_LOCALES}>
            {(lang) => <option value={lang.code}>{lang.name}</option>}
          </For>
        </select>
      </div>

      {/* Save Status */}
      <Show when={saveSuccess()}>
        <div class="alert alert-success py-2">
          <CircleCheck class="stroke-current shrink-0 h-4 w-4" />
          <span class="text-sm">{props.t("settings.savedDescription")}</span>
        </div>
      </Show>
    </div>
  );
}
