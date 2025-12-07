import { Slider } from "@ark-ui/solid/slider";
import { Switch } from "@ark-ui/solid/switch";
import { Tooltip } from "@ark-ui/solid/tooltip";
import {
  ExternalLink,
  Globe,
  Info,
  RefreshCw,
  Settings,
  TriangleAlert,
  Volume2,
  VolumeX,
} from "lucide-solid";
import { createMemo, For, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useVolumeControl } from "@/hooks/useVolumeControl";
import { cn } from "@/utils/cn";
import { useI18n } from "@/utils/i18n";
import type { TabMediaInfo } from "@/utils/volume";

// Volume visual indicator component with scaling SVG and color gradient
function VolumeIndicator(props: { volume: number }) {
  // Calculate gradient color based on volume (0-600%)
  const gradientColors = createMemo(() => {
    const vol = props.volume * 100; // Convert to percentage
    // Color stops: 0% = blue, 100% = green, 200% = yellow, 400% = orange, 600% = red
    if (vol <= 100) {
      // Blue to Green (0-100%)
      const t = vol / 100;
      return {
        start: `hsl(${200 - t * 80}, 70%, 50%)`, // Blue to Green
        end: `hsl(${200 - t * 80}, 70%, 65%)`,
      };
    } else if (vol <= 200) {
      // Green to Yellow (100-200%)
      const t = (vol - 100) / 100;
      return {
        start: `hsl(${120 - t * 60}, 70%, 50%)`, // Green to Yellow
        end: `hsl(${120 - t * 60}, 70%, 65%)`,
      };
    } else if (vol <= 400) {
      // Yellow to Orange (200-400%)
      const t = (vol - 200) / 200;
      return {
        start: `hsl(${60 - t * 30}, 80%, 50%)`, // Yellow to Orange
        end: `hsl(${60 - t * 30}, 80%, 60%)`,
      };
    } else {
      // Orange to Red (400-600%)
      const t = Math.min((vol - 400) / 200, 1);
      return {
        start: `hsl(${30 - t * 30}, 90%, 50%)`, // Orange to Red
        end: `hsl(${30 - t * 30}, 90%, 60%)`,
      };
    }
  });

  // Scale factor: minimum 0.3, maximum 1.0 based on volume
  const scale = createMemo(() => {
    const vol = props.volume * 100;
    return 0.3 + (vol / 600) * 0.7;
  });

  // Opacity based on volume
  const opacity = createMemo(() => {
    const vol = props.volume * 100;
    return Math.max(0.2, Math.min(0.6, 0.2 + (vol / 600) * 0.4));
  });

  return (
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        class="transition-all duration-300 ease-out"
        style={{
          width: `${scale() * 100}%`,
          height: `${scale() * 100}%`,
          opacity: opacity(),
        }}
      >
        <defs>
          <linearGradient id="volumeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color={gradientColors().start} />
            <stop offset="100%" stop-color={gradientColors().end} />
          </linearGradient>
        </defs>
        {/* Sound wave circles expanding outward */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#volumeGradient)"
          stroke-width="2"
          opacity="0.3"
        />
        <circle
          cx="50"
          cy="50"
          r="35"
          fill="none"
          stroke="url(#volumeGradient)"
          stroke-width="3"
          opacity="0.5"
        />
        <circle
          cx="50"
          cy="50"
          r="25"
          fill="none"
          stroke="url(#volumeGradient)"
          stroke-width="4"
          opacity="0.7"
        />
        {/* Center filled circle */}
        <circle cx="50" cy="50" r="15" fill="url(#volumeGradient)" />
      </svg>
    </div>
  );
}

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
    setVolume,
    setAutoApply,
    resetVolume,
    setTabVolume,
    focusTab,
    refreshAllTabsMedia,
  } = useVolumeControl();

  const openOptionsPage = () => {
    browser.runtime.openOptionsPage();
  };

  const volumePercentage = () => Math.round(volume() * 100);

  // Get max volume from global settings (default 600%)
  const maxVolumePercent = () => (globalSettings()?.maxVolumeLimit ?? 6) * 100;

  // Get volume step from global settings (default 10%)
  const volumeStep = () => globalSettings()?.volumeStepSize ?? 0.1;

  // Check if other tabs section should be shown
  const showOtherTabs = () => globalSettings()?.showOtherTabsSection ?? true;

  // Keyboard shortcut handler for arrow keys
  const handleKeyDown = (e: KeyboardEvent) => {
    // Only handle when domain is present (volume controls are available)
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

  // Set up keyboard event listeners
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

  // Check if current volume causes potential distortion
  const showDistortionWarning = () => volume() > 2.0;

  // For active tab, use the main volume() signal for real-time sync
  const getTabVolume = (tabId: number, isActive: boolean) => {
    if (isActive) {
      return volume();
    }
    return tabVolumes().get(tabId) ?? 1.0;
  };

  const getTabVolumePercentage = (tabId: number, isActive: boolean) => {
    return Math.round(getTabVolume(tabId, isActive) * 100);
  };

  return (
    <div class="popup-card">
      <div class="popup-card-body">
        {/* Header */}
        <div class="flex items-center justify-between">
          <h2 class="popup-card-title">🔊 {m.popup_title()}</h2>
          <div class="flex items-center gap-1">
            {/* Keyboard Shortcuts Tooltip */}
            <Show when={domain()}>
              <Tooltip.Root openDelay={100} closeDelay={0}>
                <Tooltip.Trigger class="popup-btn popup-btn-ghost popup-btn-sm popup-btn-square">
                  <Info class="h-5 w-5 opacity-60" />
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
            {/* Settings Button */}
            <button
              type="button"
              class="popup-btn popup-btn-ghost popup-btn-sm popup-btn-square"
              onClick={openOptionsPage}
              title={m.settings_title()}
            >
              <Settings class="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Loading Skeleton - shows only during initial async load */}
        <Show when={isLoading()}>
          <div class="mt-4 animate-pulse">
            <div class="relative rounded-macos-md p-3 mb-2 overflow-hidden">
              <div class="flex justify-between items-center">
                <div class="h-4 w-16 bg-macos-input rounded" />
                <div class="h-8 w-16 bg-macos-input rounded" />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-8 w-8 bg-macos-input rounded" />
              <div class="h-2 flex-1 bg-macos-input rounded" />
              <div class="h-8 w-8 bg-macos-input rounded" />
            </div>
          </div>
        </Show>

        {/* Volume Slider */}
        <Show when={!isLoading() && domain()}>
          <div class="mt-4">
            {/* Volume Display with Visual Indicator */}
            <div class="relative rounded-macos-md p-3 mb-2 overflow-hidden">
              <VolumeIndicator volume={volume()} />
              <div class="relative z-10 flex justify-between items-center">
                <span class="text-sm font-medium text-macos-text">{m.popup_volume()}</span>
                <span
                  class={cn(
                    "text-2xl font-bold tabular-nums transition-colors duration-300",
                    volume() <= 1 && "text-macos-success",
                    volume() > 1 && volume() <= 2 && "text-macos-warning",
                    volume() > 2 && "text-macos-error"
                  )}
                >
                  {volumePercentage()}%
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              {/* Mute Button */}
              <button
                type="button"
                class="popup-btn popup-btn-ghost popup-btn-sm popup-btn-square"
                onClick={() => setVolume(0)}
                title={m.popup_mute()}
              >
                <VolumeX class="h-5 w-5" />
              </button>

              {/* Volume Slider */}
              <Slider.Root
                value={[volumePercentage()]}
                onValueChange={(e) => setVolume(e.value[0] / 100)}
                min={0}
                max={maxVolumePercent()}
                step={1}
                class="flex-1"
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

              {/* Max Volume Button */}
              <button
                type="button"
                class="popup-btn popup-btn-ghost popup-btn-sm popup-btn-square"
                onClick={() => setVolume(globalSettings()?.maxVolumeLimit ?? 6)}
                title={m.popup_max_volume()}
              >
                <Volume2 class="h-5 w-5" />
              </button>
            </div>
            <div class="flex justify-between text-xs mt-1 px-1 font-medium">
              <span style={{ color: "hsl(200, 70%, 55%)" }}>0%</span>
              <Show when={maxVolumePercent() >= 200}>
                <span style={{ color: "hsl(60, 70%, 50%)" }}>200%</span>
              </Show>
              <Show when={maxVolumePercent() >= 400}>
                <span style={{ color: "hsl(30, 80%, 50%)" }}>400%</span>
              </Show>
              <span style={{ color: "hsl(0, 90%, 55%)" }}>{maxVolumePercent()}%</span>
            </div>

            {/* Distortion Warning */}
            <Show when={showDistortionWarning()}>
              <div class="popup-alert popup-alert-warning mt-2">
                <TriangleAlert class="stroke-current shrink-0 h-4 w-4" />
                <span class="text-xs">{m.popup_distortion_warning()}</span>
              </div>
            </Show>
          </div>

          {/* Auto-apply Toggle */}
          <div class="mt-4">
            <Switch.Root checked={autoApply()} onCheckedChange={(e) => setAutoApply(e.checked)}>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label>{m.popup_auto_apply()}</Switch.Label>
              <Switch.HiddenInput />
            </Switch.Root>
          </div>

          {/* Reset Button */}
          <div class="mt-4">
            <button
              type="button"
              class="popup-btn popup-btn-soft w-full rounded-macos-md py-2 transition-all duration-200"
              onClick={resetVolume}
              disabled={volume() === 1.0}
            >
              {m.popup_reset_to_100()}
            </button>
          </div>

          {/* Playing Tabs Section - only show if enabled in settings */}
          <Show when={showOtherTabs()}>
            <div class="popup-divider">
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

            <Show when={tabsWithMedia().filter((t) => !t.isActive).length > 0}>
              <div class="space-y-2 max-h-60 overflow-y-auto">
                <For each={tabsWithMedia().filter((t) => !t.isActive)}>
                  {(tab: TabMediaInfo) => (
                    <div class="popup-tab-card">
                      {/* Row 1: Favicon | Title */}
                      <div class="flex items-center gap-2 mb-2">
                        <Show
                          when={tab.favicon}
                          fallback={<Globe class="w-4 h-4 text-macos-text-secondary" />}
                        >
                          <img
                            src={tab.favicon}
                            alt=""
                            class="w-4 h-4 rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </Show>
                        <span
                          class="text-xs font-medium text-macos-text truncate flex-1"
                          title={tab.title}
                        >
                          {tab.title}
                        </span>
                      </div>

                      {/* Row 2: Volume Slider | Buttons */}
                      <div class="flex items-center gap-1">
                        {/* Mute Button */}
                        <button
                          type="button"
                          class="popup-btn popup-btn-ghost popup-btn-xs popup-btn-square"
                          onClick={() => setTabVolume(tab.tabId, 0)}
                          title={m.popup_mute()}
                        >
                          <VolumeX class="h-4 w-4" />
                        </button>

                        {/* Volume Percentage */}
                        <span class="text-xs text-macos-text-secondary w-10 text-center tabular-nums">
                          {getTabVolumePercentage(tab.tabId, false)}%
                        </span>

                        {/* Volume Slider */}
                        <Slider.Root
                          value={[getTabVolumePercentage(tab.tabId, false)]}
                          onValueChange={(e) => setTabVolume(tab.tabId, e.value[0] / 100)}
                          min={0}
                          max={600}
                          step={1}
                          class="flex-1"
                        >
                          <Slider.Control>
                            <Slider.Track>
                              <Slider.Range
                                data-volume-level={getVolumeLevel(getTabVolume(tab.tabId, false))}
                              />
                            </Slider.Track>
                            <Slider.Thumb index={0}>
                              <Slider.HiddenInput />
                            </Slider.Thumb>
                          </Slider.Control>
                        </Slider.Root>

                        {/* Max Volume Button */}
                        <button
                          type="button"
                          class="popup-btn popup-btn-ghost popup-btn-xs popup-btn-square"
                          onClick={() => setTabVolume(tab.tabId, 6)}
                          title={m.popup_max_volume()}
                        >
                          <Volume2 class="h-4 w-4" />
                        </button>

                        {/* Jump to Tab Button */}
                        <button
                          type="button"
                          class="popup-btn popup-btn-ghost popup-btn-xs popup-btn-square"
                          onClick={() => focusTab(tab.tabId)}
                          title={m.popup_jump_to_tab()}
                        >
                          <ExternalLink class="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            {/* No Media State */}
            <Show when={tabsWithMedia().filter((t) => !t.isActive).length === 0}>
              <div class="text-center text-xs text-macos-text-tertiary py-2">
                {m.popup_no_playing_media()}
              </div>
            </Show>
          </Show>
        </Show>

        {/* No Domain State */}
        <Show when={!isLoading() && !domain()}>
          <div class="popup-alert popup-alert-warning mt-4">
            <TriangleAlert class="stroke-current shrink-0 h-5 w-5" />
            <span class="text-xs">{m.popup_open_website()}</span>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default App;
