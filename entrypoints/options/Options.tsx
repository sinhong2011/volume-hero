import { Globe, Info, Languages, Settings } from "lucide-solid";
import { createSignal, For, Match, Switch } from "solid-js";
import toast from "solid-toast";
import {
  type Messages,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  useI18n,
} from "@/utils/i18n";
import DomainManager from "./DomainManager";

type TabId = "general" | "domains" | "about";

export default function Options() {
  const { m, locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = createSignal<TabId>("general");

  const tabs: {
    id: TabId;
    label: () => string;
    icon: typeof Settings;
  }[] = [
    { id: "general", label: () => m.settings_tabs_general(), icon: Settings },
    { id: "domains", label: () => m.settings_tabs_domains(), icon: Globe },
    { id: "about", label: () => m.settings_tabs_about(), icon: Info },
  ];

  return (
    <div class="flex gap-6 min-h-[400px]">
      {/* Vertical Tabs */}
      <div class="flex flex-col gap-1 w-48 shrink-0">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">🔊</span>
          <div>
            <h1 class="text-lg font-bold">{m.ext_name()}</h1>
            <p class="text-base-content/60 text-xs">{m.settings_title()}</p>
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
              {tab.label()}
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
              <GeneralSettings m={m} locale={locale} setLocale={setLocale} />
            </Match>
            <Match when={activeTab() === "domains"}>
              <div class="space-y-4">
                <div>
                  <h2 class="text-lg font-semibold flex items-center gap-2">
                    <Globe class="h-5 w-5" />
                    {m.domains_title()}
                  </h2>
                  <p class="text-sm text-base-content/70 mt-1">
                    {m.domains_description()}
                  </p>
                </div>
                <DomainManager />
              </div>
            </Match>
            <Match when={activeTab() === "about"}>
              <div class="space-y-4">
                <h2 class="text-lg font-semibold flex items-center gap-2">
                  <Info class="h-5 w-5" />
                  {m.settings_about()}
                </h2>
                <p class="text-base-content/70">
                  {m.settings_about_description()}
                </p>
                <div class="text-sm text-base-content/50">
                  {m.settings_version()} 1.0.0
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
  m: Messages;
  locale: () => SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
}

function GeneralSettings(props: GeneralSettingsProps) {
  const [isSaving, setIsSaving] = createSignal(false);

  const handleLanguageChange = async (newLanguage: string) => {
    setIsSaving(true);
    try {
      await props.setLocale(newLanguage as SupportedLocale);
      toast.success(props.m.settings_saved_description());
    } catch (error) {
      console.error("[VolumeHero] Failed to save language setting:", error);
      toast.error("Failed to save language setting");
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
            <h3 class="font-medium">{props.m.settings_language()}</h3>
            <p class="text-sm text-base-content/60">
              {props.m.settings_language_description()}
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
    </div>
  );
}
