# Unofficial YouTube.com Video Background Workaround for ivLyrics

An unofficial ivLyrics Marketplace utility addon that rewrites YouTube video background embeds from `youtube-nocookie.com` to `www.youtube.com`.

It attempts to work around YouTube's video background prompt:

> Sign in to confirm you're not a bot

## Important Support Notice

This addon uses a non-standard workaround. It is not an official ivLyrics feature, not an officially supported ivLyrics behavior, and not the implementation path ivLyrics upstream is expected to support.

If you see any video background problem while this addon is installed, disable this addon first. Contact ivLyrics developers only if the same issue still reproduces after this addon is disabled.

This addon may stop helping if YouTube changes its embed behavior or account verification rules.

## What it does

- Rewrites existing YouTube iframe `src` values from `youtube-nocookie.com` to `www.youtube.com`.
- Patches future iframe `src` assignments.
- Patches `YT.Player` creation to prefer `https://www.youtube.com`.
- Restores its patches when the Marketplace removes the addon script element.

## Marketplace type

The official ivLyrics Marketplace currently executes JavaScript only for `lyrics` and `ai` addons. This addon is published as `type: "ai"` only to use the official JavaScript loading path. It does not register an AI provider and does not modify ivLyrics upstream files.

## Install

Add the `ivlyrics-addon` GitHub topic to this repository. ivLyrics Marketplace will discover `manifest.json` and install `Addon_YoutubeComVideoBackground.js`.

## Validate

```bash
npm run validate
```
