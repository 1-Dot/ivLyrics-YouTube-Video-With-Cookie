(function ivLyricsYoutubeComVideoBackgroundAddon() {
  'use strict';

  /*
   * Unofficial workaround for YouTube video background bot-check prompts.
   * This is not an ivLyrics-supported or recommended integration path.
   * If video background problems occur, disable this addon first and only
   * report upstream when the issue still reproduces without it.
   */

  const ADDON_KEY = '__ivLyricsYoutubeComVideoBackgroundAddon';
  const currentScript = document.currentScript;
  const addonId = currentScript?.dataset?.marketplaceAddon || 'youtube-com-video-background';

  if (window[ADDON_KEY]?.initialized) {
    return;
  }

  const state = window[ADDON_KEY] || (window[ADDON_KEY] = {
    initialized: true,
    scriptObserver: null,
    playerPatchInterval: null,
    restores: []
  });

  const addRestore = (restore) => {
    if (typeof restore === 'function') {
      state.restores.push(restore);
    }
  };

  const toYouTubeComValue = (value) => {
    if (typeof value !== 'string') {
      return value;
    }
    return value.replace(/(^https?:\/\/)(?:www\.)?youtube-nocookie\.com/ig, '$1www.youtube.com')
      .replace(/^(?:www\.)?youtube-nocookie\.com$/i, 'www.youtube.com');
  };

  const toYouTubeComUrl = (value) => {
    if (!value || !/youtube-nocookie\.com/i.test(String(value))) {
      return value;
    }

    try {
      const url = new URL(value, window.location.origin);
      if (/youtube-nocookie\.com$/i.test(url.hostname)) {
        url.hostname = 'www.youtube.com';
      }
      return url.toString();
    } catch {
      return toYouTubeComValue(String(value));
    }
  };

  const patchUrlHostnameSetter = () => {
    if (!window.URL || URL.prototype.__ivLyricsYoutubeComHostnameWrapped) {
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(URL.prototype, 'hostname');
    if (!descriptor?.set) {
      return;
    }

    Object.defineProperty(URL.prototype, 'hostname', {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set(value) {
        descriptor.set.call(this, toYouTubeComValue(value));
      }
    });

    URL.prototype.__ivLyricsYoutubeComHostnameWrapped = true;
    addRestore(() => {
      Object.defineProperty(URL.prototype, 'hostname', descriptor);
      delete URL.prototype.__ivLyricsYoutubeComHostnameWrapped;
    });
  };

  const rewritePlayerIframeOnce = (player) => {
    try {
      const iframe = typeof player?.getIframe === 'function' ? player.getIframe() : null;
      if (!iframe || iframe.tagName !== 'IFRAME') {
        return;
      }

      const currentSrc = iframe.getAttribute('src');
      const nextSrc = toYouTubeComUrl(currentSrc);
      if (nextSrc && nextSrc !== currentSrc) {
        iframe.setAttribute('src', nextSrc);
      }
    } catch {
      // Ignore players that are not ready or expose no iframe.
    }
  };

  const patchYouTubePlayerConstructor = () => {
    if (!window.YT || typeof window.YT.Player !== 'function') {
      return false;
    }

    const CurrentPlayer = window.YT.Player;
    if (CurrentPlayer.__ivLyricsYoutubeComWrapped) {
      return true;
    }

    const WrappedPlayer = function wrappedYoutubePlayer(element, config = {}) {
      const nextConfig = { ...config };
      nextConfig.host = 'https://www.youtube.com';

      const player = new CurrentPlayer(element, nextConfig);

      setTimeout(() => rewritePlayerIframeOnce(player), 0);
      setTimeout(() => rewritePlayerIframeOnce(player), 250);
      setTimeout(() => rewritePlayerIframeOnce(player), 1000);

      return player;
    };

    Object.setPrototypeOf(WrappedPlayer, CurrentPlayer);
    WrappedPlayer.prototype = CurrentPlayer.prototype;
    WrappedPlayer.__ivLyricsYoutubeComWrapped = true;
    WrappedPlayer.__ivLyricsYoutubeComWrappedTarget = CurrentPlayer;
    window.YT.Player = WrappedPlayer;

    addRestore(() => {
      if (window.YT?.Player === WrappedPlayer) {
        window.YT.Player = CurrentPlayer;
      }
    });

    return true;
  };

  const keepYouTubePlayerPatched = () => {
    if (state.playerPatchInterval) {
      return;
    }

    patchYouTubePlayerConstructor();
    state.playerPatchInterval = setInterval(patchYouTubePlayerConstructor, 500);
    addRestore(() => {
      if (state.playerPatchInterval) {
        clearInterval(state.playerPatchInterval);
        state.playerPatchInterval = null;
      }
    });
  };

  const restore = () => {
    if (state.playerPatchInterval) {
      clearInterval(state.playerPatchInterval);
      state.playerPatchInterval = null;
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
    toYouTubeComUrl,
    restore
  };

  addRestore(() => {
    if (window.ivLyricsYoutubeComVideoBackground?.addonId === addonId) {
      delete window.ivLyricsYoutubeComVideoBackground;
    }
  });

  patchUrlHostnameSetter();
  keepYouTubePlayerPatched();
  observeOwnUninstall();
})();
