import { Globe, Search, Trash2 } from "lucide-solid";
import { createSignal, For, onMount, Show } from "solid-js";
import { type TranslatorFn, useI18n } from "@/utils/i18n";
import {
  getAllDomainSettings,
  removeDomainSettings,
  type StoredDomainEntry,
  saveDomainSettings,
} from "@/utils/storage";

export default function DomainManager() {
  const { t } = useI18n();
  const [domains, setDomains] = createSignal<StoredDomainEntry[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [notification, setNotification] = createSignal<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load all domain settings on mount
  onMount(async () => {
    await refreshDomains();
  });

  async function refreshDomains() {
    setIsLoading(true);
    try {
      const allDomains = await getAllDomainSettings();
      setDomains(allDomains);
    } catch (error) {
      console.error("[VolumeHero] Failed to load domains:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function showNotification(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 2000);
  }

  async function handleDeleteDomain(domain: string) {
    if (!confirm(t("domains.deleteConfirm"))) return;
    try {
      await removeDomainSettings(domain);
      setDomains((prev) => prev.filter((d) => d.domain !== domain));
      showNotification("success", t("domains.deleted"));
    } catch (error) {
      console.error("[VolumeHero] Failed to delete domain:", error);
      showNotification("error", "Failed to delete");
    }
  }

  async function handleAutoApplyChange(domain: string, autoApply: boolean) {
    try {
      await saveDomainSettings(domain, { autoApply });
      setDomains((prev) =>
        prev.map((d) =>
          d.domain === domain
            ? {
                ...d,
                settings: {
                  ...d.settings,
                  autoApply,
                  lastApplied: Date.now(),
                },
              }
            : d
        )
      );
      showNotification("success", t("domains.updated"));
    } catch (error) {
      console.error("[VolumeHero] Failed to update auto-apply:", error);
      showNotification("error", "Failed to update");
    }
  }

  const filteredDomains = () => {
    const query = searchQuery().toLowerCase();
    if (!query) return domains();
    return domains().filter((d) => d.domain.toLowerCase().includes(query));
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div class="space-y-4">
      {/* Notification */}
      <Show when={notification()}>
        <div
          class={cn(
            "alert py-2",
            notification()?.type === "success" ? "alert-success" : "alert-error"
          )}
        >
          <span class="text-sm">{notification()?.message}</span>
        </div>
      </Show>

      {/* Search Bar */}
      <label class="input input-bordered flex items-center gap-2 bg-base-300/50 focus-within:border-primary focus-within:outline-none">
        <Search class="h-4 w-4 text-base-content/50" />
        <input
          type="text"
          placeholder={t("domains.search")}
          class="grow bg-transparent border-none outline-none placeholder:text-base-content/40"
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.target.value)}
        />
        <Show when={searchQuery()}>
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle hover:bg-base-content/10"
            onClick={() => setSearchQuery("")}
          >
            ✕
          </button>
        </Show>
      </label>

      {/* Loading State */}
      <Show when={isLoading()}>
        <div class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg" />
        </div>
      </Show>

      {/* Empty State */}
      <Show when={!isLoading() && domains().length === 0}>
        <div class="text-center py-8 text-base-content/60">
          <Globe class="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("domains.noDomains")}</p>
        </div>
      </Show>

      {/* Domain List */}
      <Show when={!isLoading() && filteredDomains().length > 0}>
        <div class="space-y-3">
          <For each={filteredDomains()}>
            {(entry) => (
              <DomainCard
                entry={entry}
                onDelete={() => handleDeleteDomain(entry.domain)}
                onAutoApplyChange={(val) =>
                  handleAutoApplyChange(entry.domain, val)
                }
                formatDate={formatDate}
                t={t}
              />
            )}
          </For>
        </div>
      </Show>

      {/* No Search Results */}
      <Show
        when={
          !isLoading() && domains().length > 0 && filteredDomains().length === 0
        }
      >
        <div class="text-center py-8 text-base-content/60">
          <Search class="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No domains match your search</p>
        </div>
      </Show>
    </div>
  );
}

interface DomainCardProps {
  entry: StoredDomainEntry;
  onDelete: () => void;
  onAutoApplyChange: (autoApply: boolean) => void;
  formatDate: (timestamp: number) => string;
  t: TranslatorFn;
}

function DomainCard(props: DomainCardProps) {
  return (
    <div class="card bg-base-200 shadow">
      <div class="card-body p-4">
        {/* Domain Header */}
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Globe class="h-4 w-4 text-base-content/60" />
            <span class="font-medium">{props.entry.domain}</span>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square text-error hover:bg-error/20"
            onClick={props.onDelete}
            title={props.t("delete")}
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>

        {/* Volume Display & Auto-apply Toggle */}
        <div class="flex items-center justify-between mt-3">
          <label class="label cursor-pointer gap-2 p-0">
            <input
              type="checkbox"
              class="toggle toggle-xs toggle-primary"
              checked={props.entry.settings.autoApply}
              onChange={(e) => props.onAutoApplyChange(e.target.checked)}
            />
            <span class="label-text text-xs">
              {props.t("domains.autoApply")}
            </span>
          </label>
          <span class="text-xs text-base-content/50">
            {props.t("domains.lastApplied")}:{" "}
            {props.formatDate(props.entry.settings.lastApplied)}
          </span>
        </div>
      </div>
    </div>
  );
}
