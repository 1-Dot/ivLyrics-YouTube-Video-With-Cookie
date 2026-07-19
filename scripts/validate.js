const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'manifest.json');
const addonPath = path.join(root, 'Addon_YouTubeVideoWithCookie.js');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!Array.isArray(manifest.addons) || manifest.addons.length !== 1) {
  throw new Error('manifest.json must contain exactly one addon.');
}

const addon = manifest.addons[0];
for (const key of ['name', 'type', 'author', 'version', 'description', 'downloadUrl']) {
  if (!addon[key]) throw new Error(`manifest addon is missing ${key}.`);
}

if (addon.type !== 'lyrics') {
  throw new Error('manifest addon type must be lyrics so the official marketplace lists it under lyrics.');
}

const code = fs.readFileSync(addonPath, 'utf8');
for (const needle of [
  'youtube-nocookie\\.com',
  'www.youtube.com',
  '__ivLyricsYouTubeVideoWithCookieBridge',
  'setInterval(patchYouTubePlayer, 250)',
  'VideoBackgroundDepend may replace YT.Player',
  'MutationObserver',
  'restore'
]) {
  if (!code.includes(needle)) throw new Error(`Addon code is missing ${needle}.`);
}

if (addon.version !== require('../package.json').version) {
  throw new Error('manifest.json and package.json versions must match.');
}

if (addon.minAppVersion !== '6.0.0') {
  throw new Error('minAppVersion must target the ivLyrics 6.x video implementation.');
}

class FakeIframe {
  constructor() {
    this.tagName = 'IFRAME';
    this.attributes = new Map();
    this.srcWriteCount = 0;
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  setAttribute(name, value) {
    if (name.toLowerCase() === 'src') this.srcWriteCount += 1;
    this.attributes.set(name, String(value));
  }
}

Object.defineProperty(FakeIframe.prototype, 'src', {
  configurable: true,
  enumerable: true,
  get() {
    return this.getAttribute('src') || '';
  },
  set(value) {
    this.setAttribute('src', value);
  }
});

const intervalCallbacks = [];
const fakeScriptParent = {};
const sandbox = {
  URL,
  console,
  setTimeout(callback) {
    callback();
    return 1;
  },
  clearTimeout() {},
  setInterval(callback) {
    intervalCallbacks.push(callback);
    return intervalCallbacks.length;
  },
  clearInterval() {},
  MutationObserver: class {
    observe() {}
    disconnect() {}
  },
  Node: { ELEMENT_NODE: 1 },
  HTMLIFrameElement: FakeIframe,
  document: {
    body: { querySelectorAll: () => [] },
    currentScript: {
      dataset: { marketplaceAddon: 'test/youtube-video-with-cookie' },
      parentNode: fakeScriptParent
    },
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {}
  }
};
sandbox.window = sandbox;
sandbox.location = { origin: 'https://xpui.app' };

vm.runInNewContext(code, sandbox, { filename: addonPath });

const api = sandbox.ivLyricsYoutubeComVideoBackground;
if (!api) throw new Error('Addon did not expose its runtime API.');

const inputUrl = 'https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0';
const expectedUrl = 'https://www.youtube.com/embed/abcdefghijk?rel=0';
if (api.normalizeYoutubeUrl(inputUrl) !== expectedUrl) {
  throw new Error('youtube-nocookie URL normalization failed.');
}

const iframe = new FakeIframe();
iframe.setAttribute('src', inputUrl);
if (iframe.getAttribute('src') !== expectedUrl) {
  throw new Error('iframe setAttribute bridge did not keep the normal YouTube host.');
}
if (iframe.srcWriteCount !== 1) {
  throw new Error('initial iframe URL should be written exactly once.');
}

// ivLyrics 6.x observes the youtube.com iframe, derives a no-cookie URL and
// writes it back. The addon transforms that value to the already-current URL;
// performing the identical write would reload the iframe and black out the
// player after a track change.
iframe.setAttribute('src', inputUrl);
if (iframe.srcWriteCount !== 1) {
  throw new Error('redundant ivLyrics iframe rewrite was not suppressed.');
}

const nextTrackIframe = new FakeIframe();
nextTrackIframe.setAttribute(
  'src',
  'https://www.youtube-nocookie.com/embed/lmnopqrstuv?rel=0'
);
if (
  nextTrackIframe.getAttribute('src') !==
  'https://www.youtube.com/embed/lmnopqrstuv?rel=0' ||
  nextTrackIframe.srcWriteCount !== 1
) {
  throw new Error('track-change iframe was not initialized exactly once.');
}

let receivedHost = null;
sandbox.YT = {
  Player: function OriginalPlayer(_element, options) {
    receivedHost = options.host;
    return { getIframe: () => iframe };
  }
};
intervalCallbacks[0]();

const AddonWrappedPlayer = sandbox.YT.Player;
sandbox.YT.Player = function IvLyricsVideoBackgroundDepend(element, options) {
  return new AddonWrappedPlayer(element, {
    ...options,
    host: 'https://www.youtube-nocookie.com'
  });
};
intervalCallbacks[0]();
new sandbox.YT.Player({}, {});
if (receivedHost !== 'https://www.youtube.com') {
  throw new Error('YT.Player compatibility wrapper lost to the ivLyrics 6.x host override.');
}

api.restore();
iframe.setAttribute('src', inputUrl);
if (iframe.getAttribute('src') !== inputUrl) {
  throw new Error('iframe bridge did not become a pass-through after restore.');
}

console.log('Manifest and addon shape look valid.');
