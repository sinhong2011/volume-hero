import { Cloud, Globe, Info, Keyboard, Palette, Settings, Sliders, Volume2 } from "lucide-solid";
import { createSignal, For, Match, onMount, Show, Switch } from "solid-js";
import toast from "solid-toast";
import { type Messages, SUPPORTED_LOCALES, type SupportedLocale, useI18n } from "@/utils/i18n";
import {
  type GlobalSettings,
  getGlobalSettings,
  saveGlobalSettings,
  type VolumePreferenceMode,
} from "@/utils/storage";
import BehaviorSettings from "./BehaviorSettings";
import DomainManager from "./DomainManager";
import ShortcutsSettings from "./ShortcutsSettings";
import SyncSettings from "./SyncSettings";
import UISettings from "./UISettings";
import VolumeSettings from "./VolumeSettings";

type TabId = "general" | "volume" | "shortcuts" | "domains" | "ui" | "behavior" | "sync" | "about";

export default function Options() {
  const { m, locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = createSignal<TabId>("general");

  const tabs: {
    id: TabId;
    label: () => string;
    icon: typeof Settings;
  }[] = [
    { id: "general", label: () => m.settings_tabs_general(), icon: Settings },
    { id: "volume", label: () => m.settings_tabs_volume(), icon: Volume2 },
    {
      id: "shortcuts",
      label: () => m.settings_tabs_shortcuts(),
      icon: Keyboard,
    },
    { id: "domains", label: () => m.settings_tabs_domains(), icon: Globe },
    { id: "ui", label: () => m.settings_tabs_ui(), icon: Palette },
    { id: "behavior", label: () => m.settings_tabs_behavior(), icon: Sliders },
    { id: "sync", label: () => m.settings_tabs_sync(), icon: Cloud },
    { id: "about", label: () => m.settings_tabs_about(), icon: Info },
  ];

  return (
    <div class="flex min-h-screen">
      {/* macOS-style Sidebar */}
      <aside class="macos-sidebar">
        <div class="macos-sidebar-header">
          <span class="macos-sidebar-header-icon">🔊</span>
          <div>
            <h1 class="macos-sidebar-header-title">{m.ext_name()}</h1>
            <p class="macos-sidebar-header-subtitle">{m.settings_title()}</p>
          </div>
        </div>

        <nav>
          <For each={tabs}>
            {(tab) => (
              <button
                type="button"
                class={`macos-sidebar-item ${
                  activeTab() === tab.id ? "macos-sidebar-item-active" : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon class="h-[18px] w-[18px]" />
                {tab.label()}
              </button>
            )}
          </For>
        </nav>
      </aside>

      {/* macOS-style Content Area */}
      <main class="macos-content">
        <div class="macos-animate-in">
          <Switch>
            <Match when={activeTab() === "general"}>
              <GeneralSettings m={m} locale={locale} setLocale={setLocale} />
            </Match>
            <Match when={activeTab() === "volume"}>
              <div class="macos-content-header">
                <Volume2 />
                <h2 class="macos-content-title">{m.settings_tabs_volume()}</h2>
              </div>
              <VolumeSettings />
            </Match>
            <Match when={activeTab() === "shortcuts"}>
              <div class="macos-content-header">
                <Keyboard />
                <h2 class="macos-content-title">{m.shortcuts_title()}</h2>
              </div>
              <ShortcutsSettings />
            </Match>
            <Match when={activeTab() === "domains"}>
              <div class="macos-content-header">
                <Globe />
                <h2 class="macos-content-title">{m.domains_title()}</h2>
              </div>
              <p
                style={{
                  "font-size": "13px",
                  color: "var(--macos-text-secondary)",
                  "margin-bottom": "20px",
                }}
              >
                {m.domains_description()}
              </p>
              <DomainManager />
            </Match>
            <Match when={activeTab() === "ui"}>
              <div class="macos-content-header">
                <Palette />
                <h2 class="macos-content-title">{m.settings_tabs_ui()}</h2>
              </div>
              <UISettings />
            </Match>
            <Match when={activeTab() === "behavior"}>
              <div class="macos-content-header">
                <Sliders />
                <h2 class="macos-content-title">{m.settings_tabs_behavior()}</h2>
              </div>
              <BehaviorSettings />
            </Match>
            <Match when={activeTab() === "sync"}>
              <div class="macos-content-header">
                <Cloud />
                <h2 class="macos-content-title">{m.sync_title()}</h2>
              </div>
              <SyncSettings />
            </Match>
            <Match when={activeTab() === "about"}>
              <div class="macos-content-header">
                <Info />
                <h2 class="macos-content-title">{m.settings_about()}</h2>
              </div>
              <div class="macos-card">
                <div class="macos-card-item">
                  <div class="macos-card-label">
                    <p class="macos-card-label-title">{m.settings_about_description()}</p>
                  </div>
                </div>
                <div class="macos-card-item">
                  <div class="macos-card-label">
                    <p class="macos-card-label-title">{m.settings_version()}</p>
                    <p class="macos-card-label-description">1.0.0</p>
                  </div>
                </div>
              </div>
            </Match>
          </Switch>
        </div>
      </main>
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
  const [settings, setSettings] = createSignal<GlobalSettings | null>(null);

  onMount(async () => {
    const s = await getGlobalSettings();
    setSettings(s);
  });

  const updateSetting = async <K extends keyof GlobalSettings>(
    key: K,
    value: GlobalSettings[K]
  ) => {
    await saveGlobalSettings({ [key]: value });
    const updated = await getGlobalSettings();
    setSettings(updated);
    toast.success(props.m.settings_saved());
  };

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
    <Show when={settings()} fallback={<div class="macos-spinner" />}>
      {(s) => (
        <>
          {/* Header */}
          <div class="macos-content-header">
            <Settings />
            <h2 class="macos-content-title">{props.m.settings_tabs_general()}</h2>
          </div>

          {/* Language Section */}
          <p class="macos-section-title">{props.m.settings_language()}</p>
          <div class="macos-card">
            <div class="macos-card-item">
              <div class="macos-card-label">
                <p class="macos-card-label-title">{props.m.settings_language()}</p>
                <p class="macos-card-label-description">
                  {props.m.settings_language_description()}
                </p>
              </div>
              <select
                class="macos-select"
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

          {/* Default Volume Section */}
          <p class="macos-section-title" style={{ "margin-top": "24px" }}>
            {props.m.volume_default_title()}
          </p>
          <div class="macos-card">
            <div class="macos-card-item" style={{ display: "block" }}>
              <div class="macos-slider-header">
                <p class="macos-card-label-title">{props.m.volume_default_description()}</p>
                <span class="macos-slider-value">{Math.round(s().defaultVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max={s().maxVolumeLimit}
                step="0.1"
                value={Math.min(s().defaultVolume, s().maxVolumeLimit)}
                class="macos-slider"
                onInput={(e) => updateSetting("defaultVolume", parseFloat(e.currentTarget.value))}
              />
              <div class="macos-slider-labels">
                <span>100%</span>
                {s().maxVolumeLimit >= 2 && <span>200%</span>}
                {s().maxVolumeLimit >= 3 && <span>300%</span>}
                {s().maxVolumeLimit >= 4 && <span>400%</span>}
                {s().maxVolumeLimit >= 5 && <span>500%</span>}
                <span>{Math.round(s().maxVolumeLimit * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Behavior Section */}
          <p class="macos-section-title" style={{ "margin-top": "24px" }}>
            {props.m.settings_tabs_behavior()}
          </p>
          <div class="macos-card">
            {/* Auto-Apply on All Sites */}
            <div class="macos-card-item">
              <div class="macos-card-label">
                <p class="macos-card-label-title">{props.m.behavior_auto_apply_title()}</p>
                <p class="macos-card-label-description">
                  {props.m.behavior_auto_apply_description()}
                </p>
              </div>
              <button
                type="button"
                class={`macos-toggle ${s().autoApplyAllByDefault ? "active" : ""}`}
                onClick={() => updateSetting("autoApplyAllByDefault", !s().autoApplyAllByDefault)}
              />
            </div>

            {/* Show Volume Badge */}
            <div class="macos-card-item">
              <div class="macos-card-label">
                <p class="macos-card-label-title">{props.m.behavior_badge_title()}</p>
                <p class="macos-card-label-description">{props.m.behavior_badge_description()}</p>
              </div>
              <button
                type="button"
                class={`macos-toggle ${s().showBadge ? "active" : ""}`}
                onClick={() => updateSetting("showBadge", !s().showBadge)}
              />
            </div>
          </div>

          {/* Volume Preference Section */}
          <p class="macos-section-title" style={{ "margin-top": "24px" }}>
            {props.m.behavior_preference_title()}
          </p>
          <p class="macos-card-label-description" style={{ "margin-bottom": "8px" }}>
            {props.m.behavior_preference_description()}
          </p>
          <div class="macos-card" role="radiogroup">
            <button
              type="button"
              class="macos-card-item"
              style={{ cursor: "pointer", width: "100%", "text-align": "left" }}
              onClick={() => updateSetting("volumePreferenceMode", "saved" as VolumePreferenceMode)}
            >
              <div class="macos-card-label">
                <p class="macos-card-label-title">{props.m.behavior_preference_saved()}</p>
              </div>
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  "border-radius": "50%",
                  border:
                    s().volumePreferenceMode === "saved"
                      ? "6px solid var(--macos-accent)"
                      : "2px solid var(--macos-text-tertiary)",
                  transition: "all 0.15s ease",
                }}
              />
            </button>
            <button
              type="button"
              class="macos-card-item"
              style={{ cursor: "pointer", width: "100%", "text-align": "left" }}
              onClick={() => updateSetting("volumePreferenceMode", "last" as VolumePreferenceMode)}
            >
              <div class="macos-card-label">
                <p class="macos-card-label-title">{props.m.behavior_preference_last()}</p>
              </div>
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  "border-radius": "50%",
                  border:
                    s().volumePreferenceMode === "last"
                      ? "6px solid var(--macos-accent)"
                      : "2px solid var(--macos-text-tertiary)",
                  transition: "all 0.15s ease",
                }}
              />
            </button>
          </div>
        </>
      )}
    </Show>
  );
}
