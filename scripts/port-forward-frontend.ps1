# V-Factory Frontend 포트 포워딩 스크립트
# 스마트폰에서 접근할 수 있도록 포트 포워딩을 설정합니다.

# 에러 발생 시 스크립트 중단
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "V-Factory Frontend 포트 포워딩" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# PC의 로컬 IP 주소 확인
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" 
} | Select-Object IPAddress, InterfaceAlias

$wifiIP = ($ipAddresses | Where-Object { 
    $_.InterfaceAlias -like "*Wi-Fi*" -or 
    $_.InterfaceAlias -like "*Ethernet*" 
} | Select-Object -First 1).IPAddress

if (-not $wifiIP) {
    Write-Host "⚠️  Wi-Fi IP 주소를 찾을 수 없습니다." -ForegroundColor Yellow
    $wifiIP = ($ipAddresses | Where-Object { 
        $_.InterfaceAlias -notlike "*Loopback*" -and 
        $_.InterfaceAlias -notlike "*Virtual*" -and
        $_.InterfaceAlias -notlike "*WSL*"
    } | Select-Object -First 1).IPAddress
}

if ($wifiIP) {
    Write-Host "✅ PC IP 주소: $wifiIP" -ForegroundColor Green
    Write-Host ""
    Write-Host "스마트폰에서 접근할 URL:" -ForegroundColor Cyan
    Write-Host "  http://$wifiIP`:32189" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⚠️  IP 주소를 찾을 수 없습니다." -ForegroundColor Yellow
}

# 포트 포워딩 시작
Write-Host "포트 포워딩을 시작합니다..." -ForegroundColor Yellow
Write-Host "중지하려면 Ctrl+C를 누르세요." -ForegroundColor Gray
Write-Host ""

# kubectl port-forward 실행
kubectl port-forward -n v-factory svc/frontend-service 32189:80
