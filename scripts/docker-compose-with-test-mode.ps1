# V-Factory Docker Compose 실행 스크립트 (테스트 모드 지원)
# 사용법: .\scripts\docker-compose-with-test-mode.ps1 [up|down|restart|logs]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("up", "down", "restart", "logs", "ps")]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [switch]$Build,
    
    [Parameter(Mandatory=$false)]
    [switch]$Detached
)

$ErrorActionPreference = "Stop"

# 프로젝트 루트 디렉토리로 이동
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# 테스트 모드 설정 확인
$testModeFile = Join-Path $projectRoot ".test-mode.json"
$isTestMode = $false

if (Test-Path $testModeFile) {
    $testMode = Get-Content $testModeFile | ConvertFrom-Json
    $isTestMode = $testMode.docker -eq $true
}

# 테스트 모드 환경 변수 설정
if ($isTestMode) {
    $env:VFACTORY_TEST_MODE = "true"
    $env:DEBUG = "true"
    $env:LOG_LEVEL = "debug"
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "⚠️  도커 테스트 모드 활성화" -ForegroundColor Yellow
    Write-Host "   - 디버그 모드: 활성화" -ForegroundColor Yellow
    Write-Host "   - 상세 로그: 활성화" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
} else {
    $env:VFACTORY_TEST_MODE = "false"
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "도커 서비스 실행 (일반 모드)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

# Docker Compose 명령 실행
$composeFile = "docker-compose.yml"
$composeArgs = @("-f", $composeFile)

switch ($Action) {
    "up" {
        if ($Build) {
            $composeArgs += "up", "--build"
        } else {
            $composeArgs += "up"
        }
        
        if ($Detached) {
            $composeArgs += "-d"
        }
        
        docker compose $composeArgs
    }
    "down" {
        docker compose $composeArgs down
    }
    "restart" {
        docker compose $composeArgs restart
    }
    "logs" {
        docker compose $composeArgs logs -f
    }
    "ps" {
        docker compose $composeArgs ps
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker Compose 명령 실행 실패" -ForegroundColor Red
    exit 1
}
