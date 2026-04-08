@echo off
echo 🔍 AMap密钥测试工具
echo.
echo 此脚本将测试AMap Web端Key是否有效
echo.

:: 读取环境变量
if exist ".env.local" (
    for /f "tokens=1,2 delims==" %%a in (.env.local) do (
        if "%%a"=="NEXT_PUBLIC_AMAP_JS_KEY" set AMAP_KEY=%%b
    )
)

if "%AMAP_KEY%"=="" (
    echo ❌ 未找到NEXT_PUBLIC_AMAP_JS_KEY环境变量
    echo 请检查.env.local文件
    pause
    exit /b 1
)

echo 当前AMap密钥: %AMAP_KEY%
echo.

echo 1. 创建测试HTML文件...

set HTML_FILE=test-amap-quick.html

echo ^<!DOCTYPE html^> > "%HTML_FILE%"
echo ^<html^> >> "%HTML_FILE%"
echo ^<head^> >> "%HTML_FILE%"
echo     ^<title^>AMap密钥测试^</title^> >> "%HTML_FILE%"
echo ^</head^> >> "%HTML_FILE%"
echo ^<body^> >> "%HTML_FILE%"
echo     ^<h1^>AMap密钥测试^</h1^> >> "%HTML_FILE%"
echo     ^<div id="status"^>正在测试...^</div^> >> "%HTML_FILE%"
echo     ^<div id="map" style="width:600px;height:400px;"^>^</div^> >> "%HTML_FILE%"
echo     ^<script^> >> "%HTML_FILE%"
echo         const key = "%AMAP_KEY%"; >> "%HTML_FILE%"
echo         const script = document.createElement('script'); >> "%HTML_FILE%"
echo         script.src = 'https://webapi.amap.com/maps?v=2.0^&key=' + key + '^&plugin=AMap.Scale'; >> "%HTML_FILE%"
echo         script.onload = function() { >> "%HTML_FILE%"
echo             if (window.AMap) { >> "%HTML_FILE%"
echo                 document.getElementById('status').innerHTML = '✅ AMap SDK加载成功！'; >> "%HTML_FILE%"
echo                 try { >> "%HTML_FILE%"
echo                     const map = new AMap.Map('map', { >> "%HTML_FILE%"
echo                         zoom: 11, >> "%HTML_FILE%"
echo                         center: [121.4737, 31.2304] >> "%HTML_FILE%"
echo                     }); >> "%HTML_FILE%"
echo                     document.getElementById('status').innerHTML += '✅ 地图创建成功！'; >> "%HTML_FILE%"
echo                 } catch (e) { >> "%HTML_FILE%"
echo                     document.getElementById('status').innerHTML += '❌ 地图创建失败：' + e.message; >> "%HTML_FILE%"
echo                 } >> "%HTML_FILE%"
echo             } else { >> "%HTML_FILE%"
echo                 document.getElementById('status').innerHTML = '❌ AMap SDK加载失败'; >> "%HTML_FILE%"
echo             } >> "%HTML_FILE%"
echo         }; >> "%HTML_FILE%"
echo         script.onerror = function() { >> "%HTML_FILE%"
echo             document.getElementById('status').innerHTML = '❌ AMap SDK加载失败，请检查密钥'; >> "%HTML_FILE%"
echo         }; >> "%HTML_FILE%"
echo         document.head.appendChild(script); >> "%HTML_FILE%"
echo     ^</script^> >> "%HTML_FILE%"
echo ^</body^> >> "%HTML_FILE%"
echo ^</html^> >> "%HTML_FILE%"

echo 2. 启动测试服务器...
start python -m http.server 8080
timeout /t 2 /nobreak >nul

echo 3. 打开测试页面...
start http://localhost:8080/test-amap-quick.html

echo.
echo ✅ 测试页面已打开！
echo 请检查浏览器控制台是否有错误信息
echo.
echo 常见问题：
echo 1. INVALID_USER_KEY - 密钥无效或未启用
echo 2. 白名单限制 - 需要配置域名白名单
echo 3. 缓存问题 - 运行clear-cache.bat
echo.
pause