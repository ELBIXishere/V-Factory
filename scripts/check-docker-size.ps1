# V-Factory Docker 용량 확인 스크립트
# Docker 관련 모든 리소스의 용량을 상세히 확인합니다.

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "V-Factory Docker 용량 확인" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Docker 명령어 사용 가능 여부 확인
$dockerAvailable = $false
try {
    $null = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerAvailable = $true
    }
} catch {
    $dockerAvailable = $false
}

if (-not $dockerAvailable) {
    Write-Host "❌ Docker가 설치되어 있지 않거나 실행 중이 아닙니다." -ForegroundColor Red
    Write-Host "   Docker Desktop을 실행한 후 다시 시도해주세요." -ForegroundColor Yellow
    exit 1
}

# 바이트를 GB로 변환하는 함수
function ConvertTo-GB {
    param([long]$Bytes)
    return [math]::Round($Bytes / 1GB, 2)
}

# 바이트를 MB로 변환하는 함수
function ConvertTo-MB {
    param([long]$Bytes)
    return [math]::Round($Bytes / 1MB, 2)
}

# V-Factory 관련 리소스인지 확인하는 함수
function Is-VFactoryResource {
    param([string]$Name)
    return $Name -match "vfactory|v-factory|V-Factory"
}

# ============================================
# 1. Docker 이미지 용량 확인
# ============================================
Write-Host "📦 Docker 이미지 용량" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$images = docker images --format "{{.Repository}}|{{.Tag}}|{{.Size}}|{{.ID}}" | ForEach-Object {
    $parts = $_ -split '\|'
    [PSCustomObject]@{
        Repository = $parts[0]
        Tag = $parts[1]
        Size = $parts[2]
        ID = $parts[3]
        IsVFactory = Is-VFactoryResource -Name $parts[0]
    }
}

if ($images.Count -eq 0) {
    Write-Host "  이미지가 없습니다." -ForegroundColor Gray
} else {
    $totalImageSize = 0
    $vfactoryImageSize = 0
    
    # 이미지별 상세 정보 수집
    $imageDetails = @()
    foreach ($img in $images) {
        # Size 문자열에서 숫자 추출 (예: "1.5GB", "500MB")
        $sizeStr = $img.Size
        $sizeValue = 0
        
        if ($sizeStr -match '(\d+\.?\d*)\s*(GB|MB|KB)') {
            $number = [double]$matches[1]
            $unit = $matches[2]
            
            switch ($unit) {
                "GB" { $sizeValue = $number }
                "MB" { $sizeValue = $number / 1024 }
                "KB" { $sizeValue = $number / 1024 / 1024 }
            }
        }
        
        $totalImageSize += $sizeValue
        if ($img.IsVFactory) {
            $vfactoryImageSize += $sizeValue
        }
        
        $imageDetails += [PSCustomObject]@{
            Repository = $img.Repository
            Tag = $img.Tag
            Size = $img.Size
            SizeGB = $sizeValue
            IsVFactory = $img.IsVFactory
        }
    }
    
    # V-Factory 이미지 먼저 표시
    $vfactoryImages = $imageDetails | Where-Object { $_.IsVFactory } | Sort-Object SizeGB -Descending
    $otherImages = $imageDetails | Where-Object { -not $_.IsVFactory } | Sort-Object SizeGB -Descending
    
    if ($vfactoryImages.Count -gt 0) {
        Write-Host "`n  [V-Factory 관련 이미지]" -ForegroundColor Cyan
        $vfactoryImages | ForEach-Object {
            $marker = if ($_.IsVFactory) { "★" } else { " " }
            Write-Host "  $marker $($_.Repository):$($_.Tag) - $($_.Size)" -ForegroundColor $(if ($_.IsVFactory) { "White" } else { "Gray" })
        }
    }
    
    if ($otherImages.Count -gt 0) {
        Write-Host "`n  [기타 이미지]" -ForegroundColor Gray
        $otherImages | Select-Object -First 10 | ForEach-Object {
            Write-Host "    $($_.Repository):$($_.Tag) - $($_.Size)" -ForegroundColor Gray
        }
        if ($otherImages.Count -gt 10) {
            Write-Host "    ... 외 $($otherImages.Count - 10)개 이미지" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "  총 이미지 용량: $([math]::Round($totalImageSize, 2)) GB" -ForegroundColor White
    Write-Host "  V-Factory 이미지: $([math]::Round($vfactoryImageSize, 2)) GB" -ForegroundColor Cyan
}

Write-Host ""

# ============================================
# 2. Docker 컨테이너 용량 확인
# ============================================
Write-Host "🐳 Docker 컨테이너 용량" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$containers = docker ps -a --format "{{.Names}}|{{.Image}}|{{.Status}}|{{.Size}}" | ForEach-Object {
    $parts = $_ -split '\|'
    [PSCustomObject]@{
        Name = $parts[0]
        Image = $parts[1]
        Status = $parts[2]
        Size = $parts[3]
        IsVFactory = Is-VFactoryResource -Name $parts[0]
    }
}

if ($containers.Count -eq 0) {
    Write-Host "  컨테이너가 없습니다." -ForegroundColor Gray
} else {
    $vfactoryContainers = $containers | Where-Object { $_.IsVFactory } | Sort-Object Name
    $otherContainers = $containers | Where-Object { -not $_.IsVFactory } | Sort-Object Name
    
    if ($vfactoryContainers.Count -gt 0) {
        Write-Host "`n  [V-Factory 관련 컨테이너]" -ForegroundColor Cyan
        $vfactoryContainers | ForEach-Object {
            $statusColor = if ($_.Status -match "Up") { "Green" } else { "Red" }
            Write-Host "  ★ $($_.Name) - $($_.Status) - $($_.Size)" -ForegroundColor White
        }
    }
    
    if ($otherContainers.Count -gt 0) {
        Write-Host "`n  [기타 컨테이너]" -ForegroundColor Gray
        $otherContainers | Select-Object -First 5 | ForEach-Object {
            Write-Host "    $($_.Name) - $($_.Status) - $($_.Size)" -ForegroundColor Gray
        }
        if ($otherContainers.Count -gt 5) {
            Write-Host "    ... 외 $($otherContainers.Count - 5)개 컨테이너" -ForegroundColor Gray
        }
    }
}

Write-Host ""

# ============================================
# 3. Docker 볼륨 용량 확인
# ============================================
Write-Host "💾 Docker 볼륨 용량" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$volumes = docker volume ls --format "{{.Name}}" | ForEach-Object {
    [PSCustomObject]@{
        Name = $_
        IsVFactory = Is-VFactoryResource -Name $_
    }
}

if ($volumes.Count -eq 0) {
    Write-Host "  볼륨이 없습니다." -ForegroundColor Gray
} else {
    $vfactoryVolumes = $volumes | Where-Object { $_.IsVFactory } | Sort-Object Name
    $otherVolumes = $volumes | Where-Object { -not $_.IsVFactory } | Sort-Object Name
    
    if ($vfactoryVolumes.Count -gt 0) {
        Write-Host "`n  [V-Factory 관련 볼륨]" -ForegroundColor Cyan
        foreach ($vol in $vfactoryVolumes) {
            try {
                # 볼륨 상세 정보 가져오기
                $volInfo = docker volume inspect $vol.Name 2>&1 | ConvertFrom-Json
                $mountpoint = $volInfo.Mountpoint
                
                # Windows에서는 직접 확인이 어려울 수 있음
                Write-Host "  ★ $($vol.Name)" -ForegroundColor White
                Write-Host "      마운트 경로: $mountpoint" -ForegroundColor Gray
                
                # Linux 컨테이너 내에서 확인 시도 (선택적)
                # Windows에서는 Docker Desktop의 WSL2 백엔드를 통해 접근해야 함
            } catch {
                Write-Host "  ★ $($vol.Name) (상세 정보 확인 불가)" -ForegroundColor White
            }
        }
    }
    
    if ($otherVolumes.Count -gt 0) {
        Write-Host "`n  [기타 볼륨]" -ForegroundColor Gray
        $otherVolumes | Select-Object -First 5 | ForEach-Object {
            Write-Host "    $($_.Name)" -ForegroundColor Gray
        }
        if ($otherVolumes.Count -gt 5) {
            Write-Host "    ... 외 $($otherVolumes.Count - 5)개 볼륨" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "  참고: Windows에서는 볼륨의 실제 용량을 직접 확인하기 어렵습니다." -ForegroundColor Yellow
    Write-Host "        볼륨 용량은 Docker Desktop의 WSL2 백엔드에 저장됩니다." -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 4. Docker 빌드 캐시 용량 확인
# ============================================
Write-Host "🔨 Docker 빌드 캐시 용량" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

try {
    $builderInfo = docker builder du 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host $builderInfo -ForegroundColor White
    } else {
        Write-Host "  빌드 캐시 정보를 가져올 수 없습니다." -ForegroundColor Gray
    }
} catch {
    Write-Host "  빌드 캐시 정보를 가져올 수 없습니다." -ForegroundColor Gray
}

Write-Host ""

# ============================================
# 5. Docker 시스템 전체 용량 요약
# ============================================
Write-Host "📊 Docker 시스템 전체 용량 요약" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

try {
    $systemDf = docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}\t{{.Reclaimable}}"
    Write-Host $systemDf -ForegroundColor White
} catch {
    Write-Host "  시스템 용량 정보를 가져올 수 없습니다." -ForegroundColor Gray
}

Write-Host ""

# ============================================
# 6. 상세 용량 정보 (JSON 형식)
# ============================================
Write-Host "📋 상세 용량 정보 (JSON)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

try {
    $systemDfJson = docker system df --format json | ConvertFrom-Json
    $totalSize = 0
    
    foreach ($item in $systemDfJson) {
        $sizeStr = $item.Size
        $sizeValue = 0
        
        if ($sizeStr -match '(\d+\.?\d*)\s*(GB|MB|KB|B)') {
            $number = [double]$matches[1]
            $unit = $matches[2]
            
            switch ($unit) {
                "GB" { $sizeValue = $number }
                "MB" { $sizeValue = $number / 1024 }
                "KB" { $sizeValue = $number / 1024 / 1024 }
                "B" { $sizeValue = $number / 1024 / 1024 / 1024 }
            }
        }
        
        $totalSize += $sizeValue
        
        Write-Host "  $($item.Type):" -ForegroundColor Cyan
        Write-Host "    총 개수: $($item.TotalCount)" -ForegroundColor White
        Write-Host "    크기: $($item.Size)" -ForegroundColor White
        Write-Host "    회수 가능: $($item.Reclaimable)" -ForegroundColor $(if ($item.Reclaimable -match "0B") { "Gray" } else { "Yellow" })
        Write-Host ""
    }
    
    Write-Host "  총 Docker 사용 용량: $([math]::Round($totalSize, 2)) GB" -ForegroundColor Green
} catch {
    Write-Host "  상세 정보를 가져올 수 없습니다." -ForegroundColor Gray
}

Write-Host ""

# ============================================
# 7. 정리 권장 사항
# ============================================
Write-Host "🧹 용량 정리 권장 사항" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "  다음 명령어로 용량을 정리할 수 있습니다:" -ForegroundColor White
Write-Host ""
Write-Host "  1. 사용하지 않는 이미지 삭제 (볼륨 유지):" -ForegroundColor Cyan
Write-Host "     docker image prune -a" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. 중지된 컨테이너 삭제:" -ForegroundColor Cyan
Write-Host "     docker container prune" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. 빌드 캐시 정리:" -ForegroundColor Cyan
Write-Host "     docker builder prune" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. 전체 정리 (⚠️  볼륨 포함, 데이터 삭제됨):" -ForegroundColor Cyan
Write-Host "     docker system prune -a --volumes" -ForegroundColor Red
Write-Host ""
Write-Host "  5. V-Factory 프로젝트만 정리:" -ForegroundColor Cyan
Write-Host "     docker compose down -v" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "용량 확인 완료" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
