#!/usr/bin/env node
/**
 * Codex Desktop 中文语言包安装脚本（跨平台）
 * 支持: macOS / Windows / Linux
 *
 * 用法:
 *   node install.js [/path/to/Codex.exe_or_app]
 *
 * Windows 默认路径: %LOCALAPPDATA%\Programs\Codex\resources\app.asar
 * macOS 默认路径:   /Applications/Codex.app/Contents/Resources/app.asar
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ====== 平台检测 ======
const PLATFORM = os.platform(); // 'darwin' | 'win32' | 'linux'
const IS_MAC = PLATFORM === 'darwin';
const IS_WIN = PLATFORM === 'win32';
const IS_LINUX = PLATFORM === 'linux';

// ====== 配置 ======
function getDefaultCodexPath() {
  if (IS_MAC) {
    return '/Applications/Codex.app';
  }
  if (IS_WIN) {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
    return path.join(localAppData, 'Programs', 'Codex');
  }
  // Linux: 常见安装位置
  return '/opt/Codex' || path.join(process.env.HOME, '.local', 'share', 'Codex');
}

const CODEX_APP_DEFAULT = getDefaultCodexPath();

// ====== 日志 ======
function log(msg) { console.log(msg); }
function step(n, msg) { log(`\n[${n}/8] ${msg}...`); }

function run(cmd, opts = {}) {
  const defaultShell = IS_WIN ? 'cmd.exe' : (IS_MAC ? '/bin/zsh' : '/bin/bash');
  try {
    return execSync(cmd, { stdio: 'inherit', shell: defaultShell, ...opts });
  } catch (e) {
    if (opts.allowFail) return;
    log(`❌ 命令失败: ${cmd}`);
    log(e.message);
    process.exit(1);
  }
}

function sudoRun(cmd, opts = {}) {
  if (IS_WIN) {
    // Windows: 提示用户以管理员身份运行
    log('⚠️  请右键「命令提示符」→「以管理员身份运行」，然后重新执行此脚本');
    log('   或执行: runas /user:Administrator "node install.js"');
    process.exit(1);
  }
  // macOS / Linux: 尝试 sudo
  try {
    return execSync(`sudo ${cmd}`, { stdio: 'inherit', shell: IS_MAC ? '/bin/zsh' : '/bin/bash', ...opts });
  } catch (e) {
    log(`❌ sudo 命令失败: ${cmd}`);
    log('请手动执行: sudo node install.js');
    process.exit(1);
  }
}

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, c) {
  fs.writeFileSync(p, c, 'utf8');
}

// ====== 获取 asar 路径 ======
function getAsarPath(codexAppPath) {
  if (IS_MAC) {
    return path.join(codexAppPath, 'Contents/Resources/app.asar');
  }
  if (IS_WIN) {
    return path.join(codexAppPath, 'resources', 'app.asar');
  }
  // Linux: 通常在 resources/
  return path.join(codexAppPath, 'resources', 'app.asar');
}

// ====== 代码签名 ======
function removeSignature(codexAppPath) {
  if (IS_MAC) {
    run(`codesign --remove-signature "${codexAppPath}"`, { allowFail: true });
  } else if (IS_WIN) {
    // Windows: 通常不需要移除签名，直接替换 app.asar 即可
    // 如果有 signtool，可以尝试移除
    log('⚠️  Windows 版：如需签名，请手动使用 signtool 移除签名');
  }
}

function reSign(codexAppPath) {
  if (IS_MAC) {
    run(`codesign --force --deep --sign - "${codexAppPath}"`, { allowFail: true });
    log('✅ macOS 代码签名已完成（临时签名）');
  } else if (IS_WIN) {
    log('⚠️  Windows 版：如需要，请手动使用 signtool 签名：');
    log('   signtool sign /fd SHA256 /a /tr http://timestamp.digicert.com /td SHA256 "Codex.exe"');
  }
}

// ====== 工作目录 ======
function getWorkDir() {
  if (IS_WIN) {
    return path.join(process.env.TEMP || 'C:\\Temp', `codex-i18n-${Date.now()}`);
  }
  return path.join('/tmp', `codex-i18n-${Date.now()}`);
}

// ====== 主流程 ======
async function main() {
  const codexAppPath = process.argv[2] || CODEX_APP_DEFAULT;
  const asarPath = getAsarPath(codexAppPath);

  const platformName = IS_MAC ? 'macOS' : (IS_WIN ? 'Windows' : 'Linux');
  log(`🚀 Codex Desktop 中文语言包安装器 (${platformName})`);
  log(`📂 Codex 路径: ${codexAppPath}`);
  log(`📦 asar 路径:  ${asarPath}`);

  if (!fs.existsSync(asarPath)) {
    log(`❌ 找不到 app.asar: ${asarPath}`);
    log('请确认 Codex Desktop 已安装，或通过参数指定路径：');
    log('  node install.js /path/to/Codex');
    if (IS_WIN) {
      log('  node install.js "C:\\Users\\你的用户名\\AppData\\Local\\Programs\\Codex"');
    }
    process.exit(1);
  }

  const workDir = getWorkDir();
  fs.mkdirSync(workDir, { recursive: true });
  log(`📁 工作目录: ${workDir}`);

  // Step 1: 备份
  step(1, '备份原始 app.asar');
  const backupPath = path.join(workDir, 'app.asar.backup');
  fs.copyFileSync(asarPath, backupPath);
  log(`✅ 备份至: ${backupPath}`);

  // Step 2: 解包
  step(2, '解包 app.asar');
  const extractDir = path.join(workDir, 'extracted');
  fs.mkdirSync(extractDir, { recursive: true });
  run(`npx @electron/asar extract "${asarPath}" "${extractDir}"`);

  const buildDir = path.join(extractDir, '.vite/build');
  if (!fs.existsSync(buildDir)) {
    log('❌ 找不到 .vite/build 目录');
    process.exit(1);
  }

  // ====== Step 3: 修改主进程 JS ======
  step(3, '修改主进程 JS (main-*.js)');
  const mainFiles = fs.readdirSync(buildDir).filter(f => f.startsWith('main-') && f.endsWith('.js'));
  if (mainFiles.length === 0) { log('❌ 找不到 main-*.js'); process.exit(1); }

  for (const mainFile of mainFiles) {
    const mainPath = path.join(buildDir, mainFile);
    let c = readFile(mainPath);
    let count = 0;

    // --- 3a. locale 变量 yr="en" -> yr="zh-CN" ---
    {
      const before = c;
      c = c.replace(/yr="en"/g, 'yr="zh-CN"');
      if (c !== before) count += (before.match(/yr="en"/g) || []).length;
    }

    // --- 3b. Er() 函数强制返回 zh-CN ---
    {
      const pattern = /function Er\(\)\{return typeof a\.app\.getLocale==`function`\?a\.app\.getLocale\(\):`zh-CN`\}/;
      if (pattern.test(c)) {
        c = c.replace(pattern, 'function Er(){return`zh-CN`}');
        count++;
      }
    }

    // --- 3c. FR() 函数回退值 ---
    {
      const before = c;
      c = c.replace(/(\|")en-US(\"\|)/g, '$1zh-CN$2');
      c = c.replace(/defaultLocale:"en-US"/g, 'defaultLocale:"zh-CN"');
      if (c !== before) count++;
    }

    // --- 3d. Shell HTML lang ---
    {
      const before = c;
      c = c.replace(/<html lang="en">/g, '<html lang="zh-CN">');
      if (c !== before) count++;
    }

    // --- 3e. 顶层菜单标签 ---
    const menuLabelReplacements = [
      ['label:`File`', 'label:`文件`'],
      ['label:`View`', 'label:`视图`'],
      ['{role:`editMenu`', '{label:`编辑`,role:`editMenu`'],
      ['{role:`windowMenu`', '{label:`窗口`,role:`windowMenu`'],
      ['{role:`help`', '{label:`帮助`,role:`help`'],
    ];
    for (const [s, r] of menuLabelReplacements) {
      if (c.includes(s)) { c = c.split(s).join(r); count++; }
    }

    // --- 3f. appMenu 子项 ---
    const appMenuReplacements = [
      ['label:`Check for Updates…`', 'label:`检查更新…`'],
      ['label:`Log Out`', 'label:`退出登录`'],
    ];
    for (const [s, r] of appMenuReplacements) {
      if (c.includes(s)) { c = c.split(s).join(r); count++; }
    }

    // --- 3g. 系统菜单 role 加中文 label ---
    const roleReplacements = [
      ['{role:`services`}', '{label:`服务`,role:`services`}'],
      ['{role:`hide`}', '{label:`隐藏 Codex`,role:`hide`}'],
      ['{role:`hideOthers`}', '{label:`隐藏其他`,role:`hideOthers`}'],
      ['{role:`unhide`}', '{label:`全部显示`,role:`unhide`}'],
    ];
    for (const [s, r] of roleReplacements) {
      if (c.includes(s)) { c = c.split(s).join(r); count++; }
    }

    // --- 3h. quit 加中文 label ---
    {
      const pattern = /(\w),\{role:`quit`\}/;
      const m = c.match(pattern);
      if (m) {
        const replacement = `${m[1]},{label:\`退出 Codex\`,role:\`quit\`}`;
        c = c.split(m[0]).join(replacement);
        count++;
      }
    }

    // --- 3i. 编辑菜单 submenu ---
    {
      const target = '{label:`编辑`,role:`editMenu`,id:t.kn.edit}';
      const replacement = '{label:`编辑`,id:t.kn.edit,submenu:[' +
        '{label:`撤销`,role:`undo`},{label:`重做`,role:`redo`},{type:`separator`},' +
        '{label:`剪切`,role:`cut`},{label:`复制`,role:`copy`},{label:`粘贴`,role:`paste`},' +
        '{label:`粘贴并匹配样式`,role:`pasteAndMatchStyle`},{label:`删除`,role:`delete`},{label:`全选`,role:`selectAll`},' +
        '{type:`separator`},{role:`substitutions`},{role:`speech`}]}';
      if (c.includes(target)) {
        c = c.split(target).join(replacement);
        count++;
      }
    }

    // --- 3j. 窗口菜单 submenu ---
    {
      const target = '{label:`窗口`,role:`windowMenu`,id:t.kn.window}';
      const replacement = '{label:`窗口`,id:t.kn.window,submenu:[' +
        '{label:`最小化`,role:`minimize`},{label:`缩放`,role:`zoom`},{type:`separator`},{label:`全部前置`,role:`front`}]}';
      if (c.includes(target)) {
        c = c.split(target).join(replacement);
        count++;
      }
    }

    // --- 3k. 视图菜单缩放项 ---
    const viewReplacements = [
      ['label:`Zoom In`', 'label:`放大`'],
      ['label:`Zoom Out`', 'label:`缩小`'],
      ['label:`Actual Size`', 'label:`实际大小`'],
      ['label:`Toggle Full Screen`', 'label:`切换全屏`'],
    ];
    for (const [s, r] of viewReplacements) {
      if (c.includes(s)) { c = c.split(s).join(r); count++; }
    }

    // --- 3l. 帮助菜单子项 ---
    const helpReplacements = [
      ['label:`Codex Documentation`', 'label:`Codex 文档`'],
      ['label:`What\\`s new`', 'label:`新功能`'],
      ['label:`Automations`', 'label:`自动化`'],
      ['label:`Local Environments`', 'label:`本地环境`'],
      ['label:`Worktrees`', 'label:`工作树`'],
      ['label:`Skills`', 'label:`技能`'],
      ['label:`Model Context Protocol`', 'label:`模型上下文协议`'],
      ['label:`Troubleshooting`', 'label:`故障排除`'],
      ['label:`Send Feedback`', 'label:`发送反馈`'],
    ];
    for (const [s, r] of helpReplacements) {
      if (c.includes(s)) { c = c.split(s).join(r); count++; }
    }

    // --- 3m. 性能跟踪标签 ---
    const perfReplacements = [
      ['jK=`Start Performance Trace`', 'jK=`开始性能跟踪`'],
      ['MK=`Stop Performance Trace`', 'MK=`停止性能跟踪`'],
      ['NK=`Waiting to Start Trace…`', 'NK=`等待开始跟踪…`'],
      ['PK=`Saving Trace…`', 'PK=`保存跟踪数据…`'],
      ['FK=`Waiting for Trace Details…`', 'FK=`等待跟踪详情…`'],
      ['IK=`Uploading Trace…`', 'IK=`上传跟踪数据…`'],
    ];
    for (const [s, r] of perfReplacements) {
      if (c.includes(s)) { c = c.split(s).join(r); count++; }
    }

    // --- 3n. 开发者工具 ---
    const devReplacements = [
      ['label:`Toggle Query Devtools`', 'label:`切换查询开发者工具`'],
      ['label:`Toggle React Scan`', 'label:`切换 React 扫描`'],
    ];
    for (const [s, r] of devReplacements) {
      if (c.includes(s)) { c = c.split(s).join(r); count++; }
    }

    writeFile(mainPath, c);
    log(`✅ ${mainFile}: ${count} 处修改已应用`);
  }

  // ====== Step 4: 修改 src-VjjkG3q_.js ======
  step(4, '修改命令菜单翻译 (src-VjjkG3q_.js)');
  const srcPath = path.join(buildDir, 'src-VjjkG3q_.js');
  if (fs.existsSync(srcPath)) {
    let s = readFile(srcPath);
    const srcReplacements = [
      ['menuTitle:`New Chat`', 'menuTitle:`新建聊天`'],
      ['menuTitle:`Quick Chat`', 'menuTitle:`快速聊天`'],
      ['menuTitle:`Open Folder…`', 'menuTitle:`打开文件夹…`'],
      ['menuTitle:`Open Recent`', 'menuTitle:`最近打开`'],
      ['menuTitle:`Settings…`', 'menuTitle:`设置…`'],
      ['menuTitle:`Edit in Terminal`', 'menuTitle:`在终端中编辑`'],
      ['menuTitle:`Close Tab`', 'menuTitle:`关闭标签页`'],
      ['menuTitle:`Close All Tabs`', 'menuTitle:`关闭所有标签页`'],
      ['menuTitle:`Split Right`', 'menuTitle:`向右拆分`'],
      ['menuTitle:`Split Down`', 'menuTitle:`向下拆分`'],
      ['menuTitle:`Close`', 'menuTitle:`关闭`'],
      ['menuTitle:`Save`', 'menuTitle:`保存`'],
      ['menuTitle:`Save As…`', 'menuTitle:`另存为…`'],
      ['menuTitle:`Revert File`', 'menuTitle:`还原文件`'],
      ['menuTitle:`Preferences`', 'menuTitle:`偏好设置`'],
      ['menuTitle:`Keyboard Shortcuts`', 'menuTitle:`键盘快捷键`'],
      ['menuTitle:`Toggle Terminal`', 'menuTitle:`切换终端`'],
      ['menuTitle:`Toggle Panel`', 'menuTitle:`切换面板`'],
      ['menuTitle:`Toggle Sidebar`', 'menuTitle:`切换侧边栏`'],
      ['menuTitle:`Toggle Status Bar`', 'menuTitle:`切换状态栏`'],
      ['menuTitle:`Zoom In`', 'menuTitle:`放大`'],
      ['menuTitle:`Zoom Out`', 'menuTitle:`缩小`'],
      ['menuTitle:`Actual Size`', 'menuTitle:`实际大小`'],
      ['menuTitle:`Toggle Full Screen`', 'menuTitle:`切换全屏`'],
      ['menuTitle:`Bring All to Front`', 'menuTitle:`全部前置`'],
      ['menuTitle:`Minimize`', 'menuTitle:`最小化`'],
      ['menuTitle:`Toggle Developer Tools`', 'menuTitle:`切换开发者工具`'],
      ['menuTitle:`Reload`', 'menuTitle:`重新加载`'],
      ['menuTitle:`Force Reload`', 'menuTitle:`强制重新加载`'],
      ['menuTitle:`Toggle Worktrees`', 'menuTitle:`切换工作树`'],
      ['menuTitle:`Toggle Automations`', 'menuTitle:`切换自动化`'],
      ['menuTitle:`Copy Path of File`', 'menuTitle:`复制文件路径`'],
      ['menuTitle:`Copy Relative Path`', 'menuTitle:`复制相对路径`'],
      ['menuTitle:`Reveal in Finder`', IS_MAC ? 'menuTitle:`在 Finder 中显示`' : 'menuTitle:`在资源管理器中显示`'],
      ['menuTitle:`Open in Terminal`', 'menuTitle:`在终端中打开`'],
      ['menuTitle:`Search Symbol`', 'menuTitle:`搜索符号`'],
      ['menuTitle:`Command Palette`', 'menuTitle:`命令面板`'],
      ['menuTitle:`Open Settings`', 'menuTitle:`打开设置`'],
      ['menuTitle:`Install Updates…`', 'menuTitle:`安装更新…`'],
      ['menuTitle:`About Codex`', 'menuTitle:`关于 Codex`'],
    ];
    let srcCount = 0;
    for (const [search, replace] of srcReplacements) {
      if (s.includes(search)) {
        s = s.split(search).join(replace);
        srcCount++;
      }
    }
    writeFile(srcPath, s);
    log(`✅ src-VjjkG3q_.js: ${srcCount} 处修改已应用`);
  } else {
    log(`⚠️  找不到 src-VjjkG3q_.js，跳过`);
  }

  // ====== Step 5: 修改 Preload 层 ======
  step(5, '修改 Preload 层 (locale 设置)');
  const preloadFiles = fs.readdirSync(buildDir).filter(f => f.includes('preload') && f.endsWith('.js'));
  for (const pf of preloadFiles) {
    const p = path.join(buildDir, pf);
    let pc = readFile(p);
    const before = pc;
    pc = pc.replace(/defaultLocale:"en-US",locale:"en-US"/g, 'defaultLocale:"zh-CN",locale:"zh-CN"');
    pc = pc.replace(/defaultLocale:"en",locale:"en"/g, 'defaultLocale:"zh-CN",locale:"zh-CN"');
    if (pc !== before) {
      writeFile(p, pc);
      log(`✅ ${pf}: locale 已设置为 zh-CN`);
    }
  }

  // ====== Step 6: 修改 WebView 层 ======
  step(6, '修改 WebView 层 (enable_i18n + locale)');
  const webviewDir = path.join(extractDir, 'webview/assets');
  if (!fs.existsSync(webviewDir)) {
    log('⚠️  找不到 webview/assets 目录，跳过 WebView 层修改');
  } else {
    const webviewFiles = fs.readdirSync(webviewDir).filter(f => f.endsWith('.js'));
    for (const wf of webviewFiles) {
      const p = path.join(webviewDir, wf);
      let wc = readFile(p);
      const before = wc;

      // 6a. 启用 enable_i18n（关键！）
      // app-main-*.js 里: a?.get(`enable_i18n`,!1) → !0
      // general-settings-*.js 里已经是 !0，不用改
      wc = wc.replace(/\x60enable_i18n\x60,!1/g, '`enable_i18n`,!0');

      // 6b. locale 强制 zh-CN
      wc = wc.replace(/locale:\s*"en"/g, 'locale:"zh-CN"');
      wc = wc.replace(/var t="en-US"/g, 'var t="zh-CN"');
      wc = wc.replace(/<html lang="en">/g, '<html lang="zh-CN">');

      // 6c. defaultLocale 回退
      wc = wc.replace(/defaultLocale:\s*"en"/g, 'defaultLocale:"zh-CN"');
      wc = wc.replace(/defaultLocale:\s*"en-US"/g, 'defaultLocale:"zh-CN"');

      if (wc !== before) {
        writeFile(p, wc);
        log(`  ✅ ${wf}: 已修改`);
      }
    }
    log('✅ WebView 层: i18n 已启用, locale 已设置为 zh-CN');
  }

  // ====== Step 7: 更新 zh-CN.json ======
  step(7, '补全 zh-CN.json 翻译');
  const zhPath = path.join(extractDir, 'native-menu-locales/zh-CN.json');
  if (fs.existsSync(zhPath)) {
    const zh = JSON.parse(readFile(zhPath));
    const additional = {
      "codex.menu.newChat": "新建聊天",
      "codex.menu.quickChat": "快速聊天",
      "codex.menu.openFolder": "打开文件夹…",
      "codex.menu.settings": "设置…",
      "codex.menu.undo": "撤销",
      "codex.menu.redo": "重做",
      "codex.menu.cut": "剪切",
      "codex.menu.copy": "复制",
      "codex.menu.paste": "粘贴",
      "codex.menu.delete": "删除",
      "codex.menu.selectAll": "全选",
      "codex.menu.zoomIn": "放大",
      "codex.menu.zoomOut": "缩小",
      "codex.menu.actualSize": "实际大小",
      "codex.menu.toggleFullScreen": "切换全屏",
      "codex.menu.minimize": "最小化",
      "codex.menu.zoom": "缩放",
      "codex.menu.bringAllToFront": "全部前置",
      "codex.menu.checkForUpdates": "检查更新…",
      "codex.menu.logOut": "退出登录",
      "codex.menu.documentation": "Codex 文档",
      "codex.menu.whatsNew": "新功能",
      "codex.menu.automations": "自动化",
      "codex.menu.localEnvironments": "本地环境",
      "codex.menu.worktrees": "工作树",
      "codex.menu.skills": "技能",
      "codex.menu.mcp": "模型上下文协议",
      "codex.menu.troubleshooting": "故障排除",
      "codex.menu.sendFeedback": "发送反馈",
    };
    let added = 0;
    for (const [key, value] of Object.entries(additional)) {
      if (!zh[key]) { zh[key] = value; added++; }
    }
    writeFile(zhPath, JSON.stringify(zh, null, 2));
    log(`✅ zh-CN.json: 新增 ${added} 条翻译`);
  }

  // ====== Step 8: 重新打包并部署 ======
  step(8, '重新打包并部署');
  const newAsar = path.join(workDir, 'app.asar');
  run(`npx @electron/asar pack "${extractDir}" "${newAsar}"`);
  log('✅ 打包完成');

  log('\n📦 部署: 移除签名并替换 app.asar...');
  removeSignature(codexAppPath);
  fs.copyFileSync(newAsar, asarPath);
  log('✅ app.asar 已替换');

  reSign(codexAppPath);

  log('\n✅ ✅ ✅ 中文语言包安装完成！');
  if (IS_MAC) {
    log('请完全退出 Codex Desktop (Cmd+Q)，然后重新打开。');
  } else if (IS_WIN) {
    log('请完全退出 Codex Desktop，然后重新打开。');
  }
  log(`备份文件位于: ${backupPath}`);
}

main().catch(e => {
  log('\n❌ 安装失败:');
  log(e.message);
  log('');
  log('💡 排查建议：');
  log('  1. 确认 Codex Desktop 已完全退出');
  if (IS_WIN) {
    log('  2. Windows: 请右键「命令提示符」→「以管理员身份运行」，然后重新执行');
    log('     或：执行 install.bat（右键 → 以管理员身份运行）');
  } else {
    log('  2. macOS: 确认有 /Applications/Codex.app 的写入权限');
    log('  3. 尝试用 sudo 运行: sudo node install.js');
  }
  process.exit(1);
});
