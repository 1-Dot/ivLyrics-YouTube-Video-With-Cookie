# ivLyrics 非官方 YouTube.com 视频背景绕行插件

这是一个 ivLyrics 官方插件市场格式的非官方工具型插件，用于把视频背景里的 YouTube 嵌入地址从 `youtube-nocookie.com` 改为 `www.youtube.com`。

它尝试绕过/缓解 YouTube 视频背景中的提示：

> 请登录，以便我们确认你不是聊天机器人

## 重要支持说明

本插件是非标准绕行方案。它不是 ivLyrics 官方功能，不属于 ivLyrics 官方支持行为，也不是上游 ivLyrics 期望维护的实现路径。

如果安装本插件后出现任何视频背景相关问题，请先关闭本插件再排查。只有在关闭本插件后问题仍然复现时，才建议联系 ivLyrics 开发者。

如果 YouTube 调整嵌入策略或账号验证规则，本插件可能随时失效。

## 功能

- 将已有 iframe 的 `src` 从 `youtube-nocookie.com` 改为 `www.youtube.com`。
- 拦截 URL hostname 写入，让 ivLyrics 现有 YouTube sanitizer 解析到 `www.youtube.com`。
- 拦截 `YT.Player` 创建，优先使用 `https://www.youtube.com`。
- 只对受影响播放器实例创建出的 iframe 做一次性替换，不再全局监听或重写所有 iframe。
- 当插件市场移除该插件脚本元素时，会还原自身 patch。

## 关于插件类型

当前 ivLyrics 官方插件市场只有 `lyrics` 和 `ai` 类型会执行 JavaScript。这个插件使用 `type: "ai"` 只是为了走官方 JS 加载路径；它不会注册 AI provider，也不会修改 ivLyrics 上游文件。

## 安装

给该仓库添加 `ivlyrics-addon` GitHub topic。ivLyrics 插件市场会读取 `manifest.json` 并安装 `Addon_YoutubeComVideoBackground.js`。

## 校验

```bash
npm run validate
```
