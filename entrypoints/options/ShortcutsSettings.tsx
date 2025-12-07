import { createSignal, For, onMount, Show } from "solid-js";
import { useI18n } from "@/utils/i18n/useI18n";
import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  type GlobalSettings,
  getGlobalSettings,
  type KeyboardShortcut,
  type KeyboardShortcuts,
  saveGlobalSettings,
} from "@/utils/storage";

const SHORTCUT_KEYS: (keyof KeyboardShortcuts)[] = [
  "volumeUp",
  "volumeDown",
  "volumeReset",
  "volumeMute",
];

export default function ShortcutsSettings() {
  const { m } = useI18n();
  const [settings, setSettings] = createSignal<GlobalSettings | null>(null);
  const [recording, setRecording] = createSignal<keyof KeyboardShortcuts | null>(null);

  onMount(async () => {
    const s = await getGlobalSettings();
    setSettings(s);
  });

  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];
    if (shortcut.modifiers?.ctrl) parts.push("Ctrl");
    if (shortcut.modifiers?.shift) parts.push("Shift");
    if (shortcut.modifiers?.alt) parts.push("Alt");
    if (shortcut.modifiers?.meta) parts.push("Meta");
    parts.push(shortcut.key === " " ? "Space" : shortcut.key);
    return parts.join(" + ");
  };

  const handleKeyDown = async (e: KeyboardEvent, key: keyof KeyboardShortcuts) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      setRecording(null);
      return;
    }
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

    const newShortcut: KeyboardShortcut = {
      key: e.key,
      modifiers: {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
      },
    };

    const s = settings();
    if (!s) return;

    const newShortcuts = { ...s.keyboardShortcuts, [key]: newShortcut };
    await saveGlobalSettings({ keyboardShortcuts: newShortcuts });
    const updated = await getGlobalSettings();
    setSettings(updated);
    setRecording(null);
  };

  const resetAllShortcuts = async () => {
    await saveGlobalSettings({ keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS });
    const updated = await getGlobalSettings();
    setSettings(updated);
  };

  const getShortcutLabel = (key: keyof KeyboardShortcuts): string => {
    const labels: Record<keyof KeyboardShortcuts, string> = {
      volumeUp: m.shortcuts_volume_up(),
      volumeDown: m.shortcuts_volume_down(),
      volumeReset: m.shortcuts_volume_reset(),
      volumeMute: m.shortcuts_volume_mute(),
    };
    return labels[key];
  };

  return (
    <Show when={settings()} fallback={<div class="macos-spinner" />}>
      {(s) => (
        <>
          <p class="macos-card-label-description" style={{ "margin-bottom": "16px" }}>
            {m.shortcuts_description()}
          </p>

          <p class="macos-section-title">{m.shortcuts_title()}</p>
          <div class="macos-card">
            <For each={SHORTCUT_KEYS}>
              {(key) => (
                <div class="macos-card-item">
                  <div class="macos-card-label">
                    <p class="macos-card-label-title">{getShortcutLabel(key)}</p>
                    <p class="macos-card-label-description">
                      {m.shortcuts_default()}: {formatShortcut(DEFAULT_KEYBOARD_SHORTCUTS[key])}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Show
                      when={recording() === key}
                      fallback={
                        <button
                          type="button"
                          class="macos-kbd"
                          style={{ cursor: "pointer" }}
                          onClick={() => setRecording(key)}
                        >
                          {formatShortcut(s().keyboardShortcuts[key])}
                        </button>
                      }
                    >
                      <input
                        type="text"
                        class="macos-input"
                        style={{
                          width: "120px",
                          "font-family": "'SF Mono', Monaco, 'Cascadia Mono', monospace",
                        }}
                        placeholder={m.shortcuts_press_key()}
                        onKeyDown={(e) => handleKeyDown(e, key)}
                        onBlur={() => setRecording(null)}
                        autofocus
                        readonly
                      />
                    </Show>
                    <button
                      type="button"
                      class="macos-button"
                      onClick={async () => {
                        const newShortcuts = {
                          ...s().keyboardShortcuts,
                          [key]: DEFAULT_KEYBOARD_SHORTCUTS[key],
                        };
                        await saveGlobalSettings({
                          keyboardShortcuts: newShortcuts,
                        });
                        const updated = await getGlobalSettings();
                        setSettings(updated);
                      }}
                      title={m.reset()}
                    >
                      ↺
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>

          <button
            type="button"
            class="macos-button macos-button-danger"
            style={{ "margin-top": "20px", width: "100%" }}
            onClick={resetAllShortcuts}
          >
            {m.shortcuts_reset_all()}
          </button>
        </>
      )}
    </Show>
  );
}
