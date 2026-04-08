@echo off
echo 🚀 开始清理缓存...
echo.

echo 1. 停止相关进程...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

echo 2. 清理Next.js缓存...
if exist ".next" rmdir /s /q ".next"
if exist ".turbo" rmdir /s /q ".turbo"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

echo 3. 清理npm缓存...
call npm cache clean --force

echo 4. 清理DNS缓存...
ipconfig /flushdns

echo.
echo ✅ 缓存清理完成！
echo.
echo 下一步操作：
echo 1. 重启浏览器（使用Ctrl+Shift+R强制刷新）
echo 2. 重新安装依赖: npm install
echo 3. 启动开发服务器: npm run dev
echo.
echo 对于AMap密钥问题：
echo 1. 在高德控制台检查Web端Key是否已启用
echo 2. 暂时禁用白名单限制（仅用于开发）
echo 3. 或修改hosts文件添加测试域名
echo.
pause