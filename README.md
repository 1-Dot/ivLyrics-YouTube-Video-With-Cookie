# ivLyrics YouTube Video With Cookie

An unofficial ivLyrics Marketplace utility addon that rewrites YouTube video background embeds from `youtube-nocookie.com` to `www.youtube.com`.

It attempts to work around YouTube's video background prompt:

> Sign in to confirm you're not a bot

## Important Support Notice

This addon uses a non-standard workaround. It is not an official ivLyrics feature, not an officially supported ivLyrics behavior, and not the implementation path ivLyrics upstream is expected to support.

If you see any video background problem while this addon is installed, disable this addon first. Contact ivLyrics developers only if the same issue still reproduces after this addon is disabled.

## Cookie Requirement

This addon does not log in to YouTube for you. It only changes the embed host so YouTube can use normal `youtube.com` cookies.

For this workaround to help, you need to use another method to make YouTube logged in inside Spotify's CEF browser context.

## What it does

- Rewrites existing YouTube iframe `src` values from `youtube-nocookie.com` to `www.youtube.com`.
- Rewrites again at the final iframe boundary after ivLyrics 6.x `VideoBackgroundDepend` forces the no-cookie host.
- Tracks runtime `YT.Player` replacements and prefers `https://www.youtube.com`.
- Restores its patches when the Marketplace removes the addon script element.

After installing or updating, restart Spotify once so the addon can attach before the first player is created.

## Marketplace type

This addon is listed as `type: "lyrics"` so it appears under the Lyrics category in the official ivLyrics Marketplace. It does not register a lyrics provider and does not modify ivLyrics upstream files.
