import { Ban, Globe, Search, Trash2 } from "lucide-solid";
import { createSignal, For, onMount, Show } from "solid-js";
import toast from "solid-toast";
import { type Messages, useI18n } from "@/utils/i18n";
import {
  addToBlacklist,
  clearAllDomainSettings,
  getAllDomainSettings,
  getGlobalSettings,
  removeDomainSettings,
  removeFromBlacklist,
  removeMultipleDomainSettings,
  type StoredDomainEntry,
  saveDomainSettings,
} from "@/utils/storage";

export default function DomainManager() {
  const { m } = useI18n();
  const [domains, setDomains] = createSignal<StoredDomainEntry[]>([]);
  const [blacklist, setBlacklist] = createSignal<string[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedDomains, setSelectedDomains] = createSignal<Set<string>>(new Set());
  const [showBlacklist, setShowBlacklist] = createSignal(false);
  const [newBlacklistDomain, setNewBlacklistDomain] = createSignal("");

  // Load all domain settings on mount
  onMount(async () => {
    await refreshDomains();
    await refreshBlacklist();
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

  async function refreshBlacklist() {
    const settings = await getGlobalSettings();
    setBlacklist(settings.blacklistedDomains);
  }

  async function handleDeleteDomain(domain: string) {
    if (!confirm(m.domains_delete_confirm())) return;
    try {
      await removeDomainSettings(domain);
      setDomains((prev) => prev.filter((d) => d.domain !== domain));
      setSelectedDomains((prev) => {
        prev.delete(domain);
        return new Set(prev);
      });
      toast.success(m.domains_deleted());
    } catch (error) {
      console.error("[VolumeHero] Failed to delete domain:", error);
      toast.error("Failed to delete");
    }
  }

  async function handleBulkDelete() {
    const selected = Array.from(selectedDomains());
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} selected domains?`)) return;
    try {
      await removeMultipleDomainSettings(selected);
      setDomains((prev) => prev.filter((d) => !selected.includes(d.domain)));
      setSelectedDomains(new Set<string>());
      toast.success(m.domains_deleted());
    } catch (error) {
      console.error("[VolumeHero] Failed to bulk delete:", error);
      toast.error("Failed to delete");
    }
  }

  async function handleClearAll() {
    if (!confirm(m.domains_clear_confirm())) return;
    try {
      await clearAllDomainSettings();
      setDomains([]);
      setSelectedDomains(new Set<string>());
      toast.success(m.domains_cleared());
    } catch (error) {
      console.error("[VolumeHero] Failed to clear all:", error);
      toast.error("Failed to clear");
    }
  }

  async function handleAddToBlacklist() {
    const domain = newBlacklistDomain().trim();
    if (!domain) return;
    await addToBlacklist(domain);
    await refreshBlacklist();
    setNewBlacklistDomain("");
    toast.success(m.blacklist_added());
  }

  async function handleRemoveFromBlacklist(domain: string) {
    await removeFromBlacklist(domain);
    await refreshBlacklist();
    toast.success(m.blacklist_removed());
  }

  function toggleDomainSelection(domain: string) {
    setSelectedDomains((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(domain)) newSet.delete(domain);
      else newSet.add(domain);
      return newSet;
    });
  }

  function toggleSelectAll() {
    const filtered = filteredDomains();
    if (selectedDomains().size === filtered.length) {
      setSelectedDomains(new Set<string>());
    } else {
      setSelectedDomains(new Set<string>(filtered.map((d) => d.domain)));
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
                settings: { ...d.settings, autoApply, lastApplied: Date.now() },
              }
            : d
        )
      );
      toast.success(m.domains_updated());
    } catch (error) {
      console.error("[VolumeHero] Failed to update auto-apply:", error);
      toast.error("Failed to update");
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
    <>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "8px", "margin-bottom": "16px" }}>
        <button
          type="button"
          class={`macos-button ${showBlacklist() ? "macos-button-primary" : ""}`}
          onClick={() => setShowBlacklist(!showBlacklist())}
        >
          <Ban class="h-4 w-4" style={{ display: "inline", "margin-right": "6px" }} />{" "}
          {m.blacklist_title()}
        </button>
        <Show when={selectedDomains().size > 0}>
          <button type="button" class="macos-button macos-button-danger" onClick={handleBulkDelete}>
            <Trash2 class="h-4 w-4" style={{ display: "inline", "margin-right": "6px" }} />{" "}
            {m.domains_bulk_delete()} ({selectedDomains().size})
          </button>
        </Show>
        <Show when={domains().length > 0}>
          <button type="button" class="macos-button macos-button-danger" onClick={handleClearAll}>
            {m.domains_clear_all()}
          </button>
        </Show>
      </div>

      {/* Blacklist Section */}
      <Show when={showBlacklist()}>
        <div class="macos-card" style={{ "margin-bottom": "16px" }}>
          <div class="macos-card-item" style={{ display: "block" }}>
            <p class="macos-card-label-title" style={{ "margin-bottom": "8px" }}>
              <Ban class="h-4 w-4" style={{ display: "inline", "margin-right": "6px" }} />
              {m.blacklist_title()}
            </p>
            <p class="macos-card-label-description" style={{ "margin-bottom": "12px" }}>
              {m.blacklist_description()}
            </p>
            <div style={{ display: "flex", gap: "8px", "margin-bottom": "12px" }}>
              <input
                type="text"
                class="macos-input"
                style={{ flex: 1 }}
                placeholder="example.com"
                value={newBlacklistDomain()}
                onInput={(e) => setNewBlacklistDomain(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddToBlacklist()}
              />
              <button
                type="button"
                class="macos-button macos-button-primary"
                onClick={handleAddToBlacklist}
              >
                {m.blacklist_add()}
              </button>
            </div>
            <Show when={blacklist().length === 0}>
              <p class="macos-card-label-description">{m.blacklist_empty()}</p>
            </Show>
            <div class="macos-chip-group">
              <For each={blacklist()}>
                {(domain) => (
                  <span
                    class="macos-chip"
                    style={{
                      display: "inline-flex",
                      "align-items": "center",
                      gap: "6px",
                    }}
                  >
                    {domain}
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--macos-text-secondary)",
                        padding: "0",
                      }}
                      onClick={() => handleRemoveFromBlacklist(domain)}
                    >
                      ✕
                    </button>
                  </span>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* Search Bar */}
      <div
        style={{
          display: "flex",
          "align-items": "center",
          gap: "8px",
          background: "var(--macos-input-bg)",
          border: "1px solid var(--macos-input-border)",
          "border-radius": "var(--macos-radius-sm)",
          padding: "8px 12px",
          "margin-bottom": "12px",
        }}
      >
        <Search
          style={{
            width: "16px",
            height: "16px",
            color: "var(--macos-text-tertiary)",
          }}
        />
        <input
          type="text"
          placeholder={m.domains_search()}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--macos-text-primary)",
            "font-size": "13px",
          }}
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.target.value)}
        />
        <Show when={searchQuery()}>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--macos-text-secondary)",
              padding: "0",
            }}
            onClick={() => setSearchQuery("")}
          >
            ✕
          </button>
        </Show>
      </div>

      {/* Select All / Selection Info */}
      <Show when={filteredDomains().length > 0}>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
            "font-size": "12px",
            "margin-bottom": "12px",
          }}
        >
          <label
            style={{
              display: "flex",
              "align-items": "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={
                selectedDomains().size === filteredDomains().length && filteredDomains().length > 0
              }
              onChange={toggleSelectAll}
            />
            <span style={{ color: "var(--macos-text-primary)" }}>{m.select_all()}</span>
          </label>
          <Show when={selectedDomains().size > 0}>
            <span style={{ color: "var(--macos-text-secondary)" }}>
              ({selectedDomains().size} {m.domains_selected()})
            </span>
          </Show>
        </div>
      </Show>

      {/* Loading State */}
      <Show when={isLoading()}>
        <div
          style={{
            display: "flex",
            "justify-content": "center",
            padding: "32px 0",
          }}
        >
          <span class="macos-spinner" />
        </div>
      </Show>

      {/* Empty State */}
      <Show when={!isLoading() && domains().length === 0}>
        <div
          style={{
            "text-align": "center",
            padding: "32px 0",
            color: "var(--macos-text-secondary)",
          }}
        >
          <Globe
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto 16px",
              opacity: 0.5,
            }}
          />
          <p>{m.domains_no_domains()}</p>
        </div>
      </Show>

      {/* Domain List */}
      <Show when={!isLoading() && filteredDomains().length > 0}>
        <div class="macos-card">
          <For each={filteredDomains()}>
            {(entry) => (
              <DomainCard
                entry={entry}
                selected={selectedDomains().has(entry.domain)}
                onSelect={() => toggleDomainSelection(entry.domain)}
                onDelete={() => handleDeleteDomain(entry.domain)}
                onAutoApplyChange={(val) => handleAutoApplyChange(entry.domain, val)}
                formatDate={formatDate}
                m={m}
              />
            )}
          </For>
        </div>
      </Show>

      {/* No Search Results */}
      <Show when={!isLoading() && domains().length > 0 && filteredDomains().length === 0}>
        <div
          style={{
            "text-align": "center",
            padding: "32px 0",
            color: "var(--macos-text-secondary)",
          }}
        >
          <Search
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto 16px",
              opacity: 0.5,
            }}
          />
          <p>No domains match your search</p>
        </div>
      </Show>
    </>
  );
}

interface DomainCardProps {
  entry: StoredDomainEntry;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onAutoApplyChange: (autoApply: boolean) => void;
  formatDate: (timestamp: number) => string;
  m: Messages;
}

function DomainCard(props: DomainCardProps) {
  return (
    <div
      class="macos-card-item"
      style={{
        display: "block",
        background: props.selected ? "rgba(10, 132, 255, 0.1)" : "transparent",
        border: props.selected ? "1px solid var(--macos-accent)" : "none",
        "border-radius": props.selected ? "var(--macos-radius-sm)" : "0",
      }}
    >
      {/* Domain Header */}
      <div
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
        }}
      >
        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <input type="checkbox" checked={props.selected} onChange={props.onSelect} />
          <Globe
            style={{
              width: "16px",
              height: "16px",
              color: "var(--macos-text-secondary)",
            }}
          />
          <span class="macos-card-label-title">{props.entry.domain}</span>
        </div>
        <button
          type="button"
          class="macos-button macos-button-danger"
          style={{ padding: "4px 8px" }}
          onClick={props.onDelete}
          title={props.m.delete_text()}
        >
          <Trash2 style={{ width: "14px", height: "14px" }} />
        </button>
      </div>

      {/* Volume Display & Auto-apply Toggle */}
      <div
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
          "margin-top": "10px",
        }}
      >
        <label
          style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <button
            type="button"
            class={`macos-toggle ${props.entry.settings.autoApply ? "active" : ""}`}
            style={{ transform: "scale(0.8)" }}
            onClick={() => props.onAutoApplyChange(!props.entry.settings.autoApply)}
          />
          <span class="macos-card-label-description">{props.m.domains_auto_apply()}</span>
        </label>
        <span class="macos-card-label-description">
          {props.m.domains_last_applied()}: {props.formatDate(props.entry.settings.lastApplied)}
        </span>
      </div>
    </div>
  );
}
