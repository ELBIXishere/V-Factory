# V-Factory Docker 이미지 빌드 스크립트 (PowerShell)
# 프로덕션용 Docker 이미지를 올바른 환경 변수로 빌드합니다.

param(
    [Parameter(Mandatory=$false)]
    [string]$Tag = "latest",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "http://api.v-factory-elbix.com/api/factory-core",
    
    [Parameter(Mandatory=$false)]
    [string]$IncidentApiUrl = "http://api.v-factory-elbix.com/api/incident-event",
    
    [Parameter(Mandatory=$false)]
    [string]$AssetApiUrl = "http://api.v-factory-elbix.com/api/asset-management"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "V-Factory Docker 이미지 빌드" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "태그: $Tag" -ForegroundColor Yellow
Write-Host "API URL: $ApiUrl" -ForegroundColor Gray
Write-Host "Incident API URL: $IncidentApiUrl" -ForegroundColor Gray
Write-Host "Asset API URL: $AssetApiUrl" -ForegroundColor Gray
Write-Host ""

# 프로젝트 루트 디렉토리로 이동
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# Frontend 이미지 빌드
Write-Host "[1/4] Frontend 이미지 빌드 중..." -ForegroundColor Yellow
docker build `
  -f docker/prod/frontend.Dockerfile `
  --build-arg NEXT_PUBLIC_API_URL=$ApiUrl `
  --build-arg NEXT_PUBLIC_INCIDENT_API_URL=$IncidentApiUrl `
  --build-arg NEXT_PUBLIC_ASSET_API_URL=$AssetApiUrl `
  -t v-factory-frontend:$Tag `
  .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend 이미지 빌드 실패" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend 이미지 빌드 완료" -ForegroundColor Green
Write-Host ""

# Factory Core 이미지 빌드
Write-Host "[2/4] Factory Core 이미지 빌드 중..." -ForegroundColor Yellow
docker build `
  -f docker/prod/backend.Dockerfile `
  --build-arg SERVICE_NAME=factory-core `
  -t v-factory-factory-core:$Tag `
  .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Factory Core 이미지 빌드 실패" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Factory Core 이미지 빌드 완료" -ForegroundColor Green
Write-Host ""

# Incident Event 이미지 빌드
Write-Host "[3/4] Incident Event 이미지 빌드 중..." -ForegroundColor Yellow
docker build `
  -f docker/prod/backend.Dockerfile `
  --build-arg SERVICE_NAME=incident-event `
  -t v-factory-incident-event:$Tag `
  .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Incident Event 이미지 빌드 실패" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Incident Event 이미지 빌드 완료" -ForegroundColor Green
Write-Host ""

# Asset Management 이미지 빌드
Write-Host "[4/4] Asset Management 이미지 빌드 중..." -ForegroundColor Yellow
docker build `
  -f docker/prod/backend.Dockerfile `
  --build-arg SERVICE_NAME=asset-management `
  -t v-factory-asset-management:$Tag `
  .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Asset Management 이미지 빌드 실패" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Asset Management 이미지 빌드 완료" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ 모든 이미지 빌드 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "빌드된 이미지:" -ForegroundColor Cyan
docker images | Select-String "v-factory"
Write-Host ""
Write-Host "💡 Kubernetes에 배포하려면:" -ForegroundColor Yellow
Write-Host "   kubectl set image deployment/frontend frontend=v-factory-frontend:$Tag -n v-factory" -ForegroundColor Gray
Write-Host "   또는 전체 재배포: .\scripts\deploy-k8s.ps1" -ForegroundColor Gray
Write-Host ""
