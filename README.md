# [B.M] YouTube 支援鍵盤媒體鍵

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/)
[![Site](https://img.shields.io/badge/site-YouTube-FF0000?logo=youtube)](https://www.youtube.com)
[![Music](https://img.shields.io/badge/YouTube_Music-music.youtube.com-FF0000)](https://music.youtube.com)
[![GitHub](https://img.shields.io/badge/GitHub-bm--youtube--keyboard--media--keys-181717?logo=github)](https://github.com/BoringMan314/bm-youtube-keyboard-media-keys)

適用於 [**YouTube**](https://www.youtube.com)（`youtube.com`）與 [**YouTube Music**](https://music.youtube.com)（`music.youtube.com`）的瀏覽器擴充功能：將鍵盤 **播放／暫停、上一首、下一首** 媒體鍵對應到 **Shorts**、一般長影片（`/watch`、`/live`）與 **YouTube Music**；可於工具列彈出面板 **開關** 是否攔截媒體鍵。

*简体中文: 将键盘 **播放/暂停、上一首、下一首** 映射到 YouTube Shorts、长视频与 YouTube Music，可在工具栏开关。*

*日本語: キーボードの **再生・一時停止／前の曲／次の曲** を YouTube Shorts・長尺動画・YouTube Music に割り当て、ツールバーでオン／オフできます。*

*English: Maps **Play-Pause, Previous, Next** hardware keys to YouTube Shorts, long-form video, and YouTube Music, with a toolbar toggle.*

> **聲明**：本專案為第三方輔助工具，與 Google／YouTube／YouTube Music 官方無關。使用請遵守各服務條款與著作權規範。

---

## 目錄

- [功能](#功能)
- [系統需求](#系統需求)
- [安裝方式](#安裝方式)
- [本機開發與測試](#本機開發與測試)
- [技術概要](#技術概要)
- [專案結構](#專案結構)
- [版本與多語系](#版本與多語系)
- [隱私](#隱私)
- [維護者：更新 GitHub 與 Chrome 線上應用程式商店](#維護者更新-github-與-chrome-線上應用程式商店)
- [授權](#授權)
- [問題與建議](#問題與建議)

---

## 功能

- **播放／暫停**：由擴充功能注入頁面操作播放器（Chrome 攔截媒體鍵時的常見需求）。
- **Shorts**：媒體「上一首／下一首」切換短影片；留言面板開啟時會先嘗試關閉再導覽。
- **長影片**：上一首為瀏覽器 **上一頁**（`history.back()`）；下一首模擬 **Shift+N**。
- **YouTube Music**：操作播放列；歌單頁尚未播放時優先從標題區或第一首開始；非 YouTube 前景分頁時可優先控制最近使用的 Music 分頁。
- **全域快捷鍵**：[`manifest.json`](manifest.json) 內三個 `commands` 皆已設 `"global": true`（Chrome 只能逐條指令宣告，沒有「一次全部」的單一欄位）。安裝後請到 `chrome://extensions/shortcuts` **確認**皆為 **全域**；若仍顯示「僅限 Chrome」再手動改，並綁定媒體鍵。
- **開關**：關閉時不處理媒體鍵，工具列圖示顯示 **×**。

---

## 系統需求

- **Chrome** 或 **Microsoft Edge**（Chromium）等支援 **Manifest V3** 的瀏覽器。

---

## 安裝方式

### 從 Chrome 線上應用程式商店（建議）

請在 [Chrome Web Store](https://chromewebstore.google.com/) 搜尋 **「[B.M] YouTube 支援鍵盤媒體鍵」**（或英文名稱），或使用開發者提供的商店連結安裝。

### 從原始碼載入（開發人員模式）

1. 點選本頁綠色 **Code** → **Download ZIP** 解壓，或 `git clone` 本儲存庫。
2. 開啟 Chrome 或 Edge，前往 `chrome://extensions`（Edge：`edge://extensions`）。
3. 開啟「開發人員模式」→「載入未封裝項目」→ 選取含 [`manifest.json`](manifest.json) 的**專案根目錄**。
4. 開啟 `chrome://extensions/shortcuts`，**確認**本擴充三個指令為 **全域**（`manifest` 已預設 `global: true`，多數情況無須改）；必要時改為全域並綁定媒體鍵。

---

## 本機開發與測試

修改 [`background.js`](background.js)、[`popup.js`](popup.js)、[`options.js`](options.js) 或 [`_locales/`](_locales/) 後，在 `chrome://extensions` 對本擴充按 **重新載入**，再重新整理 YouTube／Music 分頁即可驗證。

---

## 技術概要

- **Service worker** [`background.js`](background.js) 監聽 `chrome.commands`，以 `chrome.scripting.executeScript` 在頁面 **MAIN** 世界注入邏輯（點擊導覽、模擬快捷鍵、`history.back()`、`video.play()` 等）。
- **快捷鍵列表順序**：`chrome://extensions/shortcuts` 會依 **指令 ID 字典序** 排列，與 `manifest.json` 內撰寫順序無關；本專案因此使用 `media-1-playpause`、`media-2-prev`、`media-3-next`，畫面上才會是 **播放／暫停 → 上一首 → 下一首**。
- **「尚未設定」**：`manifest` 裡若為某指令寫了 **suggested_key**（例如 `MediaPlayPause`），Chrome 會視為已建議綁定，該列會顯示**按鍵名稱**（如「媒體播放/暫停」），而不是「尚未設定」。**啟用擴充功能**（開啟工具列動作）通常沒有預設鍵，故常顯示「尚未設定」。
- **權限**：`scripting`、`tabs`、`storage`；`host_permissions` 限 `youtube.com` 與 `music.youtube.com`。
- **無**內容腳本常駐注入；僅在快捷鍵觸發時對目標分頁執行腳本。

---

## 專案結構

| 路徑 | 說明 |
|------|------|
| [`manifest.json`](manifest.json) | Manifest V3、`commands`、多語系 `default_locale` |
| [`icons/`](icons/) | 工具列與商店用圖示：`icon16.png`、`icon48.png`、`icon128.png` |
| [`background.js`](background.js) | 指令處理、分頁挑選、注入腳本、badge／`storage` 開關 |
| [`popup.html`](popup.html)／[`popup.js`](popup.js) | 工具列彈出面板：開關與開啟說明頁 |
| [`options.html`](options.html)／[`options.js`](options.js) | 完整說明（多語系字串套用） |
| [`_locales/`](_locales/) | `zh_TW`、`zh_CN`、`en`、`ja` 的 `messages.json` |
| [`screenshot/`](screenshot/) | Chrome Web Store 用宣傳圖與截圖（見下表） |

**Chrome Web Store 用截圖**（[`screenshot/`](screenshot/)）：

| 檔案 | 用途（約略） |
|------|----------------|
| [`screenshot/screenshot_440x280.png`](screenshot/screenshot_440x280.png) | 小型宣傳圖 |
| [`screenshot/screenshot_1280x800.png`](screenshot/screenshot_1280x800.png) | 單一螢幕截圖（寬螢幕） |
| [`screenshot/screenshot_1400x560.png`](screenshot/screenshot_1400x560.png) | 大型宣傳圖 |

---

## 版本與多語系

- 版本號：[`manifest.json`](manifest.json) 的 `version`（目前 **0.1.0**）。
- 預設語系：**`zh_TW`**（`default_locale`）。
- 已內建：**繁體中文（zh_TW）**、**简体中文（zh_CN）**、**English（en）**、**日本語（ja）**；依瀏覽器介面語言自動選用。

---

## 隱私

本擴充**不蒐集、不上傳**個人資料；未使用分析或遠端程式碼。僅於本機 `storage` 儲存開關狀態。

**上架 Chrome Web Store 時**，後台須填寫隱私實踐；若商店要求公開隱私權政策 URL，可另建 `privacy-policy.html` 並託管於 [GitHub Pages](https://pages.github.com/) 等（比照其他 [B.M] 專案）。

---

## 維護者：更新 GitHub 與 Chrome 線上應用程式商店

### GitHub

```bash
git add README.md manifest.json
git commit -m "docs: 更新 README 與版號"
git push origin main
```

### Chrome 線上應用程式商店

須使用您的 [Chrome Web Store 開發人員控制台](https://chrome.google.com/webstore/devconsole) 操作，**本儲存庫無法代替您登入或送審**。

1. **遞增版本**：每次上傳新套件須提高 `manifest.json` 的 `version`（例如 `0.1.0` → `0.1.1`）。
2. **打包 ZIP**：根目錄須直接包含 `manifest.json`（勿多包一層資料夾）。建議包含：`manifest.json`、`background.js`、`popup.html`、`popup.js`、`options.html`、`options.js`、`_locales/`、[`icons/`](icons/)（含 `icon16.png`、`icon48.png`、`icon128.png`）。截圖僅於商店後台上傳，不必打進擴充 ZIP。排除：`.git`、`.gitignore`、README、個人檔案、`*.zip`、原始稿（如 `*.psd`）。
3. **上傳**：控制台選取項目 →「套件」→ 上傳新 ZIP。
4. **商店資產**：文案與截圖可參考上表建議尺寸。
5. **提交審核**：審核通過後使用者才會收到更新。

首次上架另須完成 Google 開發人員註冊與一次性費用等（以 [官方說明](https://developer.chrome.com/docs/webstore/register) 為準）。

---

## 授權

目前儲存庫未附獨立 `LICENSE` 檔時，預設為版權所有；若希望開放使用或修改，請自行新增授權檔並更新本段說明。

---

## 問題與建議

歡迎使用 [GitHub Issues](https://github.com/BoringMan314/bm-youtube-keyboard-media-keys/issues) 回報錯誤或提出改善建議（請盡量附上瀏覽器版本、介面語言、重現步驟）。
