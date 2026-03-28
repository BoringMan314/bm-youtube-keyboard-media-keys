const STORAGE_ENABLED_KEY = "mediaKeysEnabled";

async function isMediaKeysEnabled() {
  const data = await chrome.storage.local.get(STORAGE_ENABLED_KEY);
  if (data[STORAGE_ENABLED_KEY] === undefined) return true;
  return Boolean(data[STORAGE_ENABLED_KEY]);
}

async function refreshActionBadge() {
  const on = await isMediaKeysEnabled();
  if (on) {
    await chrome.action.setBadgeText({ text: "" });
  } else {
    await chrome.action.setBadgeText({ text: "×" });
    await chrome.action.setBadgeBackgroundColor({ color: "#c62828" });
  }
  await chrome.action.setTitle({
    title: on
      ? chrome.i18n.getMessage("actionTitleEnabled")
      : chrome.i18n.getMessage("actionTitleDisabled"),
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    try {
      if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        await chrome.storage.local.set({ [STORAGE_ENABLED_KEY]: true });
      }
      await refreshActionBadge();
    } catch {
      /* 避免未處理的拒絕導致 service worker 異常結束 */
    }
  })();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_ENABLED_KEY]) {
    void refreshActionBadge().catch(() => {});
  }
});

void refreshActionBadge().catch(() => {});

const YOUTUBE_URL_PATTERNS = [
  "https://www.youtube.com/*",
  "https://youtube.com/*",
  "http://www.youtube.com/*",
  "http://youtube.com/*",
  "https://music.youtube.com/*",
  "http://music.youtube.com/*",
];

const MUSIC_URL_PATTERNS = ["https://music.youtube.com/*", "http://music.youtube.com/*"];

function parseHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function isShortsUrl(url) {
  return typeof url === "string" && url.includes("youtube.com/shorts");
}

function isYoutubeUrl(url) {
  const h = parseHostname(url);
  return h === "www.youtube.com" || h === "youtube.com" || h === "music.youtube.com";
}

function isMusicYoutubeUrl(url) {
  return parseHostname(url) === "music.youtube.com";
}

/** 一般觀看頁（含直播）；不含 Shorts、YouTube Music、首頁等 */
function isWatchStylePageUrl(url) {
  if (!isYoutubeUrl(url) || isShortsUrl(url) || isMusicYoutubeUrl(url)) return false;
  try {
    const parsed = new URL(url);
    const p = parsed.pathname || "";
    if (p.startsWith("/watch")) return true;
    if (p.startsWith("/live/") || p === "/live") return true;
    return false;
  } catch {
    return url.includes("/watch?") || url.includes("/watch#") || url.includes("/live/");
  }
}

/** 長影片／Shorts／YouTube Music 播放面（不含首頁、搜尋、動態等） */
function isYoutubeMediaSurfaceUrl(url) {
  return isShortsUrl(url) || isWatchStylePageUrl(url) || isMusicYoutubeUrl(url);
}

/**
 * 有聲優先，否則依 lastAccessed 挑「最後一個」YouTube Music 分頁。
 */
async function pickBestMusicTabId() {
  const tabs = await chrome.tabs.query({ url: MUSIC_URL_PATTERNS });
  if (!tabs.length) return null;

  const audible = tabs.filter((t) => t.audible);
  if (audible.length) {
    audible.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
    return audible[0].id;
  }

  tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  return tabs[0].id;
}

/**
 * 媒體「上一首／下一首」：作用中分頁為 Shorts／watch／YT Music 時用該分頁；
 * 否則改控「最後播放中的」YouTube Music 分頁（有聲優先）。
 */
async function resolveYoutubeTrackNav() {
  try {
    const [focusedActive] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!focusedActive?.id) return null;

    let u = focusedActive.url;
    if (!u) {
      try {
        const full = await chrome.tabs.get(focusedActive.id);
        u = full.url ?? "";
      } catch {
        return null;
      }
    }

    if (isShortsUrl(u)) {
      return { tabId: focusedActive.id, page: "shorts" };
    }
    if (isMusicYoutubeUrl(u)) {
      return { tabId: focusedActive.id, page: "ytmusic" };
    }
    if (isWatchStylePageUrl(u)) {
      return { tabId: focusedActive.id, page: "watch" };
    }

    const musicTabId = await pickBestMusicTabId();
    if (musicTabId) {
      return { tabId: musicTabId, page: "ytmusic" };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 播放／暫停：作用中分頁為長影／Shorts／YT Music 時用該分頁；
 * 否則優先「最後播放中的」YouTube Music，再退回其他 YouTube 分頁。
 */
async function resolveYoutubeTabId(hintTab) {
  if (hintTab?.id && hintTab.url && isYoutubeMediaSurfaceUrl(hintTab.url)) {
    return hintTab.id;
  }

  if (hintTab?.id) {
    try {
      const full = await chrome.tabs.get(hintTab.id);
      if (isYoutubeMediaSurfaceUrl(full.url)) return hintTab.id;
    } catch {
      /* 略過 */
    }
  }

  try {
    const [focusedActive] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (focusedActive?.id) {
      let u = focusedActive.url;
      if (!u) {
        try {
          const full = await chrome.tabs.get(focusedActive.id);
          u = full.url ?? "";
        } catch {
          u = "";
        }
      }
      if (isYoutubeMediaSurfaceUrl(u)) {
        return focusedActive.id;
      }
    }
  } catch {
    /* 略過 */
  }

  const musicFirst = await pickBestMusicTabId();
  if (musicFirst) return musicFirst;

  const ytTabs = await chrome.tabs.query({ url: YOUTUBE_URL_PATTERNS });
  if (!ytTabs.length) return null;

  const audible = ytTabs.filter((t) => t.audible);
  if (audible.length) {
    audible.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
    return audible[0].id;
  }

  const activeYt = ytTabs.find((t) => t.active);
  if (activeYt) return activeYt.id;

  ytTabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  return ytTabs[0].id;
}

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!(await isMediaKeysEnabled())) return;

  if (command === "media-1-playpause") {
    const tabId = await resolveYoutubeTabId(tab);
    if (!tabId) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: () => {
          const host = location.hostname || "";

          if (host === "music.youtube.com") {
            const playlistLike =
              (location.pathname || "").includes("/playlist") ||
              /[?&]list=[^&]+/.test(location.search || "");

            function ytmHasQueuedMedia() {
              const el =
                document.querySelector("ytmusic-player video") ||
                document.querySelector("ytmusic-app video");
              if (!el) return false;
              if (Number.isFinite(el.duration) && el.duration > 0) return true;
              if (el.currentSrc && String(el.currentSrc).length > 0) return true;
              return el.readyState >= 2;
            }

            function tryStartPlaylistOrFirstTrack() {
              const sels = [
                "ytmusic-detail-header-renderer ytmusic-play-button-renderer button",
                "ytmusic-detail-header-renderer ytmusic-play-button-renderer #button",
                "ytmusic-detail-header-renderer tp-yt-paper-icon-button",
                "ytmusic-immersive-header-renderer ytmusic-play-button-renderer button",
                "ytmusic-immersive-header-renderer ytmusic-play-button-renderer #button",
              ];
              for (const sel of sels) {
                const el = document.querySelector(sel);
                if (el && typeof el.click === "function") {
                  el.click();
                  return true;
                }
              }
              const overlay = document.querySelector(
                "ytmusic-responsive-list-item-renderer ytmusic-item-thumbnail-overlay-renderer #play-button",
              );
              if (overlay && typeof overlay.click === "function") {
                overlay.click();
                return true;
              }
              return false;
            }

            const bar = document.querySelector("ytmusic-player-bar");
            const pp =
              bar?.querySelector(".play-pause-button") ||
              bar?.querySelector("tp-yt-paper-icon-button.play-pause-button");
            const aria = ((pp && pp.getAttribute("aria-label")) || "").toLowerCase();

            if (pp && /pause|暫停|一時停止|pausa|mettre en pause|pausieren/i.test(aria)) {
              pp.click();
              return;
            }

            if (playlistLike && !ytmHasQueuedMedia()) {
              if (tryStartPlaylistOrFirstTrack()) return;
            }

            if (pp && typeof pp.click === "function") {
              pp.click();
              return;
            }

            const v =
              document.querySelector("ytmusic-player video") ||
              document.querySelector("ytmusic-app video") ||
              document.querySelector("video");
            if (!v) return;
            if (v.paused) {
              void v.play().catch(() => {});
            } else {
              v.pause();
            }
            return;
          }

          const path = location.pathname || "";
          let v = null;

          if (path.startsWith("/shorts/")) {
            v =
              document.querySelector("ytd-reel-video-renderer[is-active] video") ||
              document.querySelector("ytd-shorts video");
          } else {
            const mp = document.querySelector("#movie_player");
            if (mp) {
              v = mp.querySelector("video.html5-main-video") || mp.querySelector("video");
            }
            if (!v) {
              const flexy = document.querySelector("ytd-watch-flexy");
              const inner = flexy?.querySelector("#movie_player video") ?? flexy?.querySelector("ytd-player video");
              v = inner ?? null;
            }
            if (!v) {
              const ytdPlayer =
                document.querySelector("ytd-player#ytd-player video") ||
                document.querySelector("ytd-player .html5-video-container video");
              v = ytdPlayer;
            }
          }

          if (!v) {
            v = document.querySelector("video");
          }
          if (!v) return;

          if (v.paused) {
            void v.play().catch(() => {});
          } else {
            v.pause();
          }
        },
      });
    } catch {
      /* 無法注入時略過 */
    }
    return;
  }

  if (command !== "media-3-next" && command !== "media-2-prev") return;

  const nav = await resolveYoutubeTrackNav();
  if (!nav) return;

  const goNext = command === "media-3-next";

  if (nav.page === "watch") {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: nav.tabId },
        world: "MAIN",
        func: (next) => {
          if (!next) {
            window.history.back();
            return;
          }

          const key = "N";
          const code = "KeyN";
          const kc = 78;

          const v =
            document.querySelector("#movie_player video.html5-main-video") ||
            document.querySelector("#movie_player video") ||
            document.querySelector("ytd-watch-flexy ytd-player video");
          if (v && typeof v.focus === "function") {
            try {
              v.focus({ preventScroll: true });
            } catch {
              v.focus();
            }
          }

          const roots = [document.activeElement, document.body, document.documentElement, window];
          for (const type of ["keydown", "keyup"]) {
            for (const el of roots) {
              try {
                el.dispatchEvent(
                  new KeyboardEvent(type, {
                    key,
                    code,
                    keyCode: kc,
                    which: kc,
                    shiftKey: true,
                    bubbles: true,
                    cancelable: true,
                    view: window,
                  }),
                );
              } catch {
                /* 略過 */
              }
            }
          }
        },
        args: [goNext],
      });
    } catch {
      /* 無法注入時略過 */
    }
    return;
  }

  if (nav.page === "ytmusic") {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: nav.tabId },
        world: "MAIN",
        func: (next) => {
          const bar = document.querySelector("ytmusic-player-bar");
          const sel = next ? ".next-button" : ".previous-button";
          const btn = bar?.querySelector(sel);
          if (btn && typeof btn.click === "function") {
            btn.click();
            return;
          }

          const key = next ? "N" : "P";
          const code = next ? "KeyN" : "KeyP";
          const kc = next ? 78 : 80;
          const roots = [document.activeElement, document.body, document.documentElement, window];
          for (const type of ["keydown", "keyup"]) {
            for (const el of roots) {
              try {
                el.dispatchEvent(
                  new KeyboardEvent(type, {
                    key,
                    code,
                    keyCode: kc,
                    which: kc,
                    shiftKey: true,
                    bubbles: true,
                    cancelable: true,
                    view: window,
                  }),
                );
              } catch {
                /* 略過 */
              }
            }
          }
        },
        args: [goNext],
      });
    } catch {
      /* 無法注入時略過 */
    }
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: nav.tabId },
      world: "MAIN",
      func: (next) => {
        const id = next ? "navigation-button-down" : "navigation-button-up";

        function focusActiveShortVideo() {
          const reel =
            document.querySelector("ytd-reel-video-renderer[is-active] video") ||
            document.querySelector("ytd-shorts video");
          if (!reel || typeof reel.focus !== "function") return;
          try {
            reel.focus({ preventScroll: true });
          } catch {
            reel.focus();
          }
        }

        /** 留言／互動面板開著時先關閉，否則上下鍵與導覽鈕常被吃掉 */
        function closeShortsEngagementIfOpen() {
          const shorts = document.querySelector("ytd-shorts");
          if (!shorts) return;

          const tryClick = (el) => {
            if (el && typeof el.click === "function") {
              el.click();
              return true;
            }
            return false;
          };

          const headerBtns = shorts.querySelectorAll(
            "ytd-engagement-panel-title-header-renderer button, ytd-engagement-panel-title-header-renderer a",
          );
          for (const b of headerBtns) {
            const lab = (b.getAttribute("aria-label") || b.getAttribute("title") || "").toLowerCase();
            if (
              /close|關閉|收起|back|返回|上一頁|collapse|dismiss|hide/i.test(lab) &&
              tryClick(b)
            ) {
              return;
            }
          }

          const visBtn =
            shorts.querySelector("ytd-engagement-panel-title-header-renderer #visibility-button button") ||
            shorts.querySelector("ytd-engagement-panel-title-header-renderer tp-yt-paper-icon-button#button") ||
            shorts.querySelector("#visibility-button button");
          if (tryClick(visBtn)) return;

          for (const b of shorts.querySelectorAll("button[aria-label]")) {
            const lab = b.getAttribute("aria-label") || "";
            if (/^close\b|關閉|收起留言|關閉留言/i.test(lab) && tryClick(b)) return;
          }

          const escInit = {
            key: "Escape",
            code: "Escape",
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true,
            view: window,
          };
          for (const t of [document.activeElement, document.body, document.documentElement]) {
            if (!t) continue;
            try {
              t.dispatchEvent(new KeyboardEvent("keydown", escInit));
              t.dispatchEvent(new KeyboardEvent("keyup", escInit));
            } catch {
              /* 略過 */
            }
          }
        }

        function clickNavButton() {
          const roots = [
            document.querySelector(`.navigation-container #${id}`),
            document.querySelector(`ytd-shorts #${id}`),
            document.getElementById(id),
          ].filter(Boolean);

          for (const root of roots) {
            const btn = root.matches?.("button") ? root : root.querySelector("button");
            if (btn && typeof btn.click === "function") {
              btn.click();
              return true;
            }
          }
          return false;
        }

        function navigateShorts() {
          if (clickNavButton()) {
            requestAnimationFrame(() => requestAnimationFrame(focusActiveShortVideo));
            return;
          }

          const reNext =
            /next|下一|次の|다음|suivant|siguiente|próximo|próxima|weiter|volgende|avanti|siguiente video/i;
          const rePrev =
            /previous|上一|前の|이전|précédent|anterior|voltar|vorige|zurück|indietro|video anterior/i;

          const re = next ? reNext : rePrev;
          const scope = document.querySelector("ytd-shorts") || document;
          for (const b of scope.querySelectorAll("button[aria-label]")) {
            const label = b.getAttribute("aria-label") || "";
            if (re.test(label)) {
              b.click();
              requestAnimationFrame(() => requestAnimationFrame(focusActiveShortVideo));
              return;
            }
          }

          const shorts = document.querySelector("ytd-shorts");
          if (!shorts) return;

          const key = next ? "ArrowDown" : "ArrowUp";
          const init = { key, code: key, bubbles: true, cancelable: true };
          shorts.dispatchEvent(new KeyboardEvent("keydown", init));
          shorts.dispatchEvent(new KeyboardEvent("keyup", init));
          requestAnimationFrame(() => requestAnimationFrame(focusActiveShortVideo));
        }

        closeShortsEngagementIfOpen();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(navigateShorts, 0);
          });
        });
      },
      args: [goNext],
    });
  } catch {
    /* 無法注入時略過 */
  }
});
