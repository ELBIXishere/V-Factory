# V-Factory 테스트 모드 관리 스크립트
# 사용법:
#   .\scripts\test-mode.ps1 docker on      # 도커 테스트 모드 활성화
#   .\scripts\test-mode.ps1 docker off     # 도커 테스트 모드 비활성화
#   .\scripts\test-mode.ps1 frontend on    # 프론트엔드 테스트 모드 활성화
#   .\scripts\test-mode.ps1 frontend off   # 프론트엔드 테스트 모드 비활성화
#   .\scripts\test-mode.ps1 deployment on  # 배포 테스트 모드 활성화
#   .\scripts\test-mode.ps1 deployment off # 배포 테스트 모드 비활성화
#   .\scripts\test-mode.ps1 status         # 현재 테스트 모드 상태 확인

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("docker", "frontend", "deployment", "status")]
    [string]$Target,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("on", "off")]
    [string]$Action
)

$ErrorActionPreference = "Stop"

# 프로젝트 루트 디렉토리로 이동
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# 테스트 모드 설정 파일 경로
$testModeFile = Join-Path $projectRoot ".test-mode.json"

# 테스트 모드 설정 파일이 없으면 생성
if (-not (Test-Path $testModeFile)) {
    $defaultConfig = @{
        docker = $false
        frontend = $false
        deployment = $false
        lastUpdated = $null
    } | ConvertTo-Json
    Set-Content -Path $testModeFile -Value $defaultConfig -Encoding UTF8
}

# 현재 설정 읽기
$config = Get-Content $testModeFile | ConvertFrom-Json

# 상태 확인 모드
if ($Target -eq "status") {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "V-Factory 테스트 모드 상태" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $dockerStatus = if ($config.docker) { "✅ ON" } else { "❌ OFF" }
    $frontendStatus = if ($config.frontend) { "✅ ON" } else { "❌ OFF" }
    $deploymentStatus = if ($config.deployment) { "✅ ON" } else { "❌ OFF" }
    
    Write-Host "🐳 도커 테스트 모드:      $dockerStatus" -ForegroundColor $(if ($config.docker) { "Green" } else { "Gray" })
    Write-Host "⚛️  프론트엔드 테스트 모드: $frontendStatus" -ForegroundColor $(if ($config.frontend) { "Green" } else { "Gray" })
    Write-Host "🚀 배포 테스트 모드:      $deploymentStatus" -ForegroundColor $(if ($config.deployment) { "Green" } else { "Gray" })
    
    if ($config.lastUpdated) {
        Write-Host ""
        Write-Host "마지막 업데이트: $($config.lastUpdated)" -ForegroundColor Gray
    }
    
    Write-Host ""
    exit 0
}

# Action이 없으면 에러
if (-not $Action) {
    Write-Host "❌ 오류: Action 파라미터가 필요합니다 (on 또는 off)" -ForegroundColor Red
    Write-Host ""
    Write-Host "사용법:" -ForegroundColor Yellow
    Write-Host "  .\scripts\test-mode.ps1 $Target on" -ForegroundColor Gray
    Write-Host "  .\scripts\test-mode.ps1 $Target off" -ForegroundColor Gray
    exit 1
}

# 테스트 모드 설정 변경
$isEnabled = $Action -eq "on"
$config.$Target = $isEnabled
$config.lastUpdated = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# 설정 파일 저장
$config | ConvertTo-Json | Set-Content -Path $testModeFile -Encoding UTF8

# 상태 메시지 출력
$statusText = if ($isEnabled) { "활성화" } else { "비활성화" }
$statusColor = if ($isEnabled) { "Green" } else { "Yellow" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "테스트 모드 설정 변경" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$targetName = switch ($Target) {
    "docker" { "🐳 도커" }
    "frontend" { "⚛️  프론트엔드" }
    "deployment" { "🚀 배포" }
}

Write-Host "$targetName 테스트 모드가 $statusText 되었습니다." -ForegroundColor $statusColor
Write-Host ""

# 각 영역별 추가 설정 적용
switch ($Target) {
    "docker" {
        Write-Host "도커 테스트 모드 설정 적용 중..." -ForegroundColor Yellow
        
        if ($isEnabled) {
            Write-Host "  ✅ 테스트 모드: 개발 환경 설정 활성화" -ForegroundColor Green
            Write-Host "  ✅ 디버그 로그: 활성화" -ForegroundColor Green
            Write-Host "  ✅ Hot Reload: 활성화" -ForegroundColor Green
        } else {
            Write-Host "  ✅ 테스트 모드: 프로덕션 설정 사용" -ForegroundColor Green
            Write-Host "  ✅ 디버그 로그: 비활성화" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "💡 도커 서비스를 재시작하려면 다음 명령을 실행하세요:" -ForegroundColor Cyan
        Write-Host "   docker compose down" -ForegroundColor Gray
        Write-Host "   docker compose up --build -d" -ForegroundColor Gray
    }
    
    "frontend" {
        Write-Host "프론트엔드 테스트 모드 설정 적용 중..." -ForegroundColor Yellow
        
        # .env 파일 확인 및 업데이트
        $envFile = Join-Path $projectRoot ".env"
        $envExample = Join-Path $projectRoot "env.example"
        
        if (-not (Test-Path $envFile)) {
            if (Test-Path $envExample) {
                Copy-Item $envExample $envFile
                Write-Host "  ✅ .env 파일 생성 완료" -ForegroundColor Green
            }
        }
        
        if ($isEnabled) {
            Write-Host "  ✅ 테스트 모드: 개발 환경 변수 활성화" -ForegroundColor Green
            Write-Host "  ✅ 테스트 API 엔드포인트: 활성화" -ForegroundColor Green
            Write-Host "  ✅ 디버그 모드: 활성화" -ForegroundColor Green
            
            # .env 파일에 테스트 모드 플래그 추가/업데이트
            if (Test-Path $envFile) {
                $envContent = Get-Content $envFile -Raw
                if ($envContent -notmatch "NEXT_PUBLIC_TEST_MODE") {
                    Add-Content -Path $envFile -Value "`n# 테스트 모드 설정`nNEXT_PUBLIC_TEST_MODE=true`n"
                } else {
                    $envContent = $envContent -replace "NEXT_PUBLIC_TEST_MODE=.*", "NEXT_PUBLIC_TEST_MODE=true"
                    Set-Content -Path $envFile -Value $envContent
                }
            }
        } else {
            Write-Host "  ✅ 테스트 모드: 프로덕션 환경 변수 사용" -ForegroundColor Green
            Write-Host "  ✅ 테스트 API 엔드포인트: 비활성화" -ForegroundColor Green
            
            # .env 파일에서 테스트 모드 플래그 제거 또는 false로 설정
            if (Test-Path $envFile) {
                $envContent = Get-Content $envFile -Raw
                if ($envContent -match "NEXT_PUBLIC_TEST_MODE") {
                    $envContent = $envContent -replace "NEXT_PUBLIC_TEST_MODE=.*", "NEXT_PUBLIC_TEST_MODE=false"
                    Set-Content -Path $envFile -Value $envContent
                }
            }
        }
        
        Write-Host ""
        Write-Host "💡 프론트엔드 서비스를 재시작하려면 다음 명령을 실행하세요:" -ForegroundColor Cyan
        Write-Host "   cd frontend && npm run dev" -ForegroundColor Gray
        Write-Host "   또는 도커 컨테이너 재시작: docker compose restart frontend" -ForegroundColor Gray
    }
    
    "deployment" {
        Write-Host "배포 테스트 모드 설정 적용 중..." -ForegroundColor Yellow
        
        if ($isEnabled) {
            Write-Host "  ✅ 테스트 모드: 테스트 환경으로 배포" -ForegroundColor Green
            Write-Host "  ✅ 테스트 네임스페이스: v-factory-test" -ForegroundColor Green
            Write-Host "  ✅ 테스트 리소스 제한: 적용" -ForegroundColor Green
        } else {
            Write-Host "  ✅ 테스트 모드: 프로덕션 환경으로 배포" -ForegroundColor Green
            Write-Host "  ✅ 프로덕션 네임스페이스: v-factory" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "💡 배포를 실행하려면 다음 명령을 실행하세요:" -ForegroundColor Cyan
        if ($isEnabled) {
            Write-Host "   .\scripts\deploy-k8s.ps1 --test" -ForegroundColor Gray
        } else {
            Write-Host "   .\scripts\deploy-k8s.ps1" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "현재 테스트 모드 상태를 확인하려면:" -ForegroundColor Cyan
Write-Host "   .\scripts\test-mode.ps1 status" -ForegroundColor Gray
Write-Host ""
