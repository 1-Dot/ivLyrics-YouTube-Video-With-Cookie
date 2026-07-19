(function ivLyricsYoutubeComVideoBackgroundAddon() {
  "use strict";

  /*
   * ivLyrics 6.x creates its player through VideoBackgroundDepend.js. That
   * module deliberately forces youtube-nocookie.com both in YT.Player options
   * and in iframe setters. Keep this addon at the final DOM boundary so the
   * normal YouTube host wins even when ivLyrics sanitizes the URL again.
   */

  const ADDON_KEY = "__ivLyricsYouTubeVideoWithCookieAddon";
  const BRIDGE_KEY = "__ivLyricsYouTubeVideoWithCookieBridge";
  const currentScript = document.currentScript;
  const addonId =
    currentScript?.dataset?.marketplaceAddon || "youtube-video-with-cookie";
  const ownerToken = {};

  const normalizeYoutubeUrl = (value) => {
    if (!value) return value;

    try {
      const url = new URL(String(value), window.location.origin);
      if (!/(?:^|\.)youtube-nocookie\.com$/i.test(url.hostname)) return value;
      url.hostname = "www.youtube.com";
      return url.toString();
    } catch {
      return String(value).replace(
        /(^https?:\/\/)(?:www\.)?youtube-nocookie\.com/gi,
        "$1www.youtube.com",
      );
    }
  };

  const previousState = window[ADDON_KEY];
  if (previousState?.initialized && typeof previousState.restore === "function") {
    previousState.restore();
  }

  const state = {
    initialized: true,
    active: true,
    iframeObserver: null,
    scriptObserver: null,
    playerPatchTimer: null,
    playerWrappers: [],
    restores: [],
    restore: null,
  };
  window[ADDON_KEY] = state;

  const addRestore = (restore) => {
    if (typeof restore === "function") state.restores.push(restore);
  };

  const getIframeBridge = () => {
    if (window[BRIDGE_KEY]?.installed) return window[BRIDGE_KEY];

    const descriptor = window.HTMLIFrameElement
      ? Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src")
      : null;
    const originalSetAttribute = window.HTMLIFrameElement
      ? HTMLIFrameElement.prototype.setAttribute
      : null;

    const bridge = {
      installed: false,
      owner: null,
      transform: null,
      setRaw(iframe, name, value) {
        if (iframe.getAttribute?.(name) === String(value)) return undefined;
        return originalSetAttribute.call(iframe, name, value);
      },
    };

    if (!descriptor?.set || typeof originalSetAttribute !== "function") {
      return bridge;
    }

    const transform = (value) => {
      if (!bridge.owner || typeof bridge.transform !== "function") {
        return { changed: false, value };
      }
      const transformedValue = bridge.transform(value);
      return {
        changed: String(transformedValue) !== String(value),
        value: transformedValue,
      };
    };

    const bridgedSrcSetter = function bridgedYoutubeIframeSrc(value) {
      const transformed = transform(value);
      if (
        transformed.changed &&
        this.getAttribute?.("src") === String(transformed.value)
      ) {
        return undefined;
      }
      return descriptor.set.call(this, transformed.value);
    };
    Object.defineProperty(HTMLIFrameElement.prototype, "src", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set: bridgedSrcSetter,
    });

    const bridgedSetAttribute = function bridgedYoutubeIframeSetAttribute(
      name,
      value,
    ) {
      if (typeof name === "string" && name.toLowerCase() === "src") {
        const transformed = transform(value);
        // VideoBackgroundDepend compares before this addon transforms the URL.
        // Avoid navigating an already-correct iframe when its no-cookie rewrite
        // resolves to the exact same youtube.com URL.
        if (
          transformed.changed &&
          this.getAttribute?.(name) === String(transformed.value)
        ) {
          return undefined;
        }
        return originalSetAttribute.call(this, name, transformed.value);
      }
      return originalSetAttribute.apply(this, arguments);
    };
    HTMLIFrameElement.prototype.setAttribute = bridgedSetAttribute;

    bridge.installed = true;
    bridge.srcSetter = bridgedSrcSetter;
    bridge.setAttribute = bridgedSetAttribute;
    window[BRIDGE_KEY] = bridge;
    return bridge;
  };

  const iframeBridge = getIframeBridge();
  iframeBridge.owner = ownerToken;
  iframeBridge.transform = normalizeYoutubeUrl;

  addRestore(() => {
    if (iframeBridge.owner === ownerToken) {
      iframeBridge.owner = null;
      iframeBridge.transform = null;
    }
  });

  const sanitizeIframe = (iframe) => {
    if (!state.active || !iframe || iframe.tagName !== "IFRAME") return;

    const currentSrc = iframe.getAttribute("src");
    const nextSrc = normalizeYoutubeUrl(currentSrc);
    if (nextSrc && nextSrc !== currentSrc) {
      if (iframeBridge.installed) {
        iframeBridge.setRaw(iframe, "src", nextSrc);
      } else {
        iframe.setAttribute("src", nextSrc);
      }
    }
  };

  const scanIframes = (root = document) => {
    root.querySelectorAll?.("iframe").forEach(sanitizeIframe);
    if (root.tagName === "IFRAME") sanitizeIframe(root);
  };

  const observeIframes = () => {
    if (!document.body || state.iframeObserver) return;

    scanIframes();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          sanitizeIframe(mutation.target);
          continue;
        }
        mutation.addedNodes?.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) scanIframes(node);
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
      if (state.iframeObserver === observer) state.iframeObserver = null;
    });
  };

  const patchYouTubePlayer = () => {
    const yt = window.YT;
    if (!state.active || !yt || typeof yt.Player !== "function") return false;
    if (yt.Player.__ivLyricsYoutubeComOwner === ownerToken) return true;

    const OriginalPlayer = yt.Player;
    const WrappedPlayer = function wrappedYoutubePlayer(element, options = {}) {
      const player = new OriginalPlayer(element, {
        ...options,
        host: "https://www.youtube.com",
      });
      setTimeout(() => {
        try {
          sanitizeIframe(player?.getIframe?.());
        } catch {
          // The iframe may not be available until the player is ready.
        }
      }, 0);
      return player;
    };

    Object.setPrototypeOf(WrappedPlayer, OriginalPlayer);
    WrappedPlayer.prototype = OriginalPlayer.prototype;
    WrappedPlayer.__ivLyricsYoutubeComOwner = ownerToken;
    yt.Player = WrappedPlayer;
    state.playerWrappers.push({ original: OriginalPlayer, wrapped: WrappedPlayer });
    return true;
  };

  // VideoBackgroundDepend may replace YT.Player after marketplace addons load.
  // Re-wrap only when the constructor identity changes.
  patchYouTubePlayer();
  state.playerPatchTimer = setInterval(patchYouTubePlayer, 250);
  addRestore(() => {
    clearInterval(state.playerPatchTimer);
    state.playerPatchTimer = null;
    const latest = state.playerWrappers[state.playerWrappers.length - 1];
    if (latest && window.YT?.Player === latest.wrapped) {
      window.YT.Player = latest.original;
    }
  });

  const restore = () => {
    if (!state.active) return;
    state.active = false;
    [...state.restores].reverse().forEach((restoreCallback) => {
      try {
        restoreCallback();
      } catch {
        // A best-effort restore must not break Marketplace uninstall/update.
      }
    });
    state.restores = [];
    state.initialized = false;

    if (window[ADDON_KEY] === state) delete window[ADDON_KEY];
    if (window.ivLyricsYoutubeComVideoBackground?.owner === ownerToken) {
      delete window.ivLyricsYoutubeComVideoBackground;
    }
  };
  state.restore = restore;

  const observeOwnUninstall = () => {
    if (!currentScript?.parentNode || state.scriptObserver) return;
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
      if (state.scriptObserver === observer) state.scriptObserver = null;
    });
  };

  window.ivLyricsYoutubeComVideoBackground = {
    owner: ownerToken,
    addonId,
    version: "0.2.1",
    normalizeYoutubeUrl,
    rescan: scanIframes,
    restore,
  };
  addRestore(() => {
    if (window.ivLyricsYoutubeComVideoBackground?.owner === ownerToken) {
      delete window.ivLyricsYoutubeComVideoBackground;
    }
  });

  observeIframes();
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
