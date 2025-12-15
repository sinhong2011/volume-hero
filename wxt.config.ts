import { paraglide } from "@inlang/paraglide-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-solid"],
  manifest: {
    name: "Volume Hero",
    description: "Boost audio/video volume beyond 100% (up to 600%) with per-site memory",
    default_locale: "en",
    permissions: ["storage", "activeTab", "tabs"],
    action: {
      default_icon: "icon/logo-96.png",
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
