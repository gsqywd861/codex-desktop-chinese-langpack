# Codex Desktop 中文语言包

一键将 Codex Desktop（macOS / Windows）菜单和界面完整汉化为简体中文。

## ✨ 功能

- ✅ 主进程菜单（文件/编辑/视图/窗口/帮助）全部汉化
- ✅ 命令面板菜单项（新建聊天/打开文件夹/设置等）全部汉化
- ✅ WebView 界面语言强制设为简体中文
- ✅ 自动备份原始 `app.asar`，可随时恢复
- ✅ 跨平台支持：macOS / Windows（Linux 理论支持）

## 📦 安装步骤

### macOS

```bash
# 1. 下载本仓库
git clone https://github.com/gsqywd861/codex-desktop-chinese-langpack.git
cd codex-desktop-chinese-langpack

# 2. 运行安装脚本（需要 sudo 权限）
sudo node install.js
```

### Windows

**方式一：批处理脚本（推荐）**

1. 右键点击 `install.bat` → **「以管理员身份运行」**
2. 按提示操作

**方式二：命令行**

```cmd
# 以管理员身份打开「命令提示符」
git clone https://github.com/gsqywd861/codex-desktop-chinese-langpack.git
cd codex-desktop-chinese-langpack
node install.js
```

如果 Codex 不在默认路径，手动指定：

```cmd
node install.js "C:\Users\你的用户名\AppData\Local\Programs\Codex"
```

## 🔄 更新后重装

Codex 更新会覆盖 `app.asar`，重新运行一次脚本即可：

```bash
# macOS
sudo node install.js

# Windows（管理员身份）
node install.js
```

## 🔙 恢复英文原版

```bash
# macOS: 从备份恢复
sudo cp /tmp/codex-i18n-*/app.asar.backup /Applications/Codex.app/Contents/Resources/app.asar

# Windows: 重新安装 Codex 即可
```

## 📋 修改内容说明

脚本共修改 **39 处**，覆盖 4 个层级：

| 层级 | 修改内容 |
|------|----------|
| Electron 主进程 | locale 变量、getLocale 强制返回 zh-CN、菜单标签、子菜单 |
| Preload 层 | defaultLocale / locale 设为 zh-CN |
| WebView 层 | enable_i18n 开启、defaultLocale 设为 zh-CN |
| 命令菜单 | 46 处 menuTitle 替换为中文 |

## ⚠️ 注意事项

- 每次 Codex **更新**后需要重新运行脚本
- 脚本会自动 **备份** 原始 `app.asar` 到 `/tmp/codex-i18n-*/`（macOS）或 `%TEMP%\codex-i18n-*/`（Windows）
- macOS 需要 **临时代码签名**（ad-hoc），不影响正常使用
- Windows 版无需签名，直接替换 `app.asar` 即可

## 🐛 故障排查

**macOS：「权限拒绝」**
```bash
sudo node install.js
```

**Windows：「拒绝访问」**
→ 右键「命令提示符」→「以管理员身份运行」

**菜单仍是英文**
1. 完全退出 Codex（macOS: Cmd+Q / Windows: 任务管理器结束 Codex.exe）
2. 重新打开 Codex
3. 如仍无效，检查是否正确找到了 `app.asar` 路径

## 📝 技术原理

Codex Desktop 基于 Electron，内置了中文翻译文件 `native-menu-locales/zh-CN.json`，但存在以下问题导致无法自动加载中文：

1. `enable_i18n` 功能标志默认为关闭
2. 主进程 `app.getLocale()` 不返回 `zh-CN`
3. 菜单 `role:` 自动生成的子项依赖系统 locale
4. `native-menu-locales/zh-CN.json` 缺少大量菜单翻译 key

本脚本通过**直接修改 JS 源码**的方式强制汉化，不依赖翻译文件加载机制，兼容性更强。

## 📄 文件说明

| 文件 | 说明 |
|------|------|
| `install.js` | 跨平台安装脚本（macOS + Windows） |
| `install.bat` | Windows 批处理脚本（双击以管理员运行） |
| `zh-CN.json` | 补全后的中文翻译文件（供参考） |
| `README.md` | 本文件 |

## 📜 开源协议

MIT License
