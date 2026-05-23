const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'manifest.json');
const addonPath = path.join(root, 'Addon_YoutubeComVideoBackground.js');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!Array.isArray(manifest.addons) || manifest.addons.length !== 1) {
  throw new Error('manifest.json must contain exactly one addon.');
}

const addon = manifest.addons[0];
for (const key of ['name', 'type', 'author', 'version', 'description', 'downloadUrl']) {
  if (!addon[key]) throw new Error(`manifest addon is missing ${key}.`);
}

if (addon.type !== 'ai') {
  throw new Error('manifest addon type must be ai so the official marketplace loads it as executable JavaScript.');
}

const code = fs.readFileSync(addonPath, 'utf8');
for (const needle of [
  'youtube-nocookie\\.com',
  'www.youtube.com',
  'URL.prototype',
  'YT.Player',
  'MutationObserver',
  'restore'
]) {
  if (!code.includes(needle)) throw new Error(`Addon code is missing ${needle}.`);
}

console.log('Manifest and addon shape look valid.');
