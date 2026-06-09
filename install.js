#!/usr/bin/env node
/**
 * Codex Desktop 一键汉化脚本 (macOS)
 * 
 * 用法：
 *   node install.js              # 自动查找 Codex.app
 *   node install.js /path/to/Codex.app  # 指定路径
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CODEX_APP = process.argv[2] || '/Applications/Codex.app';
const ASAR_PATH = path.join(CODEX_APP, 'Contents/Resources/app.asar');
const EXTRACT_DIR = '/tmp/codex-asar-extract';
const BACKUP_PATH = path.join(require('os').homedir(), 'codex-app.asar.backup');

let stepCount = 0;

function step(n, msg) {
  stepCount = n;
  console.log(`\n[步骤 ${n}] ${msg}...`);
}

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'inherit' });
  } catch(e) {
    console.error(`❌ 命令失败: ${cmd}`);
    console.error(e.message);
    process.exit(1);
  }
}

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, c) {
  fs.writeFileSync(p, c, 'utf8');
}

// ====== 开始 ======
console.log('=== Codex Desktop 一键汉化脚本 ===');
console.log(`目标: ${CODEX_APP}`);

// 检查 asar 工具
try {
  execSync('npx @electron/asar --version', { stdio: 'pipe' });
  console.log('✅ @electron/asar 可用');
} catch(e) {
  console.log('正在安装 @electron/asar...');
  run('npm install -g @electron/asar');
}

// 检查 Codex.app 是否存在
if (!fs.existsSync(ASAR_PATH)) {
  console.error(`❌ 找不到 ${ASAR_PATH}`);
  console.error('请确认 Codex.app 已安装，或传入正确路径：');
  console.error('  node install.js /path/to/Codex.app');
  process.exit(1);
}
console.log(`✅ 找到 app.asar: ${ASAR_PATH}`);

// Step 1: 备份
step(1, '备份原始 app.asar');
if (!fs.existsSync(BACKUP_PATH)) {
  fs.copyFileSync(ASAR_PATH, BACKUP_PATH);
  console.log(`✅ 已备份到: ${BACKUP_PATH}`);
} else {
  console.log(`✅ 备份已存在: ${BACKUP_PATH}`);
}

// Step 2: 解包
step(2, '解包 app.asar');
if (fs.existsSync(EXTRACT_DIR)) {
  fs.rmSync(EXTRACT_DIR, { recursive: true });
}
fs.mkdirSync(EXTRACT_DIR, { recursive: true });
run(`npx @electron/asar extract "${ASAR_PATH}" "${EXTRACT_DIR}"`);
console.log('✅ 解包完成');

// Step 3: 修改主进程层 (main-*.js)
step(3, '修改主进程层 (locale + 菜单标签)');
const buildDir = path.join(EXTRACT_DIR, '.vite/build');

const mainFile = fs.readdirSync(buildDir).find(f => f.startsWith('main-') && f.endsWith('.js'));
if (!mainFile) { console.error('❌ 找不到 main-*.js'); process.exit(1); }
const mainPath = path.join(buildDir, mainFile);
let mainContent = readFile(mainPath);
const mainOrigin = mainContent;

// yr="en" → yr="zh-CN"
mainContent = mainContent.replace(/yr="en"/g, 'yr="zh-CN"');

// getLocale 强制返回 zh-CN
mainContent = mainContent.replace(
  /function Er\(\)\{return typeof a\.app\.getLocale==\\`function\\`\?a\.app\.getLocale\(\):\\`[^\`]*\\`\}/g,
  'function Er(){return\\`zh-CN\\`}'
);

// FR 函数 fallback
mainContent = mainContent.replace(/return"[A-Za-z]{2}-[A-Za-z]{2}"/g, 'return"zh-CN"');

// HTML lang
mainContent = mainContent.replace(/<html lang="en">/g, '<html lang="zh-CN">');

// 顶层菜单标签
mainContent = mainContent.replace(/label:\\`File\\`/g, 'label:\\`文件\\`');
mainContent = mainContent.replace(/label:\\`View\\`/g, 'label:\\`视图\\`');

// editMenu 加 label
mainContent = mainContent.replace(/\{role:\\`editMenu\\`/g, '{label:\\`编辑\\`,role:\\`editMenu\\`');

// windowMenu 加 label
mainContent = mainContent.replace(/\{role:\\`windowMenu\\`/g, '{label:\\`窗口\\`,role:\\`windowMenu\\`');

// help 加 label
mainContent = mainContent.replace(/\{role:\\`help\\`/g, '{label:\\`帮助\\`,role:\\`help\\`');

// appMenu 子项
mainContent = mainContent.replace(/\\`Check for Updates\\.\\.\\`/g, '\\`检查更新\\.\\.\\`');
mainContent = mainContent.replace(/\\`Log Out\\.\\.\\.\\`/g, '\\`退出登录\\.\\.\\.\\`');
mainContent = mainContent.replace(/\\`Hide\\s*Codex\\`/g, '\\`隐藏 Codex\\`');
mainContent = mainContent.replace(/\\`Hide Others\\`/g, '\\`隐藏其他\\`');
mainContent = mainContent.replace(/\\`Show All\\`/g, '\\`全部显示\\`');
mainContent = mainContent.replace(/\\`Quit Codex\\`/g, '\\`退出 Codex\\`');

// View 菜单子项
mainContent = mainContent.replace(/\\`Zoom In\\`/g, '\\`放大\\`');
mainContent = mainContent.replace(/\\`Zoom Out\\`/g, '\\`缩小\\`');
mainContent = mainContent.replace(/\\`Actual Size\\`/g, '\\`实际大小\\`');
mainContent = mainContent.replace(/\\`Toggle Full Screen\\`/g, '\\`切换全屏\\`');

// Help 菜单子项
mainContent = mainContent.replace(/\\`Codex Documentation\\`/g, '\\`Codex 文档\\`');
mainContent = mainContent.replace(/\\`What\\'s new\\`/g, '\\`新功能\\`');

// Performance trace
mainContent = mainContent.replace(/\\`Start\\`/g, '\\`开始\\`');
mainContent = mainContent.replace(/\\`Stop\\`/g, '\\`停止\\`');
mainContent = mainContent.replace(/\\`Waiting\\.\\.\\.\\`/g, '\\`等待中\\.\\.\\.\\`');
mainContent = mainContent.replace(/\\`Saving\\.\\.\\.\\`/g, '\\`保存中\\.\\.\\.\\`');
mainContent = mainContent.replace(/\\`Uploading\\.\\.\\.\\`/g, '\\`上传中\\.\\.\\.\\`');

if (mainContent !== mainOrigin) {
  writeFile(mainPath, mainContent);
  console.log(`✅ ${mainFile} 已修改`);
} else {
  console.log(`⚠️  ${mainFile} 未检测到修改（可能已汉化）`);
}

// Step 4: 修改命令定义层 (src-VjjkG3q_.js, 46处)
step(4, '修改命令定义层 (menuTitle, 46处)');
const srcFile = fs.readdirSync(buildDir).find(f => f === 'src-VjjkG3q_.js');
if (!srcFile) { console.error('❌ 找不到 src-VjjkG3q_.js'); process.exit(1); }
const srcPath = path.join(buildDir, srcFile);
let srcContent = readFile(srcPath);
const srcOrigin = srcContent;

const menuTitleMap = {
  'New Chat': '新建聊天',
  'Quick Chat': '快速聊天',
  'Open Folder…': '打开文件夹…',
  'Open Workspace…': '打开工作区…',
  'Settings…': '设置…',
  'Search Chats…': '搜索聊天…',
  'Toggle Sidebar': '切换侧边栏',
  'New Window': '新建窗口',
  'Select Next Chat': '选择下一个聊天',
  'Select Previous Chat': '选择上一个聊天',
  'Undo': '撤销',
  'Redo': '重做',
  'Cut': '剪切',
  'Copy': '复制',
  'Paste': '粘贴',
  'Paste and Match Style': '粘贴并匹配样式',
  'Delete': '删除',
  'Select All': '全选',
  'Speech': '语音',
  'Start Speaking': '开始朗读',
  'Stop Speaking': '停止朗读',
  'Minimize': '最小化',
  'Zoom': '缩放',
  'Bring All to Front': '全部前置',
  'Toggle Full Screen': '切换全屏',
  'Codex Documentation': 'Codex 文档',
  'What\'s New': '新功能',
  'Automations': '自动化',
  'Local Environments': '本地环境',
  'Worktrees': '工作树',
  'Skills': '技能',
  'Model Context Protocol': '模型上下文协议',
  'Troubleshooting': '故障排除',
  'Send Feedback': '发送反馈',
  'Toggle Developer Tools': '切换开发者工具',
  'Toggle Query Devtools': '切换查询开发者工具',
  'Toggle React Scan': '切换 React 扫描',
};

let replaceCount = 0;
for (const [en, zh] of Object.entries(menuTitleMap)) {
  const before = srcContent;
  const target = 'menuTitle:\\`' + en + '\\`';
  const replacement = 'menuTitle:\\`' + zh + '\\`';
  srcContent = srcContent.split(target).join(replacement);
  if (srcContent !== before) replaceCount++;
}
console.log(`  ✅ 已替换 ${replaceCount} 处 menuTitle`);

if (srcContent !== srcOrigin) {
  writeFile(srcPath, srcContent);
  console.log(`✅ ${srcFile} 已修改`);
} else {
  console.log(`⚠️  ${srcFile} 未检测到修改（可能已汉化）`);
}

// Step 5: 修改 Preload 层
step(5, '修改 Preload 层');
const preloadFiles = fs.readdirSync(buildDir).filter(f => f.includes('preload') && f.endsWith('.js'));
for (const pf of preloadFiles) {
  const p = path.join(buildDir, pf);
  let c = readFile(p);
  const before = c;
  c = c.replace(/defaultLocale:"en-US"/g, 'defaultLocale:"zh-CN"');
  c = c.replace(/defaultLocale:"en"/g, 'defaultLocale:"zh-CN"');
  c = c.replace(/locale:"en-US"/g, 'locale:"zh-CN"');
  c = c.replace(/r\.locale=r\.defaultLocale\|\|"en"/g, 'r.locale=r.defaultLocale||"zh-CN"');
  if (c !== before) {
    writeFile(p, c);
    console.log(`  ✅ ${pf} 已修改`);
  }
}
console.log('✅ Preload 层修改完成');

// Step 6: 修改 WebView 层（最关键：enable_i18n + app-intl-signal）
step(6, '修改 WebView 层 (enable_i18n + locale + 翻译)');
const webviewAssets = path.join(EXTRACT_DIR, 'webview/assets');
if (!fs.existsSync(webviewAssets)) {
  console.log('⚠️  找不到 webview/assets，跳过 WebView 层修改');
} else {
  const wvFiles = fs.readdirSync(webviewAssets).filter(f => f.endsWith('.js'));
  
  // 6.1 启用 enable_i18n（关键！）
  for (const wf of wvFiles) {
    const p = path.join(webviewAssets, wf);
    let c = readFile(p);
    // app-main-*.js 里: a?.get(`enable_i18n`,!1) → !0
    c = c.replace(/\x60enable_i18n\x60,!1/g, '`enable_i18n`,!0');
    // locale 强制 zh-CN
    c = c.replace(/locale:\s*"en"/g, 'locale:"zh-CN"');
    c = c.replace(/var t="en-US"/g, 'var t="zh-CN"');
    c = c.replace(/<html lang="en">/g, '<html lang="zh-CN">');
    c = c.replace(/defaultLocale:\s*"en"/g, 'defaultLocale:"zh-CN"');
    writeFile(p, c);
  }
  console.log('✅ enable_i18n 已启用，locale 已设置为 zh-CN');
  
  // 6.2 修复 app-intl-signal（内联中文翻译，避免 import 错误）
  const zhCNFile = fs.readdirSync(webviewAssets).find(f => f.startsWith('zh-CN-') && f.endsWith('.js'));
  const signalFile = fs.readdirSync(webviewAssets).find(f => f.startsWith('app-intl-signal-') && f.endsWith('.js'));
  
  if (zhCNFile && signalFile) {
    console.log(`  📦 找到中文翻译包: ${zhCNFile}`);
    console.log(`  🔧 修复: ${signalFile}`);
    
    // 提取中文翻译对象（用括号计数，不用正则）
    const zhContent = readFile(path.join(webviewAssets, zhCNFile));
    
    // 找到 "var e=...,t={"key":"value",...};" 中的 t={...} 部分
    // 用括号计数精确提取
    let tStart = -1;
    let braceCount = 0;
    let inT = false;
    
    // 先找到 ",t=" 的位置
    const tAssignIdx = zhContent.indexOf(',t=');
    if (tAssignIdx !== -1) {
      tStart = tAssignIdx + 3; // 跳过 ",t="
      
      // 从 tStart 开始，用括号计数找到匹配的结束括号
      braceCount = 0;
      let i = tStart;
      while (i < zhContent.length) {
        const ch = zhContent[i];
        if (ch === '{') braceCount++;
        if (ch === '}') {
          braceCount--;
          if (braceCount === 0) {
            // 找到了结束位置
            const zhObj = zhContent.substring(tStart, i + 1);
            console.log(`  📦 翻译对象大小: ${(zhObj.length / 1024).toFixed(1)} KB`);
            
            // 写入修复后的 app-intl-signal（内联翻译，用字符串拼接避免模板字符串问题）
            const vsCodeImport = 'import{W as e,h as t}from"./vscode-api-DjORcpSo.js";';
            const libImport = 'import{s as n}from"./lib-MoKmYgcO.js";';
            const intlCall = 'var r=e(t,n({locale:"zh-CN",messages:';
            const exportStmt = '}));export{r as t};';
            const fixedSignal = vsCodeImport + libImport + intlCall + zhObj + exportStmt;
            writeFile(path.join(webviewAssets, signalFile), fixedSignal);
            console.log(`  ✅ ${signalFile} 已修复（内联中文翻译）`);
            break;
          }
        }
        i++;
      }
    } else {
      console.log(`  ⚠️  无法提取翻译对象，跳过 app-intl-signal 修复`);
    }
  } else {
    console.log(`  ⚠️  找不到 zh-CN-*.js 或 app-intl-signal-*.js`);
  }
}

// Step 7: 重新打包
step(7, '重新打包 app.asar');
const newAsar = '/tmp/codex-app-chinese.asar';
run(`npx @electron/asar pack "${EXTRACT_DIR}" "${newAsar}"`);
console.log(`✅ 打包完成: ${newAsar}`);

// Step 8: 部署
step(8, '部署到 Codex.app');
run(`killall "Codex" 2>/dev/null || true`);
execSync('sleep 1');
fs.copyFileSync(newAsar, ASAR_PATH);
console.log(`✅ 已部署到: ${ASAR_PATH}`);

// Step 9: 重新签名
step(9, '移除签名并重新签名');
run(`codesign --remove-signature "${CODEX_APP}"`);
run(`codesign --sign - --force --deep "${CODEX_APP}"`);
console.log('✅ 重新签名完成');

// Step 10: 重启
step(10, '启动 Codex');
run(`open "${CODEX_APP}"`);
console.log('✅ Codex 已启动，请检查是否全部中文');
console.log(`\n🎉 汉化完成！`);
console.log(`如有问题，恢复备份: cp "${BACKUP_PATH}" "${ASAR_PATH}"`);
