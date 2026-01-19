# V-Factory 도메인 접속 문제 해결 스크립트
# Windows hosts 파일에 도메인을 추가합니다.

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "V-Factory 도메인 접속 설정" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 관리자 권한 확인
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  이 스크립트는 관리자 권한이 필요합니다." -ForegroundColor Yellow
    Write-Host "   PowerShell을 관리자 권한으로 실행한 후 다시 시도하세요." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   또는 수동으로 다음을 수행하세요:" -ForegroundColor Yellow
    Write-Host "   1. C:\Windows\System32\drivers\etc\hosts 파일을 메모장으로 엽니다 (관리자 권한)" -ForegroundColor Gray
    Write-Host "   2. 다음 줄을 추가합니다:" -ForegroundColor Gray
    Write-Host "      127.0.0.1 v-factory-elbix.com" -ForegroundColor Green
    Write-Host "      127.0.0.1 api.v-factory-elbix.com" -ForegroundColor Green
    exit 1
}

# hosts 파일 경로
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"

# 백업 생성
$backupPath = "$hostsPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
Copy-Item $hostsPath $backupPath -Force
Write-Host "✅ hosts 파일 백업 생성: $backupPath" -ForegroundColor Green

# hosts 파일 읽기
$hostsContent = Get-Content $hostsPath -Raw

# 추가할 도메인
$domains = @(
    "127.0.0.1 v-factory-elbix.com",
    "127.0.0.1 api.v-factory-elbix.com"
)

$added = $false
foreach ($domain in $domains) {
    $domainName = ($domain -split '\s+')[1]
    if ($hostsContent -notmatch [regex]::Escape($domainName)) {
        Add-Content -Path $hostsPath -Value $domain -Encoding ASCII
        Write-Host "✅ 추가됨: $domain" -ForegroundColor Green
        $added = $true
    } else {
        Write-Host "ℹ️  이미 존재: $domain" -ForegroundColor Gray
    }
}

if ($added) {
    Write-Host ""
    Write-Host "✅ 도메인 설정이 완료되었습니다!" -ForegroundColor Green
    Write-Host ""
    Write-Host "이제 다음 URL로 접속할 수 있습니다:" -ForegroundColor Cyan
    Write-Host "  - http://v-factory-elbix.com/" -ForegroundColor White
    Write-Host "  - http://api.v-factory-elbix.com/api/factory-core" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  브라우저 캐시를 지우거나 시크릿 모드로 접속하세요." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "ℹ️  모든 도메인이 이미 설정되어 있습니다." -ForegroundColor Gray
}

Write-Host ""
