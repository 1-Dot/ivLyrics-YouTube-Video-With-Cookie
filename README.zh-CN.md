# ivLyrics YouTube Video With Cookie

这是一个 ivLyrics 官方插件市场格式的非官方工具型插件，用于把视频背景里的 YouTube 嵌入地址从 `youtube-nocookie.com` 改为 `www.youtube.com`。

它尝试绕过/缓解 YouTube 视频背景中的提示：

> 请登录，以便我们确认你不是聊天机器人

## 重要支持说明

本插件是非标准绕行方案。它不是 ivLyrics 官方功能，不属于 ivLyrics 官方支持行为，也不是上游 ivLyrics 期望维护的实现路径。

如果安装本插件后出现任何视频背景相关问题，请先关闭本插件再排查。只有在关闭本插件后问题仍然复现时，才建议联系 ivLyrics 开发者。

## Cookie / 登录要求

本插件不会帮你登录 YouTube。它只负责把嵌入域名改成普通的 `youtube.com`，让 YouTube 有机会读取 `youtube.com` cookie。

这个绕行方案要有效，你还需要通过别的手段让 Spotify 的 CEF 浏览器环境里的 YouTube 处于已登录状态。

## 功能

- 将已有 iframe 的 `src` 从 `youtube-nocookie.com` 改为 `www.youtube.com`。
- 拦截后续 iframe `src` 写入。
- 拦截 `YT.Player` 创建，优先使用 `https://www.youtube.com`。
- 当插件市场移除该插件脚本元素时，会还原自身 patch。

## 关于插件类型

本插件使用 `type: "lyrics"`，因此会显示在 ivLyrics 官方插件市场的歌词分类下。它不会注册歌词提供器，也不会修改 ivLyrics 上游文件。
