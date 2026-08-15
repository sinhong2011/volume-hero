import { Slider } from "@ark-ui/solid/slider";
import { Switch } from "@ark-ui/solid/switch";
import { Tooltip } from "@ark-ui/solid/tooltip";
import {
  ExternalLink,
  Globe,
  Info,
  RefreshCw,
  RotateCcw,
  Settings,
  TriangleAlert,
  Volume2,
  VolumeX,
} from "lucide-solid";
import { For, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useVolumeControl } from "@/hooks/useVolumeControl";
import { EQ_PRESETS, type EQPresetName, matchEQPreset } from "@/utils/audio-eq";
import { cn } from "@/utils/cn";
import { useI18n } from "@/utils/i18n";
import type { TabMediaInfo } from "@/utils/volume";

function App() {
  const { m } = useI18n();

  const {
    domain,
    volume,
    autoApply,
    isLoading,
    tabsWithMedia,
    tabVolumes,
    globalSettings,
    eq,
    setVolume,
    setAutoApply,
    setEQ,
    resetVolume,
    setTabVolume,
    focusTab,
    refreshAllTabsMedia,
  } = useVolumeControl();

  const EQ_PRESET_NAMES = Object.keys(EQ_PRESETS) as EQPresetName[];

  const EQ_BANDS = [
    { key: "bassBoost", label: () => m.popup_eq_bass() },
    { key: "trebleBoost", label: () => m.popup_eq_treble() },
  ] as const;

  const presetLabel = (preset: EQPresetName): string =>
    ({
      flat: m.eq_preset_flat(),
      bass_boost: m.eq_preset_bass_boost(),
      treble_boost: m.eq_preset_treble_boost(),
      vocal_clarity: m.eq_preset_vocal_clarity(),
      movie: m.eq_preset_movie(),
      music: m.eq_preset_music(),
    })[preset];

  const activePreset = () => matchEQPreset(eq());
  const activePresetLabel = () => {
    const preset = activePreset();
    return preset ? presetLabel(preset) : m.popup_eq_custom();
  };

  const openOptionsPage = () => {
    browser.runtime.openOptionsPage();
  };

  const volumePercentage = () => Math.round(volume() * 100);

  const maxVolumePercent = () => (globalSettings()?.maxVolumeLimit ?? 6) * 100;
  const volumeStep = () => globalSettings()?.volumeStepSize ?? 0.1;
  const showOtherTabs = () => globalSettings()?.showOtherTabsSection ?? true;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!domain()) return;

    const step = e.shiftKey ? volumeStep() * 5 : volumeStep();
    const maxVol = globalSettings()?.maxVolumeLimit ?? 6;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        setVolume(Math.min(maxVol, volume() + step));
        break;
      case "ArrowDown":
        e.preventDefault();
        setVolume(Math.max(0, volume() - step));
        break;
      case "r":
      case "R":
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          resetVolume();
        }
        break;
      case "m":
      case "M":
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setVolume(volume() === 0 ? 1.0 : 0);
        }
        break;
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });

  const getVolumeLevel = (vol: number): "safe" | "warning" | "danger" => {
    if (vol <= 1.0) return "safe";
    if (vol <= 3.0) return "warning";
    return "danger";
  };

  const showDistortionWarning = () => volume() > 2.0;

  const getTabVolume = (tabId: number, isActive: boolean) => {
    if (isActive) return volume();
    return tabVolumes().get(tabId) ?? 1.0;
  };

  const getTabVolumePercentage = (tabId: number, isActive: boolean) => {
    return Math.round(getTabVolume(tabId, isActive) * 100);
  };

  return (
    <div class="popup-card">
      <div class="popup-card-body">
        {/* Header */}
        <div class="flex items-center justify-between mb-1">
          <h2 class="popup-card-title flex items-center gap-2">
            <img src="/icon/logo.png" alt="Volume Hero" class="size-7 rounded" />
            {m.popup_title()}
          </h2>
          <div class="flex items-center gap-0.5">
            <Show when={domain() && volume() !== 1.0}>
              <button
                type="button"
                class="popup-btn popup-btn-ghost popup-btn-sm popup-btn-square"
                onClick={resetVolume}
                title={m.popup_reset_to_100()}
                aria-label={m.popup_reset_to_100()}
              >
                <RotateCcw class="h-4 w-4" />
              </button>
            </Show>
            <Show when={domain()}>
              <Tooltip.Root openDelay={100} closeDelay={0}>
                <Tooltip.Trigger
                  class="popup-btn popup-btn-ghost popup-btn-sm popup-btn-square"
                  aria-label={m.popup_shortcuts_popup()}
                >
                  <Info class="h-4 w-4" />
                </Tooltip.Trigger>
                <Portal>
                  <Tooltip.Positioner>
                    <Tooltip.Content class="popup-dropdown w-64">
                      <div class="text-xs">
                        <p class="font-semibold text-macos-text pb-1 mb-2 border-b border-macos-divider">
                          {m.popup_shortcuts_popup()}
                        </p>
                        <table class="w-full">
                          <tbody>
                            <tr>
                              <td class="py-0.5 pr-3 whitespace-nowrap">
                                <kbd class="popup-kbd">↑</kbd> <kbd class="popup-kbd">↓</kbd>
                              </td>
                              <td class="py-0.5 text-macos-text-secondary text-right">
                                {m.popup_shortcuts_arrow_keys()}
                              </td>
                            </tr>
                            <tr>
                              <td class="py-0.5 pr-3 whitespace-nowrap">
                                <kbd class="popup-kbd">Shift</kbd>+<kbd class="popup-kbd">↑↓</kbd>
                              </td>
                              <td class="py-0.5 text-macos-text-secondary text-right">
                                {m.popup_shortcuts_shift_arrow_keys()}
                              </td>
                            </tr>
                            <tr>
                              <td class="py-0.5 pr-3 whitespace-nowrap">
                                <kbd class="popup-kbd">M</kbd>
                              </td>
                              <td class="py-0.5 text-macos-text-secondary text-right">
                                {m.popup_shortcuts_mute()}
                              </td>
                            </tr>
                            <tr>
                              <td class="py-0.5 pr-3 whitespace-nowrap">
                                <kbd class="popup-kbd">R</kbd>
                              </td>
                              <td class="py-0.5 text-macos-text-secondary text-right">
                                {m.popup_shortcuts_reset()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p class="font-semibold text-macos-text pt-2 pb-1 mb-2 border-b border-macos-divider">
                          {m.popup_shortcuts_global()}
                        </p>
                        <table class="w-full">
                          <tbody>
                            <tr>
                              <td class="py-0.5 pr-3 whitespace-nowrap">
                                <kbd class="popup-kbd">Alt</kbd>+<kbd class="popup-kbd">Shift</kbd>+
                                <kbd class="popup-kbd">↑</kbd>
                              </td>
                              <td class="py-0.5 text-macos-text-secondary text-right">
                                {m.popup_shortcuts_global_up()}
                              </td>
                            </tr>
                            <tr>
                              <td class="py-0.5 pr-3 whitespace-nowrap">
                                <kbd class="popup-kbd">Alt</kbd>+<kbd class="popup-kbd">Shift</kbd>+
                                <kbd class="popup-kbd">↓</kbd>
                              </td>
                              <td class="py-0.5 text-macos-text-secondary text-right">
                                {m.popup_shortcuts_global_down()}
                              </td>
                            </tr>
                            <tr>
                              <td class="py-0.5 pr-3 whitespace-nowrap">
                                <kbd class="popup-kbd">Alt</kbd>+<kbd class="popup-kbd">Shift</kbd>+
                                <kbd class="popup-kbd">R</kbd>
                              </td>
                              <td class="py-0.5 text-macos-text-secondary text-right">
                                {m.popup_shortcuts_global_reset()}
                              </td>
                            </tr>
                            <tr>
                              <td class="py-0.5 pr-3 whitespace-nowrap">
                                <kbd class="popup-kbd">Alt</kbd>+<kbd class="popup-kbd">Shift</kbd>+
                                <kbd class="popup-kbd">M</kbd>
                              </td>
                              <td class="py-0.5 text-macos-text-secondary text-right">
                                {m.popup_shortcuts_global_mute()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Portal>
              </Tooltip.Root>
            </Show>
            <button
              type="button"
              class="popup-btn popup-btn-ghost popup-btn-sm popup-btn-square"
              onClick={openOptionsPage}
              title={m.settings_title()}
              aria-label={m.settings_title()}
            >
              <Settings class="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        <Show when={isLoading()}>
          <div class="mt-4 animate-pulse space-y-3">
            <div class="flex justify-between items-center">
              <div class="h-3 w-14 bg-macos-card rounded" />
              <div class="h-8 w-16 bg-macos-card rounded" />
            </div>
            <div class="h-[5px] bg-macos-card rounded" />
            <div class="flex items-center gap-2">
              <div class="h-6 w-6 bg-macos-card rounded" />
              <div class="h-[3px] flex-1 bg-macos-card rounded" />
              <div class="h-6 w-6 bg-macos-card rounded" />
            </div>
          </div>
        </Show>

        {/* Volume Controls */}
        <Show when={!isLoading() && domain()}>
          <div class="mt-4">
            {/* Volume label + percentage */}
            <div class="flex justify-between items-baseline mb-3">
              <span class="text-xs font-medium tracking-wide uppercase text-macos-text-tertiary">
                {m.popup_volume()}
              </span>
              <span
                class={cn(
                  "text-[30px] leading-none font-semibold tabular-nums font-macos-mono transition-colors duration-200",
                  volume() <= 1 && "text-macos-success",
                  volume() > 1 && volume() <= 2 && "text-macos-warning",
                  volume() > 2 && "text-macos-error"
                )}
              >
                {volumePercentage()}
                <span class="text-sm font-medium ml-0.5 opacity-60">%</span>
              </span>
            </div>

            {/* Combined level meter + slider */}
            <div class="flex items-center gap-2.5">
              <button
                type="button"
                class="popup-btn popup-btn-ghost popup-btn-sm popup-btn-square"
                onClick={() => setVolume(0)}
                title={m.popup_mute()}
                aria-label={m.popup_mute()}
              >
                <VolumeX class="h-4 w-4" />
              </button>

              <Slider.Root
                value={[volumePercentage()]}
                onValueChange={(e) => {
                  const next = e.value[0];
                  if (next !== undefined) setVolume(next / 100);
                }}
                min={0}
                max={maxVolumePercent()}
                step={1}
                class="flex-1 popup-volume-slider"
              >
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Range data-volume-level={getVolumeLevel(volume())} />
                  </Slider.Track>
                  <Slider.Thumb index={0}>
                    <Slider.HiddenInput />
                  </Slider.Thumb>
                </Slider.Control>
              </Slider.Root>

              <button
                type="button"
                class="popup-btn popup-btn-ghost popup-btn-sm popup-btn-square"
                onClick={() => setVolume(globalSettings()?.maxVolumeLimit ?? 6)}
                title={m.popup_max_volume()}
                aria-label={m.popup_max_volume()}
              >
                <Volume2 class="h-4 w-4" />
              </button>
            </div>

            {/* Scale labels */}
            <div class="flex justify-between text-[10px] mt-2 px-1 font-macos-mono text-macos-text-tertiary">
              <span>0</span>
              <Show when={maxVolumePercent() >= 200}>
                <span>200%</span>
              </Show>
              <Show when={maxVolumePercent() >= 400}>
                <span>400%</span>
              </Show>
              <span>{maxVolumePercent()}%</span>
            </div>

            {/* Distortion Warning */}
            <Show when={showDistortionWarning()}>
              <div class="popup-alert popup-alert-warning mt-3">
                <TriangleAlert class="stroke-current shrink-0 h-4 w-4" />
                <span class="text-xs">{m.popup_distortion_warning()}</span>
              </div>
            </Show>
          </div>

          {/* Equalizer */}
          <div class="mt-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-macos-text font-medium">{m.popup_eq()}</span>
              <span class="text-[10px] font-macos-mono text-macos-text-tertiary">
                {activePresetLabel()}
              </span>
            </div>

            <div class="flex flex-wrap gap-1 mb-3">
              <For each={EQ_PRESET_NAMES}>
                {(preset) => (
                  <button
                    type="button"
                    class={cn(
                      "popup-btn popup-btn-ghost popup-btn-xs",
                      activePreset() === preset && "popup-tab-card-active"
                    )}
                    onClick={() => setEQ({ ...EQ_PRESETS[preset] })}
                    aria-pressed={activePreset() === preset}
                  >
                    {presetLabel(preset)}
                  </button>
                )}
              </For>
            </div>

            <For each={EQ_BANDS}>
              {(band) => (
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="text-[11px] text-macos-text-secondary w-10 shrink-0">
                    {band.label()}
                  </span>
                  <Slider.Root
                    value={[eq()[band.key]]}
                    onValueChange={(e) => {
                      const next = e.value[0];
                      if (next !== undefined) setEQ({ ...eq(), [band.key]: next });
                    }}
                    min={-12}
                    max={12}
                    step={1}
                    class="flex-1"
                  >
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumb index={0}>
                        <Slider.HiddenInput />
                      </Slider.Thumb>
                    </Slider.Control>
                  </Slider.Root>
                  <span class="text-[10px] font-macos-mono text-macos-text-tertiary w-10 text-right tabular-nums">
                    {eq()[band.key] > 0 ? "+" : ""}
                    {eq()[band.key]} dB
                  </span>
                </div>
              )}
            </For>
          </div>

          {/* Auto-apply Toggle */}
          <div class="popup-setting-row mt-4">
            <Switch.Root
              checked={autoApply()}
              onCheckedChange={(e) => setAutoApply(e.checked)}
              class="w-full justify-between!"
            >
              <Switch.Label class="text-sm text-macos-text font-medium">
                {m.popup_auto_apply()}
              </Switch.Label>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.HiddenInput />
            </Switch.Root>
          </div>

          {/* Playing Tabs Section */}
          <Show when={showOtherTabs()}>
            <div class="popup-divider mt-3">
              <span>{m.popup_playing_media()}</span>
              <button
                type="button"
                class="popup-btn popup-btn-ghost popup-btn-xs"
                onClick={refreshAllTabsMedia}
                title={m.popup_refresh()}
              >
                <RefreshCw class="h-3 w-3" />
              </button>
            </div>

            <Show when={tabsWithMedia().length > 0}>
              <div class="space-y-1.5 max-h-60 overflow-y-auto">
                <For each={tabsWithMedia()}>
                  {(tab: TabMediaInfo) => {
                    const setTab = (vol: number) =>
                      tab.isActive ? setVolume(vol) : setTabVolume(tab.tabId, vol);
                    const tabPct = () => getTabVolumePercentage(tab.tabId, tab.isActive);
                    const tabMax = () => (tab.isActive ? maxVolumePercent() : 600);
                    return (
                      <div class={cn("popup-tab-card", tab.isActive && "popup-tab-card-active")}>
                        <div class="flex items-center gap-2 mb-2">
                          <Show
                            when={tab.favicon}
                            fallback={
                              <Globe class="w-3.5 h-3.5 text-macos-text-tertiary shrink-0" />
                            }
                          >
                            <img
                              src={tab.favicon}
                              alt=""
                              class="w-3.5 h-3.5 rounded shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </Show>
                          <span class="text-xs text-macos-text truncate flex-1" title={tab.title}>
                            {tab.title}
                          </span>
                          <Show
                            when={tab.isActive}
                            fallback={
                              <button
                                type="button"
                                class="popup-btn popup-btn-ghost popup-btn-xs popup-btn-square shrink-0"
                                onClick={() => focusTab(tab.tabId)}
                                title={m.popup_jump_to_tab()}
                                aria-label={m.popup_jump_to_tab()}
                              >
                                <ExternalLink class="h-3 w-3" />
                              </button>
                            }
                          >
                            <span class="popup-tab-badge shrink-0">{m.popup_active()}</span>
                          </Show>
                        </div>

                        <div class="flex items-center gap-1">
                          <button
                            type="button"
                            class="popup-btn popup-btn-ghost popup-btn-xs popup-btn-square"
                            onClick={() => setTab(0)}
                            title={m.popup_mute()}
                            aria-label={m.popup_mute()}
                          >
                            <VolumeX class="h-3.5 w-3.5" />
                          </button>

                          <span class="text-[11px] font-macos-mono text-macos-text-secondary w-9 text-center tabular-nums">
                            {tabPct()}%
                          </span>

                          <Slider.Root
                            value={[tabPct()]}
                            onValueChange={(e) => {
                              const next = e.value[0];
                              if (next !== undefined) setTab(next / 100);
                            }}
                            min={0}
                            max={tabMax()}
                            step={1}
                            class="flex-1"
                          >
                            <Slider.Control>
                              <Slider.Track>
                                <Slider.Range
                                  data-volume-level={getVolumeLevel(
                                    getTabVolume(tab.tabId, tab.isActive)
                                  )}
                                />
                              </Slider.Track>
                              <Slider.Thumb index={0}>
                                <Slider.HiddenInput />
                              </Slider.Thumb>
                            </Slider.Control>
                          </Slider.Root>

                          <button
                            type="button"
                            class="popup-btn popup-btn-ghost popup-btn-xs popup-btn-square"
                            onClick={() => setTab(tab.isActive ? maxVolumePercent() / 100 : 6)}
                            title={m.popup_max_volume()}
                            aria-label={m.popup_max_volume()}
                          >
                            <Volume2 class="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>

            <Show when={tabsWithMedia().length === 0}>
              <div class="text-center text-xs text-macos-text-tertiary py-3">
                {m.popup_no_playing_media()}
              </div>
            </Show>
          </Show>
        </Show>

        {/* No Domain State */}
        <Show when={!isLoading() && !domain()}>
          <div class="popup-alert popup-alert-warning mt-4">
            <TriangleAlert class="stroke-current shrink-0 h-4 w-4" />
            <span class="text-xs">{m.popup_open_website()}</span>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default App;
