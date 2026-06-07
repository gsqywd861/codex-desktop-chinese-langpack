@echo off
chcp 65001 >nul
echo ================================
echo  Codex Desktop 中文语言包安装器
echo  (Windows 版本)
echo ================================
echo.

REM 检查是否以管理员身份运行
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ❌ 请以管理员身份运行此脚本！
    echo.
    echo 右键点击 install.bat → "以管理员身份运行"
    echo.
    pause
    exit /b 1
)

REM 检查 node 是否安装
where node >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ❌ 未检测到 Node.js，请先安装：https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
echo.

REM 查找 Codex 安装路径
set "CODEX_PATH=%LOCALAPPDATA%\Programs\Codex"
if not exist "%CODEX_PATH%" (
    echo ⚠️  默认路径不存在: %CODEX_PATH%
    echo 请手动指定路径，例如：
    echo   node install.js "D:\Path\To\Codex"
    echo.
    set /p CODEX_PATH="请输入 Codex 安装路径: "
)

echo 📂 Codex 路径: %CODEX_PATH%
echo.

REM 执行安装脚本
node "%~dp0install.js" "%CODEX_PATH%"

echo.
echo 安装完成！请重启 Codex Desktop。
pause
