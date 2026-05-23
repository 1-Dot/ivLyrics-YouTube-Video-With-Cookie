(function ivLyricsYoutubeComVideoBackgroundAddon() {
  "use strict";

  /*
   * Unofficial workaround for YouTube video background bot-check prompts.
   * This is not an ivLyrics-supported or recommended integration path.
   * If video background problems occur, disable this addon first and only
   * report upstream when the issue still reproduces without it.
   */

  const ADDON_KEY = "__ivLyricsYouTubeVideoWithCookieAddon";
  const currentScript = document.currentScript;
  const addonId =
    currentScript?.dataset?.marketplaceAddon || "youtube-video-with-cookie";

  if (window[ADDON_KEY]?.initialized) {
    return;
  }

  const state =
    window[ADDON_KEY] ||
    (window[ADDON_KEY] = {
      initialized: true,
      iframeObserver: null,
      scriptObserver: null,
      ytPatchTimer: null,
      restores: [],
    });

  const addRestore = (restore) => {
    if (typeof restore === "function") {
      state.restores.push(restore);
    }
  };

  const normalizeYoutubeUrl = (value) => {
    if (!value || !/youtube-nocookie\.com/i.test(String(value))) {
      return value;
    }

    try {
      const url = new URL(value, window.location.origin);
      if (/youtube-nocookie\.com$/i.test(url.hostname)) {
        url.hostname = "www.youtube.com";
      }
      return url.toString();
    } catch {
      return String(value).replace(
        /(^https?:\/\/)(?:www\.)?youtube-nocookie\.com/gi,
        "$1www.youtube.com",
      );
    }
  };

  const sanitizeIframe = (iframe) => {
    if (!iframe || iframe.tagName !== "IFRAME") {
      return;
    }

    const currentSrc = iframe.getAttribute("src");
    const nextSrc = normalizeYoutubeUrl(currentSrc);
    if (nextSrc && nextSrc !== currentSrc) {
      iframe.setAttribute("src", nextSrc);
    }
  };

  const patchIframeSrc = () => {
    if (
      !window.HTMLIFrameElement ||
      HTMLIFrameElement.prototype.__ivLyricsYoutubeComWrapped
    ) {
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      "src",
    );
    const originalSetAttribute = HTMLIFrameElement.prototype.setAttribute;

    if (descriptor?.set) {
      Object.defineProperty(HTMLIFrameElement.prototype, "src", {
        configurable: true,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set(value) {
          descriptor.set.call(this, normalizeYoutubeUrl(value));
        },
      });
    }

    HTMLIFrameElement.prototype.setAttribute = function patchedSetAttribute(
      name,
      value,
    ) {
      if (typeof name === "string" && name.toLowerCase() === "src") {
        return originalSetAttribute.call(
          this,
          name,
          normalizeYoutubeUrl(value),
        );
      }
      return originalSetAttribute.apply(this, arguments);
    };

    HTMLIFrameElement.prototype.__ivLyricsYoutubeComWrapped = true;

    addRestore(() => {
      if (descriptor) {
        Object.defineProperty(HTMLIFrameElement.prototype, "src", descriptor);
      }
      HTMLIFrameElement.prototype.setAttribute = originalSetAttribute;
      delete HTMLIFrameElement.prototype.__ivLyricsYoutubeComWrapped;
    });
  };

  const observeIframes = () => {
    if (!document.body || state.iframeObserver) {
      return;
    }

    document.querySelectorAll("iframe").forEach(sanitizeIframe);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          sanitizeIframe(mutation.target);
          continue;
        }

        mutation.addedNodes?.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
          }
          if (node.tagName === "IFRAME") {
            sanitizeIframe(node);
          }
          node.querySelectorAll?.("iframe").forEach(sanitizeIframe);
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    state.iframeObserver = observer;
    addRestore(() => {
      observer.disconnect();
      if (state.iframeObserver === observer) {
        state.iframeObserver = null;
      }
    });
  };

  const patchYouTubePlayer = () => {
    const yt = window.YT;
    if (
      !yt ||
      typeof yt.Player !== "function" ||
      yt.Player.__ivLyricsYoutubeComWrapped
    ) {
      return false;
    }

    const OriginalPlayer = yt.Player;
    const WrappedPlayer = function wrappedYoutubePlayer(element, options = {}) {
      const player = new OriginalPlayer(element, {
        ...options,
        host: "https://www.youtube.com",
      });

      setTimeout(() => {
        try {
          const iframe =
            typeof player.getIframe === "function" ? player.getIframe() : null;
          sanitizeIframe(iframe);
        } catch {
          // The player may not expose its iframe until it is ready.
        }
      }, 0);

      return player;
    };

    Object.setPrototypeOf(WrappedPlayer, OriginalPlayer);
    WrappedPlayer.prototype = OriginalPlayer.prototype;
    WrappedPlayer.__ivLyricsYoutubeComWrapped = true;
    yt.Player = WrappedPlayer;

    addRestore(() => {
      if (window.YT?.Player === WrappedPlayer) {
        window.YT.Player = OriginalPlayer;
      }
    });

    return true;
  };

  const waitForYouTubePlayer = () => {
    if (patchYouTubePlayer()) {
      state.ytPatchTimer = null;
      return;
    }
    state.ytPatchTimer = setTimeout(waitForYouTubePlayer, 250);
  };

  const restore = () => {
    if (state.ytPatchTimer) {
      clearTimeout(state.ytPatchTimer);
      state.ytPatchTimer = null;
    }

    [...state.restores].reverse().forEach((restoreCallback) => {
      try {
        restoreCallback();
      } catch {
        // Ignore restore failures.
      }
    });

    state.restores = [];
    state.initialized = false;
    delete window[ADDON_KEY];
  };

  const observeOwnUninstall = () => {
    if (!currentScript?.parentNode || state.scriptObserver) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.removedNodes || []) {
          if (node === currentScript) {
            restore();
            return;
          }
        }
      }
    });

    observer.observe(currentScript.parentNode, { childList: true });
    state.scriptObserver = observer;
    addRestore(() => {
      observer.disconnect();
      if (state.scriptObserver === observer) {
        state.scriptObserver = null;
      }
    });
  };

  window.ivLyricsYoutubeComVideoBackground = {
    addonId,
    normalizeYoutubeUrl,
    restore,
  };

  addRestore(() => {
    if (window.ivLyricsYoutubeComVideoBackground?.addonId === addonId) {
      delete window.ivLyricsYoutubeComVideoBackground;
    }
  });

  patchIframeSrc();
  observeIframes();
  waitForYouTubePlayer();
  observeOwnUninstall();

  if (!document.body) {
    const startWhenReady = () => {
      document.removeEventListener("DOMContentLoaded", startWhenReady);
      observeIframes();
    };
    document.addEventListener("DOMContentLoaded", startWhenReady);
    addRestore(() =>
      document.removeEventListener("DOMContentLoaded", startWhenReady),
    );
  }
})();
