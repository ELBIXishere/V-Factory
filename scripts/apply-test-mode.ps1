# V-Factory 테스트 모드 설정 적용 스크립트
# 이 스크립트는 .test-mode.json 설정을 읽어서 각 영역에 적용합니다.

$ErrorActionPreference = "Stop"

# 프로젝트 루트 디렉토리로 이동
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# 테스트 모드 설정 파일 경로
$testModeFile = Join-Path $projectRoot ".test-mode.json"

# 테스트 모드 설정이 없으면 기본값 사용
$testMode = @{
    docker = $false
    frontend = $false
    deployment = $false
}

if (Test-Path $testModeFile) {
    $testMode = Get-Content $testModeFile | ConvertFrom-Json
}

# 테스트 모드 상태를 환경 변수로 내보내기
$env:VFACTORY_TEST_MODE_DOCKER = if ($testMode.docker) { "true" } else { "false" }
$env:VFACTORY_TEST_MODE_FRONTEND = if ($testMode.frontend) { "true" } else { "false" }
$env:VFACTORY_TEST_MODE_DEPLOYMENT = if ($testMode.deployment) { "true" } else { "false" }

Write-Host "테스트 모드 설정 적용 완료:" -ForegroundColor Green
Write-Host "  도커: $($env:VFACTORY_TEST_MODE_DOCKER)" -ForegroundColor Gray
Write-Host "  프론트엔드: $($env:VFACTORY_TEST_MODE_FRONTEND)" -ForegroundColor Gray
Write-Host "  배포: $($env:VFACTORY_TEST_MODE_DEPLOYMENT)" -ForegroundColor Gray
