import { debounce } from "es-toolkit";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import toast from "solid-toast";
import { useI18n } from "@/utils/i18n/useI18n";
import { type GlobalSettings, getGlobalSettings, saveGlobalSettings } from "@/utils/storage";

const VOLUME_STEP_OPTIONS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.5];
const DEBOUNCE_DELAY = 500; // ms

export default function VolumeSettings() {
  const { m } = useI18n();
  const [settings, setSettings] = createSignal<GlobalSettings | null>(null);

  onMount(async () => {
    const s = await getGlobalSettings();
    setSettings(s);
  });

  /**
   * Debounced save function - saves to storage and shows toast
   */
  const debouncedSave = debounce(
    async (key: keyof GlobalSettings, value: GlobalSettings[keyof GlobalSettings]) => {
      await saveGlobalSettings({ [key]: value });
      toast.success(m.settings_saved());
    },
    DEBOUNCE_DELAY
  );

  // Cleanup debounced function on unmount
  onCleanup(() => {
    debouncedSave.cancel();
  });

  /**
   * Update setting with immediate UI feedback and debounced save
   */
  const updateSetting = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) => {
    // Update local state immediately for responsive UI
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    // Debounce the actual save
    debouncedSave(key, value);
  };

  /**
   * Update setting immediately (for button clicks)
   */
  const updateSettingImmediate = async <K extends keyof GlobalSettings>(
    key: K,
    value: GlobalSettings[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    await saveGlobalSettings({ [key]: value });
    toast.success(m.settings_saved());
  };

  return (
    <Show when={settings()} fallback={<div class="macos-spinner" />}>
      {(s) => (
        <>
          {/* Max Volume Limit */}
          <p class="macos-section-title">{m.volume_max_title()}</p>
          <div class="macos-card">
            <div class="macos-card-item" style={{ display: "block" }}>
              <div class="macos-slider-header">
                <p class="macos-card-label-title">{m.volume_max_description()}</p>
                <span class="macos-slider-value">{Math.round(s().maxVolumeLimit * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="0.1"
                value={s().maxVolumeLimit}
                class="macos-slider"
                onInput={(e) => updateSetting("maxVolumeLimit", parseFloat(e.currentTarget.value))}
              />
              <div class="macos-slider-labels">
                <span>100%</span>
                <span>200%</span>
                <span>300%</span>
                <span>400%</span>
                <span>500%</span>
                <span>600%</span>
              </div>
            </div>
          </div>

          {/* Volume Step Size */}
          <p class="macos-section-title" style={{ "margin-top": "24px" }}>
            {m.volume_step_title()}
          </p>
          <p class="macos-card-label-description" style={{ "margin-bottom": "8px" }}>
            {m.volume_step_description()}
          </p>
          <div class="macos-chip-group">
            {VOLUME_STEP_OPTIONS.map((step) => (
              <button
                type="button"
                class={`macos-chip ${s().volumeStepSize === step ? "macos-chip-active" : ""}`}
                onClick={() => updateSettingImmediate("volumeStepSize", step)}
              >
                {Math.round(step * 100)}%
              </button>
            ))}
          </div>

          {/* Equalizer Section */}
          <p class="macos-section-title" style={{ "margin-top": "24px" }}>
            Equalizer
          </p>
          <div class="macos-card">
            {/* Bass Boost */}
            <div class="macos-card-item" style={{ display: "block" }}>
              <div class="macos-slider-header">
                <p class="macos-card-label-title">{m.volume_bass_title()}</p>
                <span class="macos-slider-value">
                  {s().defaultBassBoost > 0 ? "+" : ""}
                  {s().defaultBassBoost} dB
                </span>
              </div>
              <p class="macos-card-label-description" style={{ "margin-bottom": "8px" }}>
                {m.volume_bass_description()}
              </p>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={s().defaultBassBoost}
                class="macos-slider"
                onInput={(e) =>
                  updateSetting("defaultBassBoost", parseInt(e.currentTarget.value, 10))
                }
              />
              <div class="macos-slider-labels">
                <span>-12</span>
                <span>-6</span>
                <span>0</span>
                <span>+6</span>
                <span>+12</span>
              </div>
            </div>

            {/* Treble Boost */}
            <div class="macos-card-item" style={{ display: "block" }}>
              <div class="macos-slider-header">
                <p class="macos-card-label-title">{m.volume_treble_title()}</p>
                <span class="macos-slider-value">
                  {s().defaultTrebleBoost > 0 ? "+" : ""}
                  {s().defaultTrebleBoost} dB
                </span>
              </div>
              <p class="macos-card-label-description" style={{ "margin-bottom": "8px" }}>
                {m.volume_treble_description()}
              </p>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={s().defaultTrebleBoost}
                class="macos-slider"
                onInput={(e) =>
                  updateSetting("defaultTrebleBoost", parseInt(e.currentTarget.value, 10))
                }
              />
              <div class="macos-slider-labels">
                <span>-12</span>
                <span>-6</span>
                <span>0</span>
                <span>+6</span>
                <span>+12</span>
              </div>
            </div>
          </div>
        </>
      )}
    </Show>
  );
}
