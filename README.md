# Codex Desktop 中文语言包

一键将 Codex Desktop 的菜单和界面完整汉化为简体中文。

## 效果

| 修改前 | 修改后 |
|--------|--------|
| File / Edit / View / Window / Help | 文件 / 编辑 / 视图 / 窗口 / 帮助 |
| Undo / Redo / Cut / Copy / Paste | 撤销 / 重做 / 剪切 / 复制 / 粘贴 |
| Zoom In / Zoom Out / Actual Size | 放大 / 缩小 / 实际大小 |
| Codex Documentation / What's new / Skills | Codex 文档 / 新功能 / 技能 |

**共 39 处修改**，覆盖所有菜单层级。

## 使用方法

### 方式一：直接运行安装脚本（推荐）

```bash
# 下载本仓库，然后运行：
node install.js

# 如果 Codex 不在 /Applications/Codex.app，指定路径：
node install.js /path/to/Codex.app
```

运行后会自动：
1. 备份原始 `app.asar`
2. 解包、应用所有中文修改
3. 重新打包、签名、部署
4. 提示你重启 Codex

### 方式二：手动应用 `zh-CN.json`

将 `zh-CN.json` 替换到 `Codex.app/Contents/Resources/app.asar` 内的 `native-menu-locales/zh-CN.json`，然后开启 `enable_i18n` 并设 locale 为 `zh-CN`。

> 方式二不完整，推荐用方式一。

## 每次 Codex 更新后

Codex 更新会覆盖 `app.asar`，重新运行一次脚本即可：

```bash
node install.js
```

## 卸载（恢复英文）

安装脚本会在 `/tmp/codex-i18n-*/app.asar.backup` 保留备份，将备份文件恢复为 `Codex.app/Contents/Resources/app.asar` 即可。

## 支持的 Codex 版本

| 版本 | 支持情况 |
|------|----------|
| 1.2025.x | ✅ 已测试 |
| 更新版本 | ⚠️ 变量名可能变化，如失效请提 Issue |

## 实现原理

Codex Desktop 是基于 Electron 的应用，有 4 层独立的本地化层级：

| 层级 | 文件 | 修改内容 |
|------|------|----------|
| Electron 主进程 | `main-*.js` | 菜单模板、locale 变量、getLocale 强制返回 zh-CN |
| 原生菜单层 | `native-menu-locales/zh-CN.json` | 对话框翻译（补全至 80+ 条） |
| Preload 层 | `comment-preload.js` 等 | defaultLocale / locale 强制 zh-CN |
| WebView 层 | `app-main-*.js` 等 | enable_i18n 开启、HTML lang 属性 |

## 故障排除

**菜单仍是英文？**
- 完全退出 Codex（Cmd+Q），再重新打开
- 确认运行脚本时用的是 `sudo` (如 Codex 在 `/Applications`)

**脚本运行报错？**
- 确认已安装 Node.js 18+
- 确认 Codex Desktop 已关闭

## License

MIT
