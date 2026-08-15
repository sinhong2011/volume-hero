import { createSignal, Show } from "solid-js";
import { onMount } from "@/compat/solid-js";
import toast from "@/compat/toast";
import { useI18n } from "@/utils/i18n/useI18n";
import { type GlobalSettings, getGlobalSettings, saveGlobalSettings } from "@/utils/storage";

const OSD_DURATION_OPTIONS = [500, 1000, 1500, 2000, 3000];

export default function BehaviorSettings() {
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
          <p class="macos-section-title">{m.behavior_osd_title()}</p>
          <div class="macos-card">
            {/* On-Screen Display */}
            <div class="macos-card-item">
              <div class="macos-card-label">
                <p class="macos-card-label-title">{m.behavior_osd_title()}</p>
                <p class="macos-card-label-description">{m.behavior_osd_description()}</p>
              </div>
              <button
                type="button"
                class={`macos-toggle ${s().showOSD ? "active" : ""}`}
                onClick={() => updateSetting("showOSD", !s().showOSD)}
              />
            </div>

            {/* OSD Duration */}
            <Show when={s().showOSD}>
              <div class="macos-card-item">
                <div class="macos-card-label">
                  <p class="macos-card-label-title">{m.behavior_osd_duration()}</p>
                </div>
                <select
                  class="macos-select"
                  value={s().osdDurationMs}
                  onChange={(e) =>
                    updateSetting("osdDurationMs", parseInt(e.currentTarget.value, 10))
                  }
                >
                  {OSD_DURATION_OPTIONS.map((duration) => (
                    <option value={duration}>{duration}ms</option>
                  ))}
                </select>
              </div>
            </Show>
          </div>
        </>
      )}
    </Show>
  );
}
