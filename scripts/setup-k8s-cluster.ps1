# V-Factory Kubernetes 클러스터 설정 스크립트
# Docker Desktop Kubernetes 활성화 안내 및 배포

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "V-Factory Kubernetes 클러스터 설정" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# kubectl 설치 확인
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ kubectl이 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "   kubectl을 설치하세요: https://kubernetes.io/docs/tasks/tools/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ kubectl 설치 확인됨" -ForegroundColor Green
Write-Host ""

# 클러스터 연결 확인
Write-Host "Kubernetes 클러스터 연결 확인 중..." -ForegroundColor Yellow
$maxRetries = 30
$retryCount = 0
$clusterReady = $false

while ($retryCount -lt $maxRetries -and -not $clusterReady) {
    try {
        $null = kubectl cluster-info 2>&1
        if ($LASTEXITCODE -eq 0) {
            $clusterReady = $true
            Write-Host "✅ Kubernetes 클러스터 연결 성공!" -ForegroundColor Green
            break
        }
    } catch {
        # 계속 시도
    }
    
    if (-not $clusterReady) {
        $retryCount++
        if ($retryCount -eq 1) {
            Write-Host ""
            Write-Host "⚠️  Kubernetes 클러스터에 연결할 수 없습니다." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Docker Desktop에서 Kubernetes를 활성화하세요:" -ForegroundColor Cyan
            Write-Host "  1. Docker Desktop 열기" -ForegroundColor White
            Write-Host "  2. Settings (톱니바퀴 아이콘) 클릭" -ForegroundColor White
            Write-Host "  3. Kubernetes 메뉴 선택" -ForegroundColor White
            Write-Host "  4. 'Enable Kubernetes' 체크박스 선택" -ForegroundColor White
            Write-Host "  5. 'Apply & Restart' 버튼 클릭" -ForegroundColor White
            Write-Host ""
            Write-Host "Kubernetes가 시작될 때까지 대기 중... (최대 5분)" -ForegroundColor Yellow
            Write-Host ""
        }
        
        Write-Host "  재시도 $retryCount/$maxRetries..." -ForegroundColor Gray
        Start-Sleep -Seconds 10
    }
}

if (-not $clusterReady) {
    Write-Host ""
    Write-Host "❌ Kubernetes 클러스터를 준비할 수 없습니다." -ForegroundColor Red
    Write-Host "   Docker Desktop에서 Kubernetes를 활성화한 후 다시 시도하세요." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "클러스터 정보:" -ForegroundColor Cyan
kubectl cluster-info
Write-Host ""

# 배포 스크립트 실행
Write-Host "Kubernetes 배포를 시작합니다..." -ForegroundColor Cyan
Write-Host ""
& "$PSScriptRoot\..\scripts\deploy-k8s.ps1"
