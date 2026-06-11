import { paraglide } from "@inlang/paraglide-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-solid", "@wxt-dev/auto-icons"],
  // Configure auto-icons to use the existing logo.png as the source
  autoIcons: {
    baseIconPath: "public/icon/logo.png",
    // Generate all sizes needed for Chrome and Firefox toolbars
    sizes: [16, 32, 48, 96, 128],
  },
  manifest: {
    name: "Volume Hero",
    description: "Boost audio/video volume beyond 100% (up to 600%) with per-site memory",
    default_locale: "en",
    permissions: ["storage", "activeTab", "tabs", "scripting"],
    // Already implied by the <all_urls> content script; required so the
    // background can programmatically inject into already-open tabs.
    host_permissions: ["<all_urls>"],
    browser_specific_settings: {
      gecko: {
        id: "volume-hero@sinhong2011.github.io",
        strict_min_version: "140.0",
        // data_collection_permissions is a new Firefox requirement (v140+) not yet in WXT types
        // Valid required values: "none" OR one or more of: authenticationInfo, bookmarksInfo,
        // browsingActivity, financialAndPaymentInfo, healthInfo, locationInfo,
        // personalCommunications, personallyIdentifyingInfo, searchTerms, websiteActivity, websiteContent
        // Valid optional values: same as above, plus technicalAndInteraction
        data_collection_permissions: {
          required: ["none"],
        },
      } as {
        id: string;
        strict_min_version: string;
        data_collection_permissions: {
          required: string[];
          optional?: string[];
        };
      },
    },
    commands: {
      "volume-up": {
        suggested_key: {
          default: "Alt+Shift+Up",
          mac: "Alt+Shift+Up",
        },
        description: "Increase volume by 10%",
      },
      "volume-down": {
        suggested_key: {
          default: "Alt+Shift+Down",
          mac: "Alt+Shift+Down",
        },
        description: "Decrease volume by 10%",
      },
      "volume-reset": {
        suggested_key: {
          default: "Alt+Shift+R",
          mac: "Alt+Shift+R",
        },
        description: "Reset volume to 100%",
      },
      "volume-mute": {
        suggested_key: {
          default: "Alt+Shift+M",
          mac: "Alt+Shift+M",
        },
        description: "Mute/Unmute",
      },
    },
  },
  vite: () => ({
    plugins: [
      tailwindcss(),
      paraglide({
        project: "./project.inlang",
        outdir: "./src/paraglide",
      }),
    ],
  }),
});
