// Generates the Chrome Web Store marketing HTML templates in .store-assets/.
// Each file is rendered to PNG by render-store-assets.mjs. The embedded popup
// mirrors the shipping v3 popup (warm-audio palette, segmented level meter,
// PLAYING MEDIA section) so the listing matches the actual product.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "../.store-assets");

// --- Design tokens (dark warm-audio palette, from popup/style.css) ----------
const C = {
  bg: "#100f0d",
  card: "#1a1916",
  cardHover: "#232220",
  divider: "#2c2a26",
  text: "#ede7db",
  text2: "#9b9182",
  text3: "#645d50",
  accent: "#d4a32e",
  accentHover: "#e3b13a",
  onAccent: "#1a1408",
  success: "#34c46e",
  warning: "#e0902a",
  error: "#e5532c",
  toggleOff: "#322f2a",
  thumb: "#e8e2d0",
  inputBorder: "#2e2c26",
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600;700;800&display=swap');";
const SANS = "'Outfit', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const MONO = "'DM Mono', 'SF Mono', Monaco, monospace";

// --- Lucide icon paths (stroke icons, 24x24) --------------------------------
const ICONS = {
  rotateCcw: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  volumeX:
    '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
  volume2:
    '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.4 18.4a9 9 0 0 0 0-12.8"/>',
  triangleAlert:
    '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  refreshCw:
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
  externalLink:
    '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>',
  keyboard:
    '<path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/>',
  cloud:
    '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  gauge:
    '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  check:
    '<path d="M20 6 9 17l-5-5"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
};

function icon(name, { size = 16, color = C.text2, sw = 2 } = {}) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

// Brand favicon tile (no network) ------------------------------------------
function favTile(letter, bg, size = 14) {
  return `<div style="width:${size}px;height:${size}px;border-radius:3px;background:${bg};display:flex;align-items:center;justify-content:center;color:#fff;font-size:${Math.round(
    size * 0.62
  )}px;font-weight:700;flex-shrink:0;font-family:${SANS}">${letter}</div>`;
}

// --- Popup pieces -----------------------------------------------------------
const LOGO = "_logo.png";

function levelColor(vol) {
  // matches getVolumeLevel(): <=1 safe, <=3 warning, >3 danger
  if (vol <= 1) return C.success;
  if (vol <= 3) return C.warning;
  return C.error;
}
function numberColor(vol) {
  // matches popup number color: <=1 success, <=2 warning, >2 error
  if (vol <= 1) return C.success;
  if (vol <= 2) return C.warning;
  return C.error;
}

// Segmented level-meter slider (main volume). pct = fill fraction 0..1.
function segSlider(vol, maxPct) {
  const pct = Math.min(1, (vol * 100) / maxPct);
  const col = levelColor(vol);
  const empty = `repeating-linear-gradient(90deg, ${C.toggleOff} 0 11px, transparent 11px 14px)`;
  const filled = `repeating-linear-gradient(90deg, ${col} 0 11px, transparent 11px 14px)`;
  return `
  <div style="display:flex;align-items:center;gap:10px;">
    ${iconBtn("volumeX")}
    <div style="flex:1;position:relative;height:18px;display:flex;align-items:center;">
      <div style="position:absolute;inset:0;top:50%;transform:translateY(-50%);height:13px;border-radius:4px;background-image:${empty};"></div>
      <div style="position:absolute;left:0;top:50%;transform:translateY(-50%);height:13px;width:${
        pct * 100
      }%;border-radius:4px;background-image:${filled};overflow:hidden;"></div>
      <div style="position:absolute;left:${
        pct * 100
      }%;top:50%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:${
    C.thumb
  };box-shadow:0 1px 4px rgba(0,0,0,.5),0 0 0 .5px rgba(0,0,0,.5);"></div>
    </div>
    ${iconBtn("volume2")}
  </div>`;
}

// Continuous slider for tab cards. pct fraction 0..1
function lineSlider(vol, maxVol) {
  const pct = Math.min(1, vol / maxVol);
  const col = levelColor(vol);
  return `
  <div style="flex:1;position:relative;height:16px;display:flex;align-items:center;">
    <div style="position:absolute;inset:0;top:50%;transform:translateY(-50%);height:4px;border-radius:2px;background:${C.toggleOff};"></div>
    <div style="position:absolute;left:0;top:50%;transform:translateY(-50%);height:4px;width:${
      pct * 100
    }%;border-radius:2px;background:${col};"></div>
    <div style="position:absolute;left:${
      pct * 100
    }%;top:50%;transform:translate(-50%,-50%);width:13px;height:13px;border-radius:50%;background:${
    C.thumb
  };box-shadow:0 1px 4px rgba(0,0,0,.5),0 0 0 .5px rgba(0,0,0,.5);"></div>
  </div>`;
}

function iconBtn(name, size = 16) {
  const box = size === 16 ? 32 : 24;
  return `<div style="width:${box}px;height:${box}px;border-radius:5px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon(
    name,
    { size: size === 16 ? 16 : 14 }
  )}</div>`;
}

function tabCard({ letter, fav, title, vol, active, maxVol = 6 }) {
  const pct = Math.round(vol * 100);
  const border = active
    ? `border:1px solid ${C.accent}55;box-shadow:inset 2px 0 0 ${C.accent};`
    : `border:1px solid ${C.divider};`;
  const right = active
    ? `<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;background:${C.accent}26;color:${C.accent};flex-shrink:0;">Active</span>`
    : `<div style="width:24px;height:24px;border-radius:5px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon(
        "externalLink",
        { size: 13, color: C.text2 }
      )}</div>`;
  return `
  <div style="background:${C.card};border-radius:8px;padding:10px 12px;${border}">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      ${favTile(letter, fav)}
      <span style="flex:1;font-size:12px;color:${C.text};font-family:${SANS};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</span>
      ${right}
    </div>
    <div style="display:flex;align-items:center;gap:4px;">
      ${iconBtn("volumeX", 14)}
      <span style="font-size:11px;font-family:${MONO};color:${C.text2};width:38px;text-align:center;">${pct}%</span>
      ${lineSlider(vol, maxVol)}
      ${iconBtn("volume2", 14)}
    </div>
  </div>`;
}

// Full popup. opts choose which sections to include.
function popup({
  vol = 4.0,
  maxPct = 600,
  autoApply = true,
  showWarning = true,
  tabs = null,
} = {}) {
  const pctNum = Math.round(vol * 100);
  const numCol = numberColor(vol);
  const scale = [
    `<span>0</span>`,
    maxPct >= 200 ? `<span>200%</span>` : "",
    maxPct >= 400 ? `<span>400%</span>` : "",
    `<span>${maxPct}%</span>`,
  ].join("");

  const warning = showWarning
    ? `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;font-size:12px;margin-top:12px;background:${C.warning}1a;border:1px solid ${C.warning}40;color:${C.warning};">
        ${icon("triangleAlert", { size: 16, color: C.warning })}
        <span>High volume may cause audio distortion</span>
      </div>`
    : "";

  const toggle = `
  <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:8px;background:${C.card};border:1px solid ${C.divider};margin-top:16px;">
    <span style="font-size:14px;color:${C.text};font-weight:500;font-family:${SANS};">Auto-apply on page load</span>
    <div style="position:relative;width:34px;height:20px;border-radius:999px;background:${
      autoApply ? C.accent : C.toggleOff
    };box-shadow:inset 0 1px 2px rgba(0,0,0,.3);">
      <div style="position:absolute;top:2px;${
        autoApply ? "left:16px" : "left:2px"
      };width:16px;height:16px;border-radius:50%;background:${C.thumb};box-shadow:0 1px 3px rgba(0,0,0,.4);"></div>
    </div>
  </div>`;

  let mediaSection = "";
  if (tabs) {
    mediaSection = `
    <div style="display:flex;align-items:center;gap:8px;margin:14px 0;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:${C.text3};">
      <div style="flex:1;height:1px;background:${C.divider};"></div>
      <span>Playing Media</span>
      ${icon("refreshCw", { size: 12, color: C.text3 })}
      <div style="flex:1;height:1px;background:${C.divider};"></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;">
      ${tabs.map(tabCard).join("")}
    </div>`;
  }

  return `
  <div style="width:320px;background:${C.bg};border-radius:12px;font-family:${SANS};">
    <div style="padding:16px;">
      <!-- header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="${LOGO}" style="width:28px;height:28px;border-radius:6px;" />
          <span style="font-size:15px;font-weight:600;color:${C.text};letter-spacing:-.01em;">Volume Hero</span>
        </div>
        <div style="display:flex;align-items:center;gap:2px;">
          ${iconBtn("rotateCcw")}${iconBtn("info")}${iconBtn("settings")}
        </div>
      </div>
      <!-- volume -->
      <div style="margin-top:16px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;">
          <span style="font-size:12px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:${C.text3};">Volume</span>
          <span style="font-size:30px;line-height:1;font-weight:600;font-family:${MONO};color:${numCol};">${pctNum}<span style="font-size:14px;font-weight:500;margin-left:2px;opacity:.6;">%</span></span>
        </div>
        ${segSlider(vol, maxPct)}
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:8px;padding:0 4px;font-family:${MONO};color:${C.text3};">${scale}</div>
        ${warning}
      </div>
      ${toggle}
      ${mediaSection}
    </div>
  </div>`;
}

// macOS browser frame around a popup
function browserFrame(url, inner, { faviconLetter = "Y", faviconBg = "#ff0000" } = {}) {
  return `
  <div style="background:${C.card};border-radius:14px;border:1px solid rgba(255,255,255,.08);box-shadow:0 40px 90px rgba(0,0,0,.7),0 0 60px ${C.accent}12;overflow:hidden;width:320px;">
    <div style="background:#26241f;padding:11px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.06);">
      <div style="display:flex;gap:6px;">
        <div style="width:11px;height:11px;border-radius:50%;background:#ff5f57;"></div>
        <div style="width:11px;height:11px;border-radius:50%;background:#febc2e;"></div>
        <div style="width:11px;height:11px;border-radius:50%;background:#28c840;"></div>
      </div>
      <div style="flex:1;background:rgba(255,255,255,.06);border-radius:6px;padding:5px 12px;font-size:11px;color:${C.text3};font-family:${MONO};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${url}</div>
    </div>
    ${inner}
  </div>`;
}

// --- Marketing screenshot frame (1280x800) ----------------------------------
function feature(iconName, text) {
  return `<div style="display:flex;align-items:center;gap:12px;">
    <div style="width:34px;height:34px;border-radius:9px;background:${C.accent}14;border:1px solid ${C.accent}2e;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon(
    iconName,
    { size: 17, color: C.accent }
  )}</div>
    <span style="font-size:15px;color:${C.text};font-weight:500;">${text}</span>
  </div>`;
}

function screenshot({ badge, headline, subtitle, features, right, rightScale = 1.32 }) {
  const glow = `radial-gradient(ellipse 760px 560px at 74% 50%, ${C.accent}12 0%, transparent 66%), radial-gradient(ellipse 520px 420px at 16% 24%, ${C.error}0d 0%, transparent 60%)`;
  return wrap(
    1280,
    800,
    `
    <div style="position:absolute;inset:0;background:${glow};"></div>
    <div style="position:absolute;left:0;top:0;bottom:0;width:560px;padding:0 56px 0 80px;display:flex;flex-direction:column;justify-content:center;gap:22px;z-index:2;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:${C.accent}1f;border:1px solid ${C.accent}3d;border-radius:999px;padding:6px 14px;width:fit-content;">
        <div style="width:7px;height:7px;border-radius:50%;background:${C.accent};"></div>
        <span style="font-size:12px;font-weight:600;color:${C.accent};letter-spacing:.06em;text-transform:uppercase;">${badge}</span>
      </div>
      <h1 style="font-size:48px;font-weight:800;line-height:1.08;color:${C.text};letter-spacing:-.03em;margin:0;">${headline}</h1>
      <p style="font-size:17px;line-height:1.6;color:${C.text2};max-width:400px;margin:0;">${subtitle}</p>
      <div style="display:flex;flex-direction:column;gap:13px;margin-top:4px;">${features
        .map((f) => feature(f[0], f[1]))
        .join("")}</div>
    </div>
    <div style="position:absolute;left:560px;top:120px;bottom:120px;width:1px;background:rgba(255,255,255,.05);z-index:1;"></div>
    <div style="position:absolute;left:560px;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:2;">
      <div style="transform:scale(${rightScale});">${right}</div>
    </div>`,
    `background:${C.bg};`
  );
}

function wrap(w, h, inner, extra = "") {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
${FONT_IMPORT}
*{margin:0;padding:0;box-sizing:border-box;}
body{width:${w}px;height:${h}px;overflow:hidden;font-family:${SANS};position:relative;${extra}}
em{color:${C.accent};font-style:normal;}
</style></head><body>${inner}</body></html>`;
}

// Highlight helper for headline accents
const hl = (s) => `<em>${s}</em>`;

// === ASSET DEFINITIONS ======================================================
const files = {};

// Screenshot 1 — Boost beyond 100%
files["screenshot-1"] = screenshot({
  badge: "Web Audio API Boost",
  headline: `Boost Volume<br>Beyond ${hl("100%")}`,
  subtitle:
    "Amplify any audio or video up to 600% using Web Audio API gain nodes. Works on YouTube, Spotify, Netflix and every site.",
  features: [
    ["gauge", "Up to 600% volume amplification"],
    ["zap", "Zero latency — instant slider response"],
    ["globe", "Works on every website automatically"],
    ["check", "Color-coded volume safety indicator"],
  ],
  right: browserFrame(
    "youtube.com/watch?v=dQw4w9WgXcQ",
    popup({
      vol: 4.0,
      autoApply: true,
      showWarning: true,
      tabs: [{ letter: "▶", fav: "#ff0000", title: "YouTube — Music Video", vol: 4.0, active: true }],
    })
  ),
});

// Screenshot 2 — Per-site memory
const memCard = (letter, bg, domain, pct, col) => `
  <div style="display:flex;align-items:center;gap:14px;background:${C.card};border:1px solid ${C.divider};border-radius:12px;padding:16px 18px;box-shadow:0 10px 30px rgba(0,0,0,.4);">
    ${favTile(letter, bg, 30)}
    <div style="flex:1;">
      <div style="font-size:15px;font-weight:600;color:${C.text};">${domain}</div>
      <div style="font-size:12px;color:${C.text3};margin-top:2px;display:flex;align-items:center;gap:5px;">${icon(
        "check",
        { size: 13, color: C.success }
      )} Saved &middot; auto-applied</div>
    </div>
    <div style="font-size:24px;font-weight:700;font-family:${MONO};color:${col};">${pct}</div>
  </div>`;

files["screenshot-2"] = screenshot({
  badge: "Per-Site Memory",
  headline: `Remembers<br>Every ${hl("Site")}`,
  subtitle:
    "Set your preferred volume once. Volume Hero saves it per domain and auto-applies it every time you return — no manual adjustment.",
  features: [
    ["check", "Persistent per-domain volume settings"],
    ["zap", "Auto-apply on page load, optional toggle"],
    ["globe", "Independent settings for every website"],
    ["info", "Blacklist sites you want left untouched"],
  ],
  rightScale: 1,
  right: `<div style="display:flex;flex-direction:column;gap:14px;width:400px;">
    ${memCard("▶", "#ff0000", "youtube.com", "300%", C.error)}
    ${memCard("S", "#1db954", "open.spotify.com", "180%", C.warning)}
    ${memCard("N", "#e50914", "netflix.com", "150%", C.warning)}
    ${memCard("T", "#000000", "music.apple.com", "100%", C.success)}
  </div>`,
});

// Screenshot 3 — Multi-tab control
files["screenshot-3"] = screenshot({
  badge: "Multi-Tab Control",
  headline: `Control All<br>Tabs at ${hl("Once")}`,
  subtitle:
    "See every tab playing audio in one popup. Adjust, mute, or jump to any tab — no tab-switching required.",
  features: [
    ["check", "All playing tabs visible in one popup"],
    ["gauge", "Independent volume slider per tab"],
    ["volumeX", "Mute any background tab instantly"],
    ["externalLink", "Jump to any tab with one click"],
  ],
  right: browserFrame(
    "open.spotify.com",
    popup({
      vol: 1.8,
      autoApply: true,
      showWarning: false,
      tabs: [
        { letter: "S", fav: "#1db954", title: "Lo-fi Beats to Study", vol: 1.8, active: true },
        { letter: "▶", fav: "#ff0000", title: "Never Gonna Give You Up", vol: 3.2, active: false },
        { letter: "N", fav: "#e50914", title: "Stranger Things — S4", vol: 1.5, active: false },
      ],
    })
  ),
});

// Screenshot 4 — Settings / fine-tune (options page)
const navItem = (iconName, label, active) => `
  <div style="display:flex;align-items:center;gap:11px;padding:9px 13px;border-radius:9px;${
    active ? `background:${C.accent};` : ""
  }">
    ${icon(iconName, { size: 17, color: active ? C.onAccent : C.text2 })}
    <span style="font-size:14px;font-weight:${active ? 600 : 500};color:${
  active ? C.onAccent : C.text2
};">${label}</span>
  </div>`;

const settingRow = (title, desc, control) => `
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;">
    <div>
      <div style="font-size:15px;font-weight:600;color:${C.text};">${title}</div>
      <div style="font-size:12px;color:${C.text3};margin-top:3px;">${desc}</div>
    </div>
    ${control}
  </div>`;

const pill = (txt) =>
  `<div style="font-size:13px;font-weight:500;color:${C.text};background:${C.bg};border:1px solid ${C.inputBorder};border-radius:7px;padding:7px 12px;white-space:nowrap;">${txt}</div>`;

const sliderValue = (txt) =>
  `<span style="font-size:14px;font-weight:600;font-family:${MONO};color:${C.accent};">${txt}</span>`;

files["screenshot-4"] = (() => {
  const sidebar = `
    <div style="width:248px;background:${C.bg};border-right:1px solid ${C.divider};padding:22px 16px;display:flex;flex-direction:column;gap:4px;">
      <div style="display:flex;align-items:center;gap:12px;padding:0 8px 18px;margin-bottom:6px;border-bottom:1px solid ${C.divider};">
        <img src="${LOGO}" style="width:42px;height:42px;border-radius:11px;" />
        <div><div style="font-size:17px;font-weight:700;color:${C.text};">Volume Hero</div>
        <div style="font-size:13px;color:${C.text3};">Settings</div></div>
      </div>
      ${navItem("settings", "General", false)}
      ${navItem("gauge", "Volume", true)}
      ${navItem("keyboard", "Shortcuts", false)}
      ${navItem("globe", "Domains", false)}
      ${navItem("info", "Interface", false)}
      ${navItem("cloud", "Sync", false)}
    </div>`;

  const panel = `
    <div style="flex:1;padding:36px 44px;display:flex;flex-direction:column;gap:14px;overflow:hidden;">
      <h2 style="font-size:30px;font-weight:800;color:${C.text};letter-spacing:-.02em;margin-bottom:2px;">Volume</h2>

      <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${C.text3};margin-top:6px;">Limits</div>
      <div style="background:${C.card};border:1px solid ${C.divider};border-radius:12px;">
        ${settingRow("Maximum volume limit", "Highest boost the slider can reach", pill("600% &nbsp;&middot;&nbsp; 6×"))}
        <div style="height:1px;background:${C.divider};"></div>
        ${settingRow("Volume step size", "Increment for keyboard shortcuts", pill("10% per step"))}
      </div>

      <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${C.text3};margin-top:10px;">Equalizer</div>
      <div style="background:${C.card};border:1px solid ${C.divider};border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:16px;">
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:9px;"><span style="font-size:15px;font-weight:600;color:${C.text};">Bass boost</span>${sliderValue("+4 dB")}</div>
          ${eqTrack(0.66)}
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:9px;"><span style="font-size:15px;font-weight:600;color:${C.text};">Treble boost</span>${sliderValue("+2 dB")}</div>
          ${eqTrack(0.58)}
        </div>
      </div>
    </div>`;

  return wrap(
    1280,
    800,
    `<div style="display:flex;width:1280px;height:800px;background:${C.bg};">${sidebar}${panel}</div>`,
    `background:${C.bg};`
  );
})();

function eqTrack(pct) {
  return `<div style="position:relative;height:16px;display:flex;align-items:center;">
    <div style="position:absolute;inset:0;top:50%;transform:translateY(-50%);height:4px;border-radius:2px;background:${C.toggleOff};"></div>
    <div style="position:absolute;left:0;top:50%;transform:translateY(-50%);height:4px;width:${
      pct * 100
    }%;border-radius:2px;background:${C.accent};"></div>
    <div style="position:absolute;left:${
      pct * 100
    }%;top:50%;transform:translate(-50%,-50%);width:15px;height:15px;border-radius:50%;background:${
    C.thumb
  };box-shadow:0 1px 4px rgba(0,0,0,.5);"></div>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:11px;font-family:${MONO};color:${C.text3};margin-top:6px;"><span>-12</span><span>-6</span><span>0</span><span>+6</span><span>+12</span></div>`;
}

// --- Small promo tile (440x280) ---------------------------------------------
files["promo-tile"] = wrap(
  440,
  280,
  `
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 380px 280px at 50% 18%, ${C.accent}1f 0%, transparent 62%), radial-gradient(ellipse 300px 240px at 84% 92%, ${C.error}14 0%, transparent 60%);"></div>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;">
    <img src="${LOGO}" style="width:78px;height:78px;border-radius:19px;box-shadow:0 14px 36px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.05);" />
    <div style="font-size:33px;font-weight:800;letter-spacing:-.03em;color:${C.text};">Volume <em>Hero</em></div>
    <div style="font-size:14px;color:${C.text2};text-align:center;max-width:340px;line-height:1.45;">Boost any audio beyond 100% — up to 600% on every site</div>
    <div style="display:flex;gap:8px;margin-top:4px;">
      ${promoChip("gauge", "Up to 600%")}
      ${promoChip("check", "Per-site memory")}
      ${promoChip("keyboard", "Shortcuts")}
    </div>
  </div>`,
  `background:${C.bg};`
);

function promoChip(iconName, txt) {
  return `<div style="display:flex;align-items:center;gap:6px;background:${C.card};border:1px solid ${C.divider};border-radius:999px;padding:6px 12px;">
    ${icon(iconName, { size: 13, color: C.accent })}
    <span style="font-size:12px;font-weight:500;color:${C.text};">${txt}</span>
  </div>`;
}

// --- Marquee promo tile (1400x560) ------------------------------------------
files["marquee"] = wrap(
  1400,
  560,
  `
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 900px 620px at 78% 50%, ${C.accent}14 0%, transparent 60%), radial-gradient(ellipse 620px 520px at 12% 30%, ${C.error}0f 0%, transparent 58%);"></div>
  <div style="position:absolute;left:96px;top:0;bottom:0;width:620px;display:flex;flex-direction:column;justify-content:center;gap:26px;z-index:2;">
    <div style="display:flex;align-items:center;gap:16px;">
      <img src="${LOGO}" style="width:72px;height:72px;border-radius:18px;box-shadow:0 12px 30px rgba(0,0,0,.5);" />
      <span style="font-size:30px;font-weight:700;color:${C.text};letter-spacing:-.02em;">Volume Hero</span>
    </div>
    <h1 style="font-size:62px;font-weight:800;line-height:1.05;color:${C.text};letter-spacing:-.035em;margin:0;">Boost any audio<br>beyond <em>100%</em></h1>
    <p style="font-size:21px;line-height:1.5;color:${C.text2};max-width:540px;margin:0;">Amplify up to 600%, fine-tune bass & treble, and remember a volume for every site — on YouTube, Spotify, Netflix and beyond.</p>
    <div style="display:flex;gap:10px;margin-top:4px;">
      ${promoChip("gauge", "Up to 600% boost")}
      ${promoChip("check", "Per-site memory")}
      ${promoChip("cloud", "Cloud sync")}
    </div>
  </div>
  <div style="position:absolute;right:90px;top:0;bottom:0;display:flex;align-items:center;z-index:2;">
    <div style="transform:scale(1.18);">
      ${browserFrame(
        "youtube.com/watch?v=dQw4w9WgXcQ",
        popup({
          vol: 3.0,
          autoApply: true,
          showWarning: true,
          tabs: [{ letter: "▶", fav: "#ff0000", title: "YouTube — Music Video", vol: 3.0, active: true }],
        })
      )}
    </div>
  </div>`,
  `background:${C.bg};`
);

// === WRITE ==================================================================
for (const [name, html] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, `${name}.html`), html);
  console.log(`wrote ${name}.html`);
}
