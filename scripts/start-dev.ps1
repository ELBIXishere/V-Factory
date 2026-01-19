# V-Factory 개발 환경 자동 시작 스크립트

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "V-Factory 개발 환경 시작" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Docker Desktop 확인 및 대기
Write-Host "[0/4] Docker Desktop 연결 확인 중..." -ForegroundColor Yellow
$dockerReady = $false
for ($i=1; $i -le 24; $i++) {
    Start-Sleep -Seconds 5
    $result = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Docker Desktop 준비 완료!" -ForegroundColor Green
        $dockerReady = $true
        break
    } else {
        if ($i -eq 1) {
            Write-Host "Docker Desktop 시작 대기 중..." -ForegroundColor Gray
        }
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

if (-not $dockerReady) {
    Write-Host "`n`n⚠️  Docker Desktop을 수동으로 시작해주세요:" -ForegroundColor Yellow
    Write-Host "  1. Docker Desktop 애플리케이션 실행" -ForegroundColor White
    Write-Host "  2. Docker Desktop이 완전히 시작될 때까지 대기" -ForegroundColor White
    Write-Host "  3. 다음 명령 실행: docker compose up --build -d" -ForegroundColor White
    exit 1
}

Write-Host ""

# 환경변수 파일 확인
Write-Host "[1/4] 환경변수 파일 확인 중..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    Write-Host "  .env 파일이 없습니다. env.example을 복사합니다..." -ForegroundColor Gray
    Copy-Item env.example .env
    Write-Host "  ✅ .env 파일 생성 완료" -ForegroundColor Green
} else {
    Write-Host "  ✅ .env 파일 존재 확인" -ForegroundColor Green
}

Write-Host ""

# Docker Compose 서비스 시작
Write-Host "[2/4] Docker Compose 서비스 빌드 및 시작 중..." -ForegroundColor Yellow
Write-Host "  (처음 실행 시 이미지 빌드로 시간이 걸릴 수 있습니다)" -ForegroundColor Gray
Write-Host ""

docker compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ 서비스 시작 실패" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 서비스 상태 확인 대기
Write-Host "[3/4] 서비스 시작 대기 중... (최대 60초)" -ForegroundColor Yellow
$maxWait = 60
$waited = 0
$allHealthy = $false

while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 3
    $waited += 3
    
    $status = docker compose ps --format json | ConvertFrom-Json
    $totalServices = ($status | Measure-Object).Count
    $runningServices = ($status | Where-Object { $_.State -eq "running" } | Measure-Object).Count
    
    if ($runningServices -eq $totalServices -and $totalServices -gt 0) {
        Write-Host "`n✅ 모든 서비스가 실행 중입니다! ($runningServices/$totalServices)" -ForegroundColor Green
        $allHealthy = $true
        break
    } else {
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

Write-Host ""

# 최종 상태 출력
Write-Host "[4/4] 서비스 상태 확인" -ForegroundColor Yellow
docker compose ps

Write-Host ""

# 접근 URL 안내
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "개발 환경 준비 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "접근 URL:" -ForegroundColor Yellow
Write-Host "  🌐 Frontend:    http://localhost:3100" -ForegroundColor White
Write-Host "  🔧 Factory Core:      http://localhost:8001" -ForegroundColor White
Write-Host "  🔧 Incident Event:    http://localhost:8002" -ForegroundColor White
Write-Host "  🔧 Asset Management:  http://localhost:8003" -ForegroundColor White
Write-Host "  🗄️  PostgreSQL:       localhost:5555" -ForegroundColor White
Write-Host "  📦 Redis:             localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "유용한 명령어:" -ForegroundColor Yellow
Write-Host "  로그 확인:    docker compose logs -f [서비스명]" -ForegroundColor Gray
Write-Host "  서비스 중지:  docker compose down" -ForegroundColor Gray
Write-Host "  서비스 재시작: docker compose restart [서비스명]" -ForegroundColor Gray
Write-Host ""