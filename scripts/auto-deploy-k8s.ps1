# V-Factory Kubernetes 자동 배포 스크립트
# 클러스터가 준비될 때까지 대기하고 자동으로 배포

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "V-Factory Kubernetes 자동 배포" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# kubectl 확인
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ kubectl이 설치되어 있지 않습니다." -ForegroundColor Red
    exit 1
}

Write-Host "✅ kubectl 설치 확인됨" -ForegroundColor Green
Write-Host ""

# 클러스터 연결 확인 및 대기
Write-Host "Kubernetes 클러스터 연결 확인 중..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Docker Desktop에서 Kubernetes를 활성화해야 합니다:" -ForegroundColor Yellow
Write-Host "  1. Docker Desktop 열기" -ForegroundColor White
Write-Host "  2. Settings > Kubernetes" -ForegroundColor White
Write-Host "  3. 'Enable Kubernetes' 체크" -ForegroundColor White
Write-Host "  4. 'Apply & Restart' 클릭" -ForegroundColor White
Write-Host ""
Write-Host "클러스터가 준비될 때까지 대기 중... (최대 10분)" -ForegroundColor Cyan
Write-Host ""

$maxWait = 120  # 10분 (5초 간격)
$waited = 0
$clusterReady = $false

while ($waited -lt $maxWait) {
    try {
        $null = kubectl cluster-info 2>&1
        if ($LASTEXITCODE -eq 0) {
            $clusterReady = $true
            Write-Host "`n✅ 클러스터 연결 성공!" -ForegroundColor Green
            break
        }
    } catch {
        # 계속 대기
    }
    
    $waited++
    if ($waited % 12 -eq 0) {
        $minutes = [math]::Floor($waited / 12)
        Write-Host "  대기 중... ($minutes분 경과)" -ForegroundColor Gray
    } else {
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
    
    Start-Sleep -Seconds 5
}

if (-not $clusterReady) {
    Write-Host "`n`n⚠️  클러스터가 준비되지 않았습니다." -ForegroundColor Yellow
    Write-Host "Docker Desktop에서 Kubernetes를 활성화한 후 다음 명령을 실행하세요:" -ForegroundColor Cyan
    Write-Host "  .\scripts\deploy-k8s.ps1" -ForegroundColor Green
    exit 1
}

Write-Host ""
Write-Host "클러스터 정보:" -ForegroundColor Cyan
kubectl cluster-info
Write-Host ""

# 배포 스크립트 실행
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Kubernetes 배포 시작" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

& "$PSScriptRoot\deploy-k8s.ps1"
