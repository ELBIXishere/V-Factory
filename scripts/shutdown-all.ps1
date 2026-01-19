# V-Factory 전체 서비스 중단 스크립트
# 모든 프론트엔드, 서버, 배포를 중단하고 휴식모드로 전환합니다.

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "V-Factory 전체 서비스 중단" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 프로젝트 루트 디렉토리로 이동
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# 1. Kubernetes 배포 중단
Write-Host "[1/3] Kubernetes 배포 중단 중..." -ForegroundColor Yellow

if (Get-Command kubectl -ErrorAction SilentlyContinue) {
    try {
        # 테스트 모드 확인
        $testModeFile = Join-Path $projectRoot ".test-mode.json"
        $namespace = "v-factory"
        
        if (Test-Path $testModeFile) {
            $testMode = Get-Content $testModeFile | ConvertFrom-Json
            if ($testMode.deployment -eq $true) {
                $namespace = "v-factory-test"
            }
        }
        
        # 클러스터 연결 확인
        kubectl cluster-info | Out-Null 2>&1
        if ($LASTEXITCODE -eq 0) {
            # 모든 Deployment 스케일 다운
            Write-Host "  모든 Deployment 스케일 다운 중..." -ForegroundColor Gray
            kubectl scale deployment --all --replicas=0 -n $namespace 2>&1 | Out-Null
            
            # 모든 Pod 확인
            $pods = kubectl get pods -n $namespace -o json 2>&1 | ConvertFrom-Json
            if ($pods.items.Count -gt 0) {
                Write-Host "  실행 중인 Pod 종료 중..." -ForegroundColor Gray
                kubectl delete pods --all -n $namespace --grace-period=30 2>&1 | Out-Null
            }
            
            Write-Host "  ✅ Kubernetes 배포 중단 완료 (네임스페이스: $namespace)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Kubernetes 클러스터에 연결할 수 없습니다. 건너뜁니다." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Kubernetes 중단 중 오류 발생: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  kubectl이 설치되어 있지 않습니다. 건너뜁니다." -ForegroundColor Yellow
}

Write-Host ""

# 2. Docker Compose 서비스 중단
Write-Host "[2/3] Docker Compose 서비스 중단 중..." -ForegroundColor Yellow

if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        # docker-compose.yml 확인
        if (Test-Path "docker-compose.yml") {
            Write-Host "  개발 환경 서비스 중단 중..." -ForegroundColor Gray
            docker compose down 2>&1 | Out-Null
            Write-Host "  ✅ 개발 환경 서비스 중단 완료" -ForegroundColor Green
        }
        
        # docker-compose.prod.yml 확인
        if (Test-Path "docker-compose.prod.yml") {
            Write-Host "  프로덕션 환경 서비스 중단 중..." -ForegroundColor Gray
            docker compose -f docker-compose.prod.yml down 2>&1 | Out-Null
            Write-Host "  ✅ 프로덕션 환경 서비스 중단 완료" -ForegroundColor Green
        }
        
        # 실행 중인 V-Factory 관련 컨테이너 확인 및 중단
        $containers = docker ps --filter "name=vfactory" --format "{{.Names}}" 2>&1
        if ($containers) {
            Write-Host "  남아있는 V-Factory 컨테이너 중단 중..." -ForegroundColor Gray
            docker stop $containers 2>&1 | Out-Null
            Write-Host "  ✅ 남아있는 컨테이너 중단 완료" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠️  Docker 서비스 중단 중 오류 발생: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Docker가 설치되어 있지 않습니다. 건너뜁니다." -ForegroundColor Yellow
}

Write-Host ""

# 3. 상태 확인 및 요약
Write-Host "[3/3] 최종 상태 확인..." -ForegroundColor Yellow

$allStopped = $true

# Kubernetes Pod 확인
if (Get-Command kubectl -ErrorAction SilentlyContinue) {
    try {
        kubectl cluster-info | Out-Null 2>&1
        if ($LASTEXITCODE -eq 0) {
            $testModeFile = Join-Path $projectRoot ".test-mode.json"
            $namespace = "v-factory"
            
            if (Test-Path $testModeFile) {
                $testMode = Get-Content $testModeFile | ConvertFrom-Json
                if ($testMode.deployment -eq $true) {
                    $namespace = "v-factory-test"
                }
            }
            
            $runningPods = kubectl get pods -n $namespace --field-selector=status.phase=Running -o json 2>&1 | ConvertFrom-Json
            if ($runningPods.items.Count -gt 0) {
                Write-Host "  ⚠️  실행 중인 Kubernetes Pod가 있습니다: $($runningPods.items.Count)개" -ForegroundColor Yellow
                $allStopped = $false
            } else {
                Write-Host "  ✅ Kubernetes Pod 모두 중단됨" -ForegroundColor Green
            }
        }
    } catch {
        # 무시
    }
}

# Docker 컨테이너 확인
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $runningContainers = docker ps --filter "name=vfactory" --format "{{.Names}}" 2>&1
    if ($runningContainers) {
        Write-Host "  ⚠️  실행 중인 Docker 컨테이너가 있습니다" -ForegroundColor Yellow
        $allStopped = $false
    } else {
        Write-Host "  ✅ Docker 컨테이너 모두 중단됨" -ForegroundColor Green
    }
}

Write-Host ""

# 최종 결과
Write-Host "========================================" -ForegroundColor Cyan
if ($allStopped) {
    Write-Host "✅ 모든 서비스 중단 완료!" -ForegroundColor Green
    Write-Host "   휴식모드로 전환되었습니다." -ForegroundColor Green
} else {
    Write-Host "⚠️  일부 서비스가 아직 실행 중일 수 있습니다." -ForegroundColor Yellow
    Write-Host "   위의 경고를 확인하세요." -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "서비스를 다시 시작하려면:" -ForegroundColor Cyan
Write-Host "  - Docker: docker compose up -d" -ForegroundColor Gray
Write-Host "  - Kubernetes: .\scripts\deploy-k8s.ps1" -ForegroundColor Gray
Write-Host ""
