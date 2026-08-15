import { createSignal, Show } from "solid-js";
import { onMount } from "@/compat/solid-js";
import toast from "@/compat/toast";
import { useI18n } from "@/utils/i18n/useI18n";
import { type GlobalSettings, getGlobalSettings, saveGlobalSettings } from "@/utils/storage";

export default function UISettings() {
  const { m } = useI18n();
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
    toast.success(m.settings_saved());
  };

  return (
    <Show when={settings()} fallback={<div class="macos-spinner" />}>
      {(s) => (
        <>
          <p class="macos-section-title">{m.settings_tabs_ui()}</p>
          <div class="macos-card">
            {/* Compact Mode */}
            <div class="macos-card-item">
              <div class="macos-card-label">
                <p class="macos-card-label-title">{m.ui_compact_title()}</p>
                <p class="macos-card-label-description">{m.ui_compact_description()}</p>
              </div>
              <button
                type="button"
                class={`macos-toggle ${s().compactMode ? "active" : ""}`}
                onClick={() => updateSetting("compactMode", !s().compactMode)}
              />
            </div>

            {/* Show Other Tabs Section */}
            <div class="macos-card-item">
              <div class="macos-card-label">
                <p class="macos-card-label-title">{m.ui_show_tabs_title()}</p>
                <p class="macos-card-label-description">{m.ui_show_tabs_description()}</p>
              </div>
              <button
                type="button"
                class={`macos-toggle ${s().showOtherTabsSection ? "active" : ""}`}
                onClick={() => updateSetting("showOtherTabsSection", !s().showOtherTabsSection)}
              />
            </div>
          </div>
        </>
      )}
    </Show>
  );
}
