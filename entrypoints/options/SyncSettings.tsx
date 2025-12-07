import { Download, Upload } from "lucide-solid";
import { createSignal, onMount, Show } from "solid-js";
import toast from "solid-toast";
import { useI18n } from "@/utils/i18n/useI18n";
import {
  exportAllSettings,
  type GlobalSettings,
  getGlobalSettings,
  importSettings,
  saveGlobalSettings,
} from "@/utils/storage";
import {
  encryptPassword,
  getPasswordLength,
  performSync,
  testWebDAVConnection,
} from "@/utils/webdav";

const SYNC_INTERVAL_OPTIONS = [5, 15, 30, 60, 120];

export default function SyncSettings() {
  const { m } = useI18n();
  const [settings, setSettings] = createSignal<GlobalSettings | null>(null);
  const [serverUrl, setServerUrl] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [testing, setTesting] = createSignal(false);
  const [syncing, setSyncing] = createSignal(false);
  const [testResult, setTestResult] = createSignal<"success" | "error" | null>(null);

  onMount(async () => {
    const s = await getGlobalSettings();
    setSettings(s);
    setServerUrl(s.webdav.serverUrl);
    setUsername(s.webdav.username);
    // Show placeholder for existing password
    if (s.webdav.password) {
      setPassword("*".repeat(getPasswordLength(s.webdav.password)));
    }
  });

  const updateSetting = async <K extends keyof GlobalSettings>(
    key: K,
    value: GlobalSettings[K]
  ) => {
    await saveGlobalSettings({ [key]: value });
    const updated = await getGlobalSettings();
    setSettings(updated);
  };

  const saveWebDAVConfig = async () => {
    const s = settings();
    if (!s) return;
    const newConfig = {
      ...s.webdav,
      serverUrl: serverUrl(),
      username: username(),
      password: password().startsWith("*") ? s.webdav.password : encryptPassword(password()),
    };
    await updateSetting("webdav", newConfig);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    await saveWebDAVConfig();
    const s = await getGlobalSettings();
    const success = await testWebDAVConnection(s.webdav);
    setTestResult(success ? "success" : "error");
    setTesting(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    await saveWebDAVConfig();
    await performSync();
    const updated = await getGlobalSettings();
    setSettings(updated);
    setSyncing(false);
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return m.sync_never();
    return new Date(timestamp).toLocaleString();
  };

  const handleExport = async () => {
    try {
      const data = await exportAllSettings();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `volume-hero-settings-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(m.domains_export_success());
    } catch (error) {
      console.error("[VolumeHero] Export failed:", error);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importSettings(data, true);
        const updated = await getGlobalSettings();
        setSettings(updated);
        toast.success(m.domains_import_success());
      } catch (error) {
        console.error("[VolumeHero] Import failed:", error);
        toast.error(m.domains_import_error());
      }
    };
    input.click();
  };

  return (
    <Show when={settings()} fallback={<div class="macos-spinner" />}>
      {(s) => (
        <div class="space-y-6">
          <p class="text-sm text-macos-text-secondary mb-4">{m.sync_description()}</p>

          {/* Server URL */}
          <div class="macos-card">
            <div class="macos-card-item" style={{ display: "block" }}>
              <label class="macos-card-label-title mb-2 block" for="webdav-server-url">
                {m.sync_server_url()}
              </label>
              <input
                id="webdav-server-url"
                type="url"
                class="macos-input w-full"
                placeholder={m.sync_server_placeholder()}
                value={serverUrl()}
                onInput={(e) => setServerUrl(e.currentTarget.value)}
                onBlur={saveWebDAVConfig}
              />
            </div>

            {/* Username */}
            <div class="macos-card-item" style={{ display: "block" }}>
              <label class="macos-card-label-title mb-2 block" for="webdav-username">
                {m.sync_username()}
              </label>
              <input
                id="webdav-username"
                type="text"
                class="macos-input w-full"
                value={username()}
                onInput={(e) => setUsername(e.currentTarget.value)}
                onBlur={saveWebDAVConfig}
              />
            </div>

            {/* Password */}
            <div class="macos-card-item" style={{ display: "block" }}>
              <label class="macos-card-label-title mb-2 block" for="webdav-password">
                {m.sync_password()}
              </label>
              <input
                id="webdav-password"
                type="password"
                class="macos-input w-full"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                onBlur={saveWebDAVConfig}
              />
            </div>
          </div>

          {/* Test & Sync Buttons */}
          <div class="flex gap-2">
            <button
              type="button"
              class="macos-button macos-button-secondary flex-1"
              onClick={handleTestConnection}
              disabled={testing()}
            >
              {testing() ? <span class="macos-spinner-sm" /> : m.sync_test_connection()}
            </button>
            <button
              type="button"
              class="macos-button macos-button-primary flex-1"
              onClick={handleSync}
              disabled={syncing()}
            >
              {syncing() ? <span class="macos-spinner-sm" /> : m.sync_now()}
            </button>
          </div>

          <Show when={testResult()}>
            <div
              class={`macos-alert ${
                testResult() === "success" ? "macos-alert-success" : "macos-alert-error"
              }`}
            >
              {testResult() === "success"
                ? m.sync_connection_success()
                : m.sync_connection_failed()}
            </div>
          </Show>

          <div class="macos-divider" />

          {/* Auto Sync */}
          <p class="macos-section-title">{m.sync_auto_sync()}</p>
          <div class="macos-card">
            <div class="macos-card-item">
              <div class="macos-card-label">
                <p class="macos-card-label-title">{m.sync_auto_sync()}</p>
              </div>
              <button
                type="button"
                class={`macos-toggle ${s().webdav.autoSync ? "active" : ""}`}
                onClick={() =>
                  updateSetting("webdav", {
                    ...s().webdav,
                    autoSync: !s().webdav.autoSync,
                  })
                }
              />
            </div>

            <Show when={s().webdav.autoSync}>
              <div class="macos-card-item" style={{ display: "block" }}>
                <label class="macos-card-label-title mb-2 block" for="sync-interval">
                  {m.sync_interval()}
                </label>
                <select
                  id="sync-interval"
                  class="macos-select w-full"
                  value={s().webdav.syncIntervalMinutes}
                  onChange={(e) =>
                    updateSetting("webdav", {
                      ...s().webdav,
                      syncIntervalMinutes: parseInt(e.currentTarget.value, 10),
                    })
                  }
                >
                  {SYNC_INTERVAL_OPTIONS.map((interval) => (
                    <option value={interval}>{interval} min</option>
                  ))}
                </select>
              </div>
            </Show>
          </div>

          {/* Last Sync Status */}
          <p class="macos-section-title">{m.sync_last_sync()}</p>
          <div class="macos-card">
            <div class="macos-card-item">
              <div class="macos-card-label">
                <p class="macos-card-label-title">{m.sync_last_sync()}</p>
                <p class="macos-card-label-description">{formatDate(s().webdav.lastSyncTime)}</p>
              </div>
              <Show when={s().webdav.lastSyncStatus}>
                <span
                  class={`macos-badge ${
                    s().webdav.lastSyncStatus === "success"
                      ? "macos-badge-success"
                      : "macos-badge-error"
                  }`}
                >
                  {s().webdav.lastSyncStatus === "success"
                    ? m.sync_status_success()
                    : m.sync_status_error()}
                </span>
              </Show>
            </div>
          </div>

          <div class="macos-divider" />

          {/* Import/Export */}
          <p class="macos-section-title">{m.domains_import_export()}</p>
          <div class="flex gap-2 justify-center">
            <button
              type="button"
              class="macos-button macos-button-secondary flex-1 flex items-center justify-center gap-2"
              onClick={handleExport}
            >
              <Download class="h-4 w-4" />
              {m.export_data()}
            </button>
            <button
              type="button"
              class="macos-button macos-button-secondary flex-1 flex items-center justify-center gap-2"
              onClick={handleImport}
            >
              <Upload class="h-4 w-4" />
              {m.import_data()}
            </button>
          </div>
        </div>
      )}
    </Show>
  );
}
