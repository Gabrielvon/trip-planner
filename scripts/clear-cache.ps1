# 清理缓存脚本 - 适用于Windows PowerShell
# 运行: powershell -ExecutionPolicy Bypass -File clear-cache.ps1

Write-Host "🚀 开始清理缓存..." -ForegroundColor Cyan

# 1. 停止所有相关进程
Write-Host "1. 停止相关进程..." -ForegroundColor Yellow
$processes = @("node", "npm", "next", "python")
foreach ($proc in $processes) {
    $running = Get-Process $proc -ErrorAction SilentlyContinue
    if ($running) {
        Write-Host "   停止 $proc 进程..." -ForegroundColor Gray
        Stop-Process -Name $proc -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

# 2. 清理Next.js构建缓存
Write-Host "2. 清理Next.js缓存..." -ForegroundColor Yellow
$nextCachePaths = @(
    ".next",
    ".turbo",
    "node_modules/.cache"
)

foreach ($path in $nextCachePaths) {
    if (Test-Path $path) {
        Write-Host "   删除 $path..." -ForegroundColor Gray
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 3. 清理npm缓存
Write-Host "3. 清理npm缓存..." -ForegroundColor Yellow
try {
    npm cache clean --force
    Write-Host "   npm缓存已清理" -ForegroundColor Green
} catch {
    Write-Host "   npm缓存清理失败: $_" -ForegroundColor Red
}

# 4. 清理浏览器缓存目录（Chrome/Edge）
Write-Host "4. 清理浏览器缓存..." -ForegroundColor Yellow
$browserCachePaths = @(
    "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache",
    "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache",
    "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Cache"
)

foreach ($path in $browserCachePaths) {
    if (Test-Path $path) {
        Write-Host "   清理 $path..." -ForegroundColor Gray
        try {
            Remove-Item -Path "$path\*" -Recurse -Force -ErrorAction SilentlyContinue
        } catch {
            # 忽略权限错误
        }
    }
}

# 5. 清理DNS缓存
Write-Host "5. 清理DNS缓存..." -ForegroundColor Yellow
try {
    ipconfig /flushdns
    Write-Host "   DNS缓存已清理" -ForegroundColor Green
} catch {
    Write-Host "   DNS缓存清理失败" -ForegroundColor Red
}

# 6. 清理临时文件
Write-Host "6. 清理临时文件..." -ForegroundColor Yellow
try {
    Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   临时文件已清理" -ForegroundColor Green
} catch {
    Write-Host "   临时文件清理失败（可能需要管理员权限）" -ForegroundColor Red
}

Write-Host "✅ 缓存清理完成！" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Cyan
Write-Host "1. 重启浏览器（使用Ctrl+Shift+R强制刷新）" -ForegroundColor White
Write-Host "2. 重新安装依赖: npm install" -ForegroundColor White
Write-Host "3. 启动开发服务器: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "对于AMap密钥问题，建议：" -ForegroundColor Cyan
Write-Host "1. 在高德控制台检查Web端Key是否已启用" -ForegroundColor White
Write-Host "2. 暂时禁用白名单限制（仅用于开发）" -ForegroundColor White
Write-Host "3. 或配置测试域名到127.0.0.1" -ForegroundColor White