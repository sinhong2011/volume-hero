/**
 * Translation data for all supported languages
 * This file contains all UI translations that can be switched at runtime
 */

export type TranslationKey =
  | "extName"
  | "extDescription"
  | "ok"
  | "cancel"
  | "save"
  | "reset"
  | "close"
  | "delete"
  | "edit"
  | "popup.title"
  | "popup.noMedia"
  | "popup.volume"
  | "popup.mute"
  | "popup.unmute"
  | "popup.maxVolume"
  | "popup.resetTo100"
  | "popup.autoApply"
  | "popup.currentSite"
  | "popup.noActiveTab"
  | "popup.playingMedia"
  | "popup.refresh"
  | "popup.active"
  | "popup.jumpToTab"
  | "popup.noPlayingMedia"
  | "popup.openWebsite"
  | "popup.distortionWarning"
  | "settings.title"
  | "settings.language"
  | "settings.languageDescription"
  | "settings.languages.en"
  | "settings.languages.zh_CN"
  | "settings.languages.zh_TW"
  | "settings.languages.ja"
  | "settings.languages.ko"
  | "settings.about"
  | "settings.aboutDescription"
  | "settings.version"
  | "settings.saved"
  | "settings.savedDescription"
  | "settings.tabs.general"
  | "settings.tabs.domains"
  | "settings.tabs.about"
  | "domains.title"
  | "domains.description"
  | "domains.noDomains"
  | "domains.volume"
  | "domains.autoApply"
  | "domains.lastApplied"
  | "domains.deleteConfirm"
  | "domains.deleted"
  | "domains.updated"
  | "domains.search";

export type SupportedLocale = "en" | "zh_CN" | "zh_TW" | "ja" | "ko";

export const SUPPORTED_LOCALES: { code: SupportedLocale; name: string }[] = [
  { code: "en", name: "English" },
  { code: "zh_CN", name: "简体中文" },
  { code: "zh_TW", name: "繁體中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
];

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  extName: "Volume Hero",
  extDescription: "Control and manage audio/video volume on any website",
  ok: "OK",
  cancel: "Cancel",
  save: "Save",
  reset: "Reset",
  close: "Close",
  delete: "Delete",
  edit: "Edit",
  "popup.title": "Volume Hero",
  "popup.noMedia": "No media found on this page",
  "popup.volume": "Volume",
  "popup.mute": "Mute",
  "popup.unmute": "Unmute",
  "popup.maxVolume": "Max volume (600%)",
  "popup.resetTo100": "Reset to 100%",
  "popup.autoApply": "Auto-apply on page load",
  "popup.currentSite": "Current site",
  "popup.noActiveTab": "No active tab",
  "popup.playingMedia": "Playing Media",
  "popup.refresh": "Refresh",
  "popup.active": "Active",
  "popup.jumpToTab": "Jump to tab",
  "popup.noPlayingMedia": "No playing media detected in any tabs",
  "popup.openWebsite": "Open a website to adjust volume",
  "popup.distortionWarning": "High volume may cause audio distortion",
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageDescription": "Select your preferred language",
  "settings.languages.en": "English",
  "settings.languages.zh_CN": "Simplified Chinese",
  "settings.languages.zh_TW": "Traditional Chinese",
  "settings.languages.ja": "Japanese",
  "settings.languages.ko": "Korean",
  "settings.about": "About",
  "settings.aboutDescription":
    "Volume Hero lets you boost audio and video volume beyond 100% (up to 600%) with per-site memory.",
  "settings.version": "Version",
  "settings.saved": "Settings saved!",
  "settings.savedDescription": "Your language preference has been saved.",
  "settings.tabs.general": "General",
  "settings.tabs.domains": "Domain Volumes",
  "settings.tabs.about": "About",
  "domains.title": "Saved Domain Volume Settings",
  "domains.description": "Manage volume settings for individual websites",
  "domains.noDomains":
    "No saved domain settings yet. Visit websites and adjust their volume to see them here.",
  "domains.volume": "Volume",
  "domains.autoApply": "Auto-apply",
  "domains.lastApplied": "Last used",
  "domains.deleteConfirm": "Delete volume settings for this domain?",
  "domains.deleted": "Domain settings deleted",
  "domains.updated": "Domain settings updated",
  "domains.search": "Search domains...",
};

const zh_CN: Translations = {
  extName: "音霸",
  extDescription: "控制和管理任何网站的音频/视频音量",
  ok: "确定",
  cancel: "取消",
  save: "保存",
  reset: "重置",
  close: "关闭",
  delete: "删除",
  edit: "编辑",
  "popup.title": "音霸",
  "popup.noMedia": "此页面找不到媒体",
  "popup.volume": "音量",
  "popup.mute": "静音",
  "popup.unmute": "取消静音",
  "popup.maxVolume": "最大音量 (600%)",
  "popup.resetTo100": "重置为 100%",
  "popup.autoApply": "页面加载时自动应用",
  "popup.currentSite": "当前站点",
  "popup.noActiveTab": "没有活动标签页",
  "popup.playingMedia": "正在播放的媒体",
  "popup.refresh": "刷新",
  "popup.active": "活动",
  "popup.jumpToTab": "跳转到标签页",
  "popup.noPlayingMedia": "未检测到任何标签页有正在播放的媒体",
  "popup.openWebsite": "打开网站以调整音量",
  "popup.distortionWarning": "高音量可能导致音频失真",
  "settings.title": "设置",
  "settings.language": "语言",
  "settings.languageDescription": "选择您的首选语言",
  "settings.languages.en": "English (英语)",
  "settings.languages.zh_CN": "简体中文",
  "settings.languages.zh_TW": "繁體中文 (繁体中文)",
  "settings.languages.ja": "日本語 (日语)",
  "settings.languages.ko": "한국어 (韩语)",
  "settings.about": "关于",
  "settings.aboutDescription":
    "音霸让您可以将音频和视频音量提升到 100% 以上（最高 600%），并支持按站点记忆设置。",
  "settings.version": "版本",
  "settings.saved": "设置已保存！",
  "settings.savedDescription": "您的语言偏好已保存。",
  "settings.tabs.general": "常规",
  "settings.tabs.domains": "网站音量",
  "settings.tabs.about": "关于",
  "domains.title": "已保存的网站音量设置",
  "domains.description": "管理各个网站的音量设置",
  "domains.noDomains":
    "还没有保存的网站设置。访问网站并调整音量后，它们将显示在这里。",
  "domains.volume": "音量",
  "domains.autoApply": "自动应用",
  "domains.lastApplied": "最后使用",
  "domains.deleteConfirm": "删除此网站的音量设置？",
  "domains.deleted": "网站设置已删除",
  "domains.updated": "网站设置已更新",
  "domains.search": "搜索网站...",
};

const zh_TW: Translations = {
  extName: "音霸",
  extDescription: "控制和管理任何網站的音訊/視訊音量",
  ok: "確定",
  cancel: "取消",
  save: "儲存",
  reset: "重設",
  close: "關閉",
  delete: "刪除",
  edit: "編輯",
  "popup.title": "音霸",
  "popup.noMedia": "此頁面找不到媒體",
  "popup.volume": "音量",
  "popup.mute": "靜音",
  "popup.unmute": "取消靜音",
  "popup.maxVolume": "最大音量 (600%)",
  "popup.resetTo100": "重設為 100%",
  "popup.autoApply": "頁面載入時自動套用",
  "popup.currentSite": "目前網站",
  "popup.noActiveTab": "沒有活動分頁",
  "popup.playingMedia": "正在播放的媒體",
  "popup.refresh": "重新整理",
  "popup.active": "活動",
  "popup.jumpToTab": "跳至分頁",
  "popup.noPlayingMedia": "未偵測到任何分頁有正在播放的媒體",
  "popup.openWebsite": "開啟網站以調整音量",
  "popup.distortionWarning": "高音量可能導致音訊失真",
  "settings.title": "設定",
  "settings.language": "語言",
  "settings.languageDescription": "選擇您偏好的語言",
  "settings.languages.en": "English (英語)",
  "settings.languages.zh_CN": "简体中文 (簡體中文)",
  "settings.languages.zh_TW": "繁體中文",
  "settings.languages.ja": "日本語 (日語)",
  "settings.languages.ko": "한국어 (韓語)",
  "settings.about": "關於",
  "settings.aboutDescription":
    "音霸讓您可以將音訊和視訊音量提升到 100% 以上（最高 600%），並支援按網站記憶設定。",
  "settings.version": "版本",
  "settings.saved": "設定已儲存！",
  "settings.savedDescription": "您的語言偏好已儲存。",
  "settings.tabs.general": "一般",
  "settings.tabs.domains": "網站音量",
  "settings.tabs.about": "關於",
  "domains.title": "已儲存的網站音量設定",
  "domains.description": "管理各個網站的音量設定",
  "domains.noDomains":
    "尚無儲存的網站設定。造訪網站並調整音量後，它們將顯示在這裡。",
  "domains.volume": "音量",
  "domains.autoApply": "自動套用",
  "domains.lastApplied": "最後使用",
  "domains.deleteConfirm": "刪除此網站的音量設定？",
  "domains.deleted": "網站設定已刪除",
  "domains.updated": "網站設定已更新",
  "domains.search": "搜尋網站...",
};

const ja: Translations = {
  extName: "Volume Hero",
  extDescription: "あらゆるウェブサイトの音声・動画の音量を調整・管理",
  ok: "OK",
  cancel: "キャンセル",
  save: "保存",
  reset: "リセット",
  close: "閉じる",
  delete: "削除",
  edit: "編集",
  "popup.title": "Volume Hero",
  "popup.noMedia": "このページにメディアが見つかりません",
  "popup.volume": "音量",
  "popup.mute": "ミュート",
  "popup.unmute": "ミュート解除",
  "popup.maxVolume": "最大音量 (600%)",
  "popup.resetTo100": "100%にリセット",
  "popup.autoApply": "ページ読み込み時に自動適用",
  "popup.currentSite": "現在のサイト",
  "popup.noActiveTab": "アクティブなタブがありません",
  "popup.playingMedia": "再生中のメディア",
  "popup.refresh": "更新",
  "popup.active": "アクティブ",
  "popup.jumpToTab": "タブに移動",
  "popup.noPlayingMedia": "再生中のメディアが検出されませんでした",
  "popup.openWebsite": "ウェブサイトを開いて音量を調整",
  "popup.distortionWarning": "音量を上げすぎると音が歪む可能性があります",
  "settings.title": "設定",
  "settings.language": "言語",
  "settings.languageDescription": "お好みの言語を選択してください",
  "settings.languages.en": "English (英語)",
  "settings.languages.zh_CN": "简体中文 (簡体字中国語)",
  "settings.languages.zh_TW": "繁體中文 (繁体字中国語)",
  "settings.languages.ja": "日本語",
  "settings.languages.ko": "한국어 (韓国語)",
  "settings.about": "このアプリについて",
  "settings.aboutDescription":
    "Volume Heroは、音声と動画の音量を100%以上（最大600%）にブーストでき、サイトごとに設定を記憶します。",
  "settings.version": "バージョン",
  "settings.saved": "設定を保存しました！",
  "settings.savedDescription": "言語設定が保存されました。",
  "settings.tabs.general": "一般",
  "settings.tabs.domains": "サイト別音量",
  "settings.tabs.about": "このアプリについて",
  "domains.title": "保存済みのサイト音量設定",
  "domains.description": "各ウェブサイトの音量設定を管理",
  "domains.noDomains":
    "保存されたサイト設定はまだありません。ウェブサイトにアクセスして音量を調整すると、ここに表示されます。",
  "domains.volume": "音量",
  "domains.autoApply": "自動適用",
  "domains.lastApplied": "最終使用",
  "domains.deleteConfirm": "このサイトの音量設定を削除しますか？",
  "domains.deleted": "サイト設定を削除しました",
  "domains.updated": "サイト設定を更新しました",
  "domains.search": "サイトを検索...",
};

const ko: Translations = {
  extName: "Volume Hero",
  extDescription: "모든 웹사이트의 오디오/비디오 볼륨을 제어하고 관리",
  ok: "확인",
  cancel: "취소",
  save: "저장",
  reset: "초기화",
  close: "닫기",
  delete: "삭제",
  edit: "편집",
  "popup.title": "Volume Hero",
  "popup.noMedia": "이 페이지에서 미디어를 찾을 수 없습니다",
  "popup.volume": "볼륨",
  "popup.mute": "음소거",
  "popup.unmute": "음소거 해제",
  "popup.maxVolume": "최대 볼륨 (600%)",
  "popup.resetTo100": "100%로 초기화",
  "popup.autoApply": "페이지 로드 시 자동 적용",
  "popup.currentSite": "현재 사이트",
  "popup.noActiveTab": "활성 탭 없음",
  "popup.playingMedia": "재생 중인 미디어",
  "popup.refresh": "새로고침",
  "popup.active": "활성",
  "popup.jumpToTab": "탭으로 이동",
  "popup.noPlayingMedia": "재생 중인 미디어가 감지되지 않았습니다",
  "popup.openWebsite": "웹사이트를 열어 볼륨을 조절하세요",
  "popup.distortionWarning": "높은 볼륨은 오디오 왜곡을 유발할 수 있습니다",
  "settings.title": "설정",
  "settings.language": "언어",
  "settings.languageDescription": "선호하는 언어를 선택하세요",
  "settings.languages.en": "English (영어)",
  "settings.languages.zh_CN": "简体中文 (중국어 간체)",
  "settings.languages.zh_TW": "繁體中文 (중국어 번체)",
  "settings.languages.ja": "日本語 (일본어)",
  "settings.languages.ko": "한국어",
  "settings.about": "정보",
  "settings.aboutDescription":
    "Volume Hero는 오디오 및 비디오 볼륨을 100% 이상(최대 600%)으로 높일 수 있으며, 사이트별로 설정을 기억합니다.",
  "settings.version": "버전",
  "settings.saved": "설정이 저장되었습니다!",
  "settings.savedDescription": "언어 설정이 저장되었습니다.",
  "settings.tabs.general": "일반",
  "settings.tabs.domains": "사이트별 볼륨",
  "settings.tabs.about": "정보",
  "domains.title": "저장된 사이트 볼륨 설정",
  "domains.description": "개별 웹사이트의 볼륨 설정 관리",
  "domains.noDomains":
    "저장된 사이트 설정이 없습니다. 웹사이트를 방문하고 볼륨을 조절하면 여기에 표시됩니다.",
  "domains.volume": "볼륨",
  "domains.autoApply": "자동 적용",
  "domains.lastApplied": "마지막 사용",
  "domains.deleteConfirm": "이 사이트의 볼륨 설정을 삭제하시겠습니까?",
  "domains.deleted": "사이트 설정이 삭제되었습니다",
  "domains.updated": "사이트 설정이 업데이트되었습니다",
  "domains.search": "사이트 검색...",
};

export const translations: Record<SupportedLocale, Translations> = {
  en,
  zh_CN,
  zh_TW,
  ja,
  ko,
};

export function getTranslation(
  locale: SupportedLocale,
  key: TranslationKey
): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
