@echo off
echo 🛠️ 设置开发域名映射
echo.
echo 此脚本将修改hosts文件，添加测试域名映射到127.0.0.1
echo 这样可以在高德地图控制台配置白名单
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 需要管理员权限运行此脚本！
    echo 请右键点击 -> "以管理员身份运行"
    pause
    exit /b 1
)

echo 当前hosts文件内容：
echo ========================================
type %windir%\System32\drivers\etc\hosts | findstr /v "^#" | findstr /v "^$"
echo ========================================
echo.

set /p choice=是否添加测试域名到hosts文件？(y/n): 
if /i "%choice%" neq "y" (
    echo 已取消
    pause
    exit /b 0
)

echo.
echo 添加以下域名到hosts文件：
echo 127.0.0.1 dev.trip-planner.local
echo 127.0.0.1 local.dev.trip-planner
echo ::1 dev.trip-planner.local
echo ::1 local.dev.trip-planner

:: 备份hosts文件
copy %windir%\System32\drivers\etc\hosts %windir%\System32\drivers\etc\hosts.backup.%date:~0,4%%date:~5,2%%date:~8,2% >nul

:: 添加新条目
(
echo.
echo # Trip Planner开发环境域名映射
echo 127.0.0.1 dev.trip-planner.local
echo 127.0.0.1 local.dev.trip-planner
echo ::1 dev.trip-planner.local
echo ::1 local.dev.trip-planner
) >> %windir%\System32\drivers\etc\hosts

echo.
echo ✅ hosts文件已更新！
echo.
echo 现在可以在高德地图控制台配置白名单：
echo 1. 登录 https://console.amap.com/
echo 2. 进入"应用管理" -> 你的应用
echo 3. 找到Web端Key -> 点击"设置"
echo 4. 在白名单中添加: dev.trip-planner.local
echo 5. 保存设置
echo.
echo 然后访问: http://dev.trip-planner.local:3000
echo.
pause