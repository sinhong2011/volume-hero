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
          <linearGradient
            id="volumeGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
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

  // Keyboard shortcut handler for arrow keys
  const handleKeyDown = (e: KeyboardEvent) => {
    // Only handle when domain is present (volume controls are available)
    if (!domain()) return;

    const step = e.shiftKey ? 0.5 : 0.1; // 50% with Shift, 10% without

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        setVolume(Math.min(6, volume() + step));
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

  const handleSliderChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const newVolume = parseInt(target.value, 10) / 100;
    setVolume(newVolume);
  };

  const handleTabSliderChange = (
    tabId: number,
    isActive: boolean,
    e: Event
  ) => {
    const target = e.target as HTMLInputElement;
    const newVolume = parseInt(target.value, 10) / 100;
    // For active tab, update the main volume slider as well
    if (isActive) {
      setVolume(newVolume);
    }
    setTabVolume(tabId, newVolume);
  };

  const getVolumeColor = (vol: number) => {
    if (vol <= 1.0) return "range-success";
    if (vol <= 3.0) return "range-warning";
    return "range-error";
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
    <div class="card bg-base-200 w-80 shadow-xl">
      <div class="card-body p-4">
        {/* Header */}
        <div class="flex items-center justify-between">
          <h2 class="card-title text-lg">🔊 {m.popup_title()}</h2>
          <div class="flex items-center gap-1">
            {/* Keyboard Shortcuts Tooltip */}
            <Show when={domain()}>
              <div class="dropdown dropdown-end dropdown-hover">
                <button
                  type="button"
                  tabIndex={0}
                  class="btn btn-ghost btn-sm btn-square"
                >
                  <Info class="h-5 w-5 opacity-60" />
                </button>
                <div class="dropdown-content z-50 bg-base-300 rounded-lg shadow-lg p-3 w-64 right-0">
                  <div class="text-xs">
                    <p class="font-semibold text-base-content pb-1 mb-2 border-b border-base-content/20">
                      {m.popup_shortcuts_popup()}
                    </p>
                    <table class="w-full">
                      <tbody>
                        <tr>
                          <td class="py-0.5 pr-3 whitespace-nowrap">
                            <kbd class="kbd kbd-xs">↑</kbd>{" "}
                            <kbd class="kbd kbd-xs">↓</kbd>
                          </td>
                          <td class="py-0.5 text-base-content/70 text-right">
                            {m.popup_shortcuts_arrow_keys()}
                          </td>
                        </tr>
                        <tr>
                          <td class="py-0.5 pr-3 whitespace-nowrap">
                            <kbd class="kbd kbd-xs">Shift</kbd>+
                            <kbd class="kbd kbd-xs">↑↓</kbd>
                          </td>
                          <td class="py-0.5 text-base-content/70 text-right">
                            {m.popup_shortcuts_shift_arrow_keys()}
                          </td>
                        </tr>
                        <tr>
                          <td class="py-0.5 pr-3 whitespace-nowrap">
                            <kbd class="kbd kbd-xs">M</kbd>
                          </td>
                          <td class="py-0.5 text-base-content/70 text-right">
                            {m.popup_shortcuts_mute()}
                          </td>
                        </tr>
                        <tr>
                          <td class="py-0.5 pr-3 whitespace-nowrap">
                            <kbd class="kbd kbd-xs">R</kbd>
                          </td>
                          <td class="py-0.5 text-base-content/70 text-right">
                            {m.popup_shortcuts_reset()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p class="font-semibold text-base-content pt-2 pb-1 mb-2 border-b border-base-content/20">
                      {m.popup_shortcuts_global()}
                    </p>
                    <table class="w-full">
                      <tbody>
                        <tr>
                          <td class="py-0.5 pr-3 whitespace-nowrap">
                            <kbd class="kbd kbd-xs">Alt</kbd>+
                            <kbd class="kbd kbd-xs">Shift</kbd>+
                            <kbd class="kbd kbd-xs">↑</kbd>
                          </td>
                          <td class="py-0.5 text-base-content/70 text-right">
                            {m.popup_shortcuts_global_up()}
                          </td>
                        </tr>
                        <tr>
                          <td class="py-0.5 pr-3 whitespace-nowrap">
                            <kbd class="kbd kbd-xs">Alt</kbd>+
                            <kbd class="kbd kbd-xs">Shift</kbd>+
                            <kbd class="kbd kbd-xs">↓</kbd>
                          </td>
                          <td class="py-0.5 text-base-content/70 text-right">
                            {m.popup_shortcuts_global_down()}
                          </td>
                        </tr>
                        <tr>
                          <td class="py-0.5 pr-3 whitespace-nowrap">
                            <kbd class="kbd kbd-xs">Alt</kbd>+
                            <kbd class="kbd kbd-xs">Shift</kbd>+
                            <kbd class="kbd kbd-xs">R</kbd>
                          </td>
                          <td class="py-0.5 text-base-content/70 text-right">
                            {m.popup_shortcuts_global_reset()}
                          </td>
                        </tr>
                        <tr>
                          <td class="py-0.5 pr-3 whitespace-nowrap">
                            <kbd class="kbd kbd-xs">Alt</kbd>+
                            <kbd class="kbd kbd-xs">Shift</kbd>+
                            <kbd class="kbd kbd-xs">M</kbd>
                          </td>
                          <td class="py-0.5 text-base-content/70 text-right">
                            {m.popup_shortcuts_global_mute()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Show>
            {/* Settings Button */}
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              onClick={openOptionsPage}
              title={m.settings_title()}
            >
              <Settings class="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Volume Slider */}
        <Show when={!isLoading() && domain()}>
          <div class="mt-4">
            {/* Volume Display with Visual Indicator */}
            <div class="relative rounded-lg p-3 mb-2 overflow-hidden">
              <VolumeIndicator volume={volume()} />
              <div class="relative z-10 flex justify-between items-center">
                <span class="text-sm font-medium">{m.popup_volume()}</span>
                <span
                  class={cn(
                    "text-2xl font-bold tabular-nums transition-colors duration-300",
                    volume() <= 1 && "text-success",
                    volume() > 1 && volume() <= 2 && "text-warning",
                    volume() > 2 && "text-error"
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
                class="btn btn-ghost btn-sm btn-square"
                onClick={() => setVolume(0)}
                title={m.popup_mute()}
              >
                <VolumeX class="h-5 w-5" />
              </button>

              {/* Volume Slider */}
              <input
                type="range"
                min="0"
                max="600"
                value={volumePercentage()}
                onInput={handleSliderChange}
                class={cn(
                  "range range-sm flex-1 transition-all duration-200",
                  getVolumeColor(volume())
                )}
              />

              {/* Max Volume Button */}
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square"
                onClick={() => setVolume(6)}
                title={m.popup_max_volume()}
              >
                <Volume2 class="h-5 w-5" />
              </button>
            </div>
            <div class="flex justify-between text-xs mt-1 px-1 font-medium">
              <span style={{ color: "hsl(200, 70%, 55%)" }}>0%</span>
              <span style={{ color: "hsl(60, 70%, 50%)" }}>200%</span>
              <span style={{ color: "hsl(30, 80%, 50%)" }}>400%</span>
              <span style={{ color: "hsl(0, 90%, 55%)" }}>600%</span>
            </div>

            {/* Distortion Warning */}
            <Show when={showDistortionWarning()}>
              <div class="alert alert-warning py-2 px-3 mt-2">
                <TriangleAlert class="stroke-current shrink-0 h-4 w-4" />
                <span class="text-xs">{m.popup_distortion_warning()}</span>
              </div>
            </Show>
          </div>

          {/* Auto-apply Toggle */}
          <div class="form-control mt-4">
            <label class="label cursor-pointer justify-start gap-3 py-1">
              <input
                type="checkbox"
                class="toggle toggle-sm toggle-primary"
                checked={autoApply()}
                onChange={(e) => setAutoApply(e.target.checked)}
              />
              <span class="label-text text-sm">{m.popup_auto_apply()}</span>
            </label>
          </div>

          {/* Reset Button */}
          <div class="card-actions mt-4">
            <button
              type="button"
              class="btn btn-sm btn-soft w-full rounded-lg transition-all duration-200 bg-base-600"
              onClick={resetVolume}
              disabled={volume() === 1.0}
            >
              {m.popup_reset_to_100()}
            </button>
          </div>

          {/* Playing Tabs Section */}
          <div class="divider my-2 text-xs text-base-content/50">
            <span>{m.popup_playing_media()}</span>
            <button
              type="button"
              class="btn btn-ghost btn-xs"
              onClick={refreshAllTabsMedia}
              title={m.popup_refresh()}
            >
              <RefreshCw class="h-3 w-3" />
            </button>
          </div>

          <Show when={tabsWithMedia().length > 0}>
            <div class="space-y-2 max-h-60 overflow-y-auto">
              <For each={tabsWithMedia()}>
                {(tab: TabMediaInfo) => (
                  <div class="bg-base-300 rounded-lg px-3 py-2">
                    {/* Row 1: Favicon | Title */}
                    <div class="flex items-center gap-2 mb-2">
                      <Show
                        when={tab.favicon}
                        fallback={<Globe class="w-4 h-4" />}
                      >
                        <img
                          src={tab.favicon}
                          alt=""
                          class="w-4 h-4 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </Show>
                      <span
                        class="text-xs font-medium truncate flex-1"
                        title={tab.title}
                      >
                        {tab.title}
                      </span>
                      <Show when={tab.isActive}>
                        <span class="badge badge-xs badge-primary">
                          {m.popup_active()}
                        </span>
                      </Show>
                    </div>

                    {/* Row 2: Volume Slider | Buttons */}
                    <div class="flex items-center gap-1">
                      {/* Mute Button */}
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs btn-square"
                        onClick={() => {
                          if (tab.isActive) setVolume(0);
                          setTabVolume(tab.tabId, 0);
                        }}
                        title={m.popup_mute()}
                      >
                        <VolumeX class="h-4 w-4" />
                      </button>

                      {/* Volume Percentage */}
                      <span class="text-xs text-base-content/60 w-10 text-center">
                        {getTabVolumePercentage(tab.tabId, tab.isActive)}%
                      </span>

                      {/* Volume Slider */}
                      <input
                        type="range"
                        min="0"
                        max="600"
                        value={getTabVolumePercentage(tab.tabId, tab.isActive)}
                        onInput={(e) =>
                          handleTabSliderChange(tab.tabId, tab.isActive, e)
                        }
                        class={cn(
                          "range range-xs flex-1",
                          getVolumeColor(getTabVolume(tab.tabId, tab.isActive))
                        )}
                      />

                      {/* Max Volume Button */}
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs btn-square"
                        onClick={() => {
                          if (tab.isActive) setVolume(6);
                          setTabVolume(tab.tabId, 6);
                        }}
                        title={m.popup_max_volume()}
                      >
                        <Volume2 class="h-4 w-4" />
                      </button>

                      {/* Jump to Tab Button */}
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs btn-square"
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
          <Show when={tabsWithMedia().length === 0}>
            <div class="text-center text-xs text-base-content/50 py-2">
              {m.popup_no_playing_media()}
            </div>
          </Show>
        </Show>

        {/* No Domain State */}
        <Show when={!isLoading() && !domain()}>
          <div class="alert alert-warning mt-4">
            <TriangleAlert class="stroke-current shrink-0 h-5 w-5" />
            <span class="text-xs">{m.popup_open_website()}</span>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default App;
