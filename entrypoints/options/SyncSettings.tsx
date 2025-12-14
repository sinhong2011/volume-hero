import { Download, Upload } from "lucide-solid";
import { createSignal, onMount, Show } from "solid-js";
import toast from "solid-toast";
import { useI18n } from "@/utils/i18n/useI18n";
import { encryptAccessKey, getAccessKeyLength } from "@/utils/s3";
import {
  exportAllSettings,
  type GlobalSettings,
  getGlobalSettings,
  importSettings,
  type SyncProvider,
  saveGlobalSettings,
} from "@/utils/storage";
import { performSync, testConnection } from "@/utils/sync";
import { encryptPassword, getPasswordLength } from "@/utils/webdav";

const SYNC_INTERVAL_OPTIONS = [5, 15, 30, 60, 120];

export default function SyncSettings() {
  const { m } = useI18n();
  const [settings, setSettings] = createSignal<GlobalSettings | null>(null);

  // WebDAV state
  const [serverUrl, setServerUrl] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");

  // S3 state
  const [accessKeyId, setAccessKeyId] = createSignal("");
  const [secretAccessKey, setSecretAccessKey] = createSignal("");
  const [bucketName, setBucketName] = createSignal("");
  const [region, setRegion] = createSignal("");
  const [endpoint, setEndpoint] = createSignal("");

  const [testing, setTesting] = createSignal(false);
  const [syncing, setSyncing] = createSignal(false);

  onMount(async () => {
    const s = await getGlobalSettings();
    setSettings(s);

    // Load WebDAV config
    setServerUrl(s.cloudSync.webdav.serverUrl);
    setUsername(s.cloudSync.webdav.username);
    if (s.cloudSync.webdav.password) {
      setPassword("*".repeat(getPasswordLength(s.cloudSync.webdav.password)));
    }

    // Load S3 config
    setBucketName(s.cloudSync.s3.bucketName);
    setRegion(s.cloudSync.s3.region);
    setEndpoint(s.cloudSync.s3.endpoint || "");
    if (s.cloudSync.s3.accessKeyId) {
      setAccessKeyId("*".repeat(getAccessKeyLength(s.cloudSync.s3.accessKeyId)));
    }
    if (s.cloudSync.s3.secretAccessKey) {
      setSecretAccessKey("*".repeat(getAccessKeyLength(s.cloudSync.s3.secretAccessKey)));
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

  const saveCloudSyncConfig = async () => {
    const s = settings();
    if (!s) return;

    const provider = s.cloudSync.provider;

    if (provider === "webdav") {
      const newWebDAVConfig = {
        ...s.cloudSync.webdav,
        serverUrl: serverUrl(),
        username: username(),
        password: password().startsWith("*")
          ? s.cloudSync.webdav.password
          : encryptPassword(password()),
      };
      await updateSetting("cloudSync", {
        ...s.cloudSync,
        webdav: newWebDAVConfig,
      });
    } else if (provider === "s3") {
      const newS3Config = {
        ...s.cloudSync.s3,
        accessKeyId: accessKeyId().startsWith("*")
          ? s.cloudSync.s3.accessKeyId
          : encryptAccessKey(accessKeyId()),
        secretAccessKey: secretAccessKey().startsWith("*")
          ? s.cloudSync.s3.secretAccessKey
          : encryptAccessKey(secretAccessKey()),
        bucketName: bucketName(),
        region: region(),
        endpoint: endpoint(),
      };
      await updateSetting("cloudSync", {
        ...s.cloudSync,
        s3: newS3Config,
      });
    }
  };

  const handleTestConnection = async () => {
    const s = settings();
    if (!s) return;

    const provider = s.cloudSync.provider;

    if (provider === "webdav") {
      if (!serverUrl().trim() || !username().trim() || !password().trim()) {
        toast.error(m.sync_fill_all_fields());
        return;
      }
    } else if (provider === "s3") {
      if (
        !accessKeyId().trim() ||
        !secretAccessKey().trim() ||
        !bucketName().trim() ||
        !region().trim()
      ) {
        toast.error(m.sync_fill_all_fields());
        return;
      }
    }

    setTesting(true);
    await saveCloudSyncConfig();
    const result = await testConnection();
    if (result.success) {
      toast.success(m.sync_connection_success());
    } else {
      toast.error(m.sync_connection_failed());
    }
    setTesting(false);
  };

  const handleSync = async () => {
    const s = settings();
    if (!s) return;

    const provider = s.cloudSync.provider;

    if (provider === "webdav") {
      if (!serverUrl().trim() || !username().trim() || !password().trim()) {
        toast.error(m.sync_fill_all_fields());
        return;
      }
    } else if (provider === "s3") {
      if (
        !accessKeyId().trim() ||
        !secretAccessKey().trim() ||
        !bucketName().trim() ||
        !region().trim()
      ) {
        toast.error(m.sync_fill_all_fields());
        return;
      }
    }

    setSyncing(true);
    await saveCloudSyncConfig();
    const result = await performSync();
    if (result.success) {
      toast.success(m.sync_status_success());
    } else {
      toast.error(m.sync_status_error());
    }
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

          {/* Provider Selection */}
          <p class="macos-section-title">{m.sync_provider()}</p>
          <div class="macos-card">
            <div class="macos-card-item" style={{ display: "block" }}>
              <select
                id="sync-provider"
                class="macos-select w-full"
                value={s().cloudSync.provider}
                onChange={(e) =>
                  updateSetting("cloudSync", {
                    ...s().cloudSync,
                    provider: e.currentTarget.value as SyncProvider,
                  })
                }
              >
                <option value="webdav">{m.sync_provider_webdav()}</option>
                <option value="s3">{m.sync_provider_s3()}</option>
              </select>
            </div>
          </div>

          {/* WebDAV Configuration */}
          <Show when={s().cloudSync.provider === "webdav"}>
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
                  onBlur={saveCloudSyncConfig}
                />
              </div>

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
                  onBlur={saveCloudSyncConfig}
                />
              </div>

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
                  onBlur={saveCloudSyncConfig}
                />
              </div>
            </div>
          </Show>

          {/* S3 Configuration */}
          <Show when={s().cloudSync.provider === "s3"}>
            <div class="macos-card">
              <div class="macos-card-item" style={{ display: "block" }}>
                <label class="macos-card-label-title mb-2 block" for="s3-access-key">
                  {m.sync_s3_access_key()}
                </label>
                <input
                  id="s3-access-key"
                  type="text"
                  class="macos-input w-full"
                  value={accessKeyId()}
                  onInput={(e) => setAccessKeyId(e.currentTarget.value)}
                  onBlur={saveCloudSyncConfig}
                />
              </div>

              <div class="macos-card-item" style={{ display: "block" }}>
                <label class="macos-card-label-title mb-2 block" for="s3-secret-key">
                  {m.sync_s3_secret_key()}
                </label>
                <input
                  id="s3-secret-key"
                  type="password"
                  class="macos-input w-full"
                  value={secretAccessKey()}
                  onInput={(e) => setSecretAccessKey(e.currentTarget.value)}
                  onBlur={saveCloudSyncConfig}
                />
              </div>

              <div class="macos-card-item" style={{ display: "block" }}>
                <label class="macos-card-label-title mb-2 block" for="s3-bucket">
                  {m.sync_s3_bucket()}
                </label>
                <input
                  id="s3-bucket"
                  type="text"
                  class="macos-input w-full"
                  value={bucketName()}
                  onInput={(e) => setBucketName(e.currentTarget.value)}
                  onBlur={saveCloudSyncConfig}
                />
              </div>

              <div class="macos-card-item" style={{ display: "block" }}>
                <label class="macos-card-label-title mb-2 block" for="s3-region">
                  {m.sync_s3_region()}
                </label>
                <input
                  id="s3-region"
                  type="text"
                  class="macos-input w-full"
                  placeholder="us-east-1"
                  value={region()}
                  onInput={(e) => setRegion(e.currentTarget.value)}
                  onBlur={saveCloudSyncConfig}
                />
              </div>

              <div class="macos-card-item" style={{ display: "block" }}>
                <label class="macos-card-label-title mb-2 block" for="s3-endpoint">
                  {m.sync_s3_endpoint()}
                </label>
                <input
                  id="s3-endpoint"
                  type="url"
                  class="macos-input w-full"
                  placeholder={m.sync_s3_endpoint_placeholder()}
                  value={endpoint()}
                  onInput={(e) => setEndpoint(e.currentTarget.value)}
                  onBlur={saveCloudSyncConfig}
                />
              </div>
            </div>
          </Show>

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
                class={`macos-toggle ${
                  s().cloudSync.provider === "webdav"
                    ? s().cloudSync.webdav.autoSync
                    : s().cloudSync.s3.autoSync
                      ? "active"
                      : ""
                }`}
                onClick={() => {
                  const provider = s().cloudSync.provider;
                  if (provider === "webdav") {
                    updateSetting("cloudSync", {
                      ...s().cloudSync,
                      webdav: {
                        ...s().cloudSync.webdav,
                        autoSync: !s().cloudSync.webdav.autoSync,
                      },
                    });
                  } else {
                    updateSetting("cloudSync", {
                      ...s().cloudSync,
                      s3: {
                        ...s().cloudSync.s3,
                        autoSync: !s().cloudSync.s3.autoSync,
                      },
                    });
                  }
                }}
              />
            </div>

            <Show
              when={
                s().cloudSync.provider === "webdav"
                  ? s().cloudSync.webdav.autoSync
                  : s().cloudSync.s3.autoSync
              }
            >
              <div class="macos-card-item" style={{ display: "block" }}>
                <label class="macos-card-label-title mb-2 block" for="sync-interval">
                  {m.sync_interval()}
                </label>
                <select
                  id="sync-interval"
                  class="macos-select w-full"
                  value={
                    s().cloudSync.provider === "webdav"
                      ? s().cloudSync.webdav.syncIntervalMinutes
                      : s().cloudSync.s3.syncIntervalMinutes
                  }
                  onChange={(e) => {
                    const provider = s().cloudSync.provider;
                    const intervalMinutes = parseInt(e.currentTarget.value, 10);
                    if (provider === "webdav") {
                      updateSetting("cloudSync", {
                        ...s().cloudSync,
                        webdav: {
                          ...s().cloudSync.webdav,
                          syncIntervalMinutes: intervalMinutes,
                        },
                      });
                    } else {
                      updateSetting("cloudSync", {
                        ...s().cloudSync,
                        s3: {
                          ...s().cloudSync.s3,
                          syncIntervalMinutes: intervalMinutes,
                        },
                      });
                    }
                  }}
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
                <p class="macos-card-label-description">
                  {formatDate(
                    s().cloudSync.provider === "webdav"
                      ? s().cloudSync.webdav.lastSyncTime
                      : s().cloudSync.s3.lastSyncTime
                  )}
                </p>
              </div>
              <Show
                when={
                  s().cloudSync.provider === "webdav"
                    ? s().cloudSync.webdav.lastSyncStatus
                    : s().cloudSync.s3.lastSyncStatus
                }
              >
                <span
                  class={`macos-badge ${
                    (
                      s().cloudSync.provider === "webdav"
                        ? s().cloudSync.webdav.lastSyncStatus
                        : s().cloudSync.s3.lastSyncStatus
                    ) === "success"
                      ? "macos-badge-success"
                      : "macos-badge-error"
                  }`}
                >
                  {(s().cloudSync.provider === "webdav"
                    ? s().cloudSync.webdav.lastSyncStatus
                    : s().cloudSync.s3.lastSyncStatus) === "success"
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
