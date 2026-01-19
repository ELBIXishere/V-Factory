# V-Factory 배포 상태 확인 스크립트
# 사용법: .\scripts\check-deployment.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "V-Factory 배포 상태 진단" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# kubectl 설치 확인
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ kubectl이 설치되어 있지 않습니다." -ForegroundColor Red
    exit 1
}

# 클러스터 연결 확인
try {
    kubectl cluster-info | Out-Null
    Write-Host "✅ Kubernetes 클러스터 연결 확인" -ForegroundColor Green
} catch {
    Write-Host "❌ Kubernetes 클러스터에 연결할 수 없습니다." -ForegroundColor Red
    exit 1
}

Write-Host ""

# 테스트 모드 확인
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$testModeFile = Join-Path $projectRoot ".test-mode.json"
$namespace = "v-factory"

if (Test-Path $testModeFile) {
    $testMode = Get-Content $testModeFile | ConvertFrom-Json
    if ($testMode.deployment -eq $true) {
        $namespace = "v-factory-test"
        Write-Host "⚠️  테스트 모드 활성화됨 - 네임스페이스: $namespace" -ForegroundColor Yellow
    }
}

Write-Host "네임스페이스: $namespace" -ForegroundColor Cyan
Write-Host ""

# 1. 네임스페이스 확인
Write-Host "[1/6] 네임스페이스 확인..." -ForegroundColor Yellow
try {
    $ns = kubectl get namespace $namespace -o json 2>$null | ConvertFrom-Json
    Write-Host "  ✅ 네임스페이스 '$namespace' 존재" -ForegroundColor Green
} catch {
    Write-Host "  ❌ 네임스페이스 '$namespace'가 존재하지 않습니다." -ForegroundColor Red
    Write-Host "     배포를 먼저 실행하세요: .\scripts\deploy-k8s.ps1" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 2. Pod 상태 확인
Write-Host "[2/6] Pod 상태 확인..." -ForegroundColor Yellow
$pods = kubectl get pods -n $namespace -o json | ConvertFrom-Json
$podCount = $pods.items.Count
$runningPods = ($pods.items | Where-Object { $_.status.phase -eq "Running" }).Count
$pendingPods = ($pods.items | Where-Object { $_.status.phase -eq "Pending" }).Count
$failedPods = ($pods.items | Where-Object { $_.status.phase -eq "Failed" }).Count

Write-Host "  전체 Pod: $podCount" -ForegroundColor Gray
Write-Host "  실행 중: $runningPods" -ForegroundColor $(if ($runningPods -eq $podCount -and $podCount -gt 0) { "Green" } else { "Yellow" })
Write-Host "  대기 중: $pendingPods" -ForegroundColor $(if ($pendingPods -eq 0) { "Green" } else { "Yellow" })
Write-Host "  실패: $failedPods" -ForegroundColor $(if ($failedPods -eq 0) { "Green" } else { "Red" })

if ($failedPods -gt 0) {
    Write-Host ""
    Write-Host "  실패한 Pod 목록:" -ForegroundColor Red
    $failedPodList = $pods.items | Where-Object { $_.status.phase -eq "Failed" }
    foreach ($pod in $failedPodList) {
        Write-Host "    - $($pod.metadata.name)" -ForegroundColor Red
        $containerStatus = $pod.status.containerStatuses | Where-Object { $_.state.waiting -or $_.state.terminated }
        if ($containerStatus) {
            Write-Host "      이유: $($containerStatus.state.waiting.reason)$($containerStatus.state.terminated.reason)" -ForegroundColor Yellow
        }
    }
}

if ($pendingPods -gt 0) {
    Write-Host ""
    Write-Host "  대기 중인 Pod 목록:" -ForegroundColor Yellow
    $pendingPodList = $pods.items | Where-Object { $_.status.phase -eq "Pending" }
    foreach ($pod in $pendingPodList) {
        Write-Host "    - $($pod.metadata.name)" -ForegroundColor Yellow
    }
}
Write-Host ""

# 3. 서비스 확인
Write-Host "[3/6] 서비스 확인..." -ForegroundColor Yellow
$services = kubectl get svc -n $namespace -o json | ConvertFrom-Json
$frontendService = $services.items | Where-Object { $_.metadata.name -eq "frontend-service" }

if ($frontendService) {
    Write-Host "  ✅ frontend-service 존재" -ForegroundColor Green
    Write-Host "    타입: $($frontendService.spec.type)" -ForegroundColor Gray
    if ($frontendService.spec.type -eq "NodePort") {
        $nodePort = $frontendService.spec.ports | Where-Object { $_.name -eq "http" }
        Write-Host "    NodePort: $($nodePort.nodePort)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ❌ frontend-service가 존재하지 않습니다." -ForegroundColor Red
}
Write-Host ""

# 4. Ingress 확인
Write-Host "[4/6] Ingress 확인..." -ForegroundColor Yellow
try {
    $ingress = kubectl get ingress -n $namespace -o json 2>$null | ConvertFrom-Json
    if ($ingress.items) {
        $ingressResource = $ingress.items | Where-Object { $_.metadata.name -eq "v-factory-ingress" }
        if ($ingressResource) {
            Write-Host "  ✅ v-factory-ingress 존재" -ForegroundColor Green
            
            # Ingress Controller 확인
            $ingressClass = $ingressResource.spec.ingressClassName
            Write-Host "    Ingress Class: $ingressClass" -ForegroundColor Gray
            
            # 호스트 확인
            $hosts = $ingressResource.spec.rules | ForEach-Object { $_.host }
            Write-Host "    호스트:" -ForegroundColor Gray
            foreach ($host in $hosts) {
                Write-Host "      - $host" -ForegroundColor Gray
            }
            
            # 주소 확인
            if ($ingressResource.status.loadBalancer.ingress) {
                $addresses = $ingressResource.status.loadBalancer.ingress | ForEach-Object { $_.ip -or $_.hostname }
                Write-Host "    외부 주소:" -ForegroundColor Gray
                foreach ($addr in $addresses) {
                    Write-Host "      - $addr" -ForegroundColor Green
                }
            } else {
                Write-Host "    ⚠️  외부 주소가 할당되지 않았습니다." -ForegroundColor Yellow
                Write-Host "       Ingress Controller가 설치되어 있는지 확인하세요." -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ❌ v-factory-ingress가 존재하지 않습니다." -ForegroundColor Red
        }
    } else {
        Write-Host "  ❌ Ingress 리소스가 없습니다." -ForegroundColor Red
    }
} catch {
    Write-Host "  ⚠️  Ingress를 확인할 수 없습니다: $_" -ForegroundColor Yellow
}
Write-Host ""

# 5. Ingress Controller 확인
Write-Host "[5/6] Ingress Controller 확인..." -ForegroundColor Yellow
try {
    $ingressController = kubectl get pods -A -o json | ConvertFrom-Json
    $nginxPods = $ingressController.items | Where-Object { 
        $_.metadata.name -like "*ingress*" -or 
        $_.metadata.name -like "*nginx*" -or
        $_.metadata.labels.'app.kubernetes.io/name' -eq "ingress-nginx"
    }
    
    if ($nginxPods) {
        $runningNginx = ($nginxPods | Where-Object { $_.status.phase -eq "Running" }).Count
        Write-Host "  ✅ Ingress Controller Pod 발견: $runningNginx 개 실행 중" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Ingress Controller가 설치되어 있지 않을 수 있습니다." -ForegroundColor Yellow
        Write-Host "     Nginx Ingress Controller 설치 방법:" -ForegroundColor Yellow
        Write-Host "     kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  Ingress Controller를 확인할 수 없습니다." -ForegroundColor Yellow
}
Write-Host ""

# 6. 프론트엔드 Pod 로그 확인 (최근 오류)
Write-Host "[6/6] 프론트엔드 Pod 최근 로그 확인..." -ForegroundColor Yellow
$frontendPods = $pods.items | Where-Object { $_.metadata.labels.app -eq "frontend" }
if ($frontendPods) {
    $frontendPod = $frontendPods | Select-Object -First 1
    Write-Host "  Pod: $($frontendPod.metadata.name)" -ForegroundColor Gray
    try {
        $logs = kubectl logs $frontendPod.metadata.name -n $namespace --tail=10 2>&1
        if ($logs) {
            Write-Host "  최근 로그 (마지막 10줄):" -ForegroundColor Gray
            $logs | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        }
    } catch {
        Write-Host "  ⚠️  로그를 가져올 수 없습니다." -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  프론트엔드 Pod를 찾을 수 없습니다." -ForegroundColor Yellow
}
Write-Host ""

# 종합 진단 결과
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "진단 결과 요약" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allHealthy = $true

if ($runningPods -ne $podCount -or $podCount -eq 0) {
    Write-Host "❌ 일부 Pod가 실행되지 않았습니다." -ForegroundColor Red
    $allHealthy = $false
}

if (-not $frontendService) {
    Write-Host "❌ frontend-service가 없습니다." -ForegroundColor Red
    $allHealthy = $false
}

if ($allHealthy) {
    Write-Host "✅ 기본 리소스는 정상입니다." -ForegroundColor Green
    Write-Host ""
    Write-Host "도메인 접속 문제 해결 방법:" -ForegroundColor Yellow
    Write-Host "1. DNS 설정 확인: v-factory-elbix.com이 Ingress Controller의 외부 IP로 설정되어 있는지 확인" -ForegroundColor Gray
    Write-Host "2. Ingress Controller 확인: kubectl get svc -n ingress-nginx" -ForegroundColor Gray
    Write-Host "3. 로컬 테스트: hosts 파일에 도메인을 추가하여 테스트" -ForegroundColor Gray
    Write-Host "   예: Ingress-IP v-factory-elbix.com" -ForegroundColor Gray
    Write-Host "4. NodePort로 직접 접속 테스트: http://Node-IP:32189" -ForegroundColor Gray
} else {
    Write-Host "⚠️  일부 리소스에 문제가 있습니다. 위의 오류를 확인하세요." -ForegroundColor Yellow
}

Write-Host ""
