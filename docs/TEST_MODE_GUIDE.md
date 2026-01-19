# V-Factory 테스트 모드 관리 가이드

## 개요

V-Factory 프로젝트의 테스트 모드는 개발 설정을 쉽게 전환할 수 있도록 도와주는 시스템입니다.
도커, 프론트엔드, 배포 세 가지 영역에 대해 각각 테스트 모드를 on/off 할 수 있습니다.

## 사용법

### 기본 명령어

```powershell
# 테스트 모드 상태 확인
.\scripts\test-mode.ps1 status

# 도커 테스트 모드 활성화
.\scripts\test-mode.ps1 docker on

# 도커 테스트 모드 비활성화
.\scripts\test-mode.ps1 docker off

# 프론트엔드 테스트 모드 활성화
.\scripts\test-mode.ps1 frontend on

# 프론트엔드 테스트 모드 비활성화
.\scripts\test-mode.ps1 frontend off

# 배포 테스트 모드 활성화
.\scripts\test-mode.ps1 deployment on

# 배포 테스트 모드 비활성화
.\scripts\test-mode.ps1 deployment off
```

## 각 영역별 동작

### 🐳 도커 테스트 모드

**활성화 시:**
- 개발 환경 설정 사용 (docker-compose.yml)
- 디버그 로그 활성화
- Hot Reload 활성화
- 상세한 로그 출력

**비활성화 시:**
- 프로덕션 환경 설정 사용 (docker-compose.prod.yml)
- 디버그 로그 비활성화
- 최적화된 빌드 사용

**사용 예시:**
```powershell
# 테스트 모드 활성화
.\scripts\test-mode.ps1 docker on

# 도커 서비스 시작 (테스트 모드 적용)
.\scripts\docker-compose-with-test-mode.ps1 up -Build -Detached

# 테스트 모드 비활성화
.\scripts\test-mode.ps1 docker off
```

### ⚛️ 프론트엔드 테스트 모드

**활성화 시:**
- `NEXT_PUBLIC_TEST_MODE=true` 환경 변수 설정
- 테스트용 API 엔드포인트 사용
- 디버그 모드 활성화
- 개발 도구 활성화

**비활성화 시:**
- 프로덕션 환경 변수 사용
- 프로덕션 API 엔드포인트 사용
- 최적화된 빌드

**사용 예시:**
```powershell
# 테스트 모드 활성화
.\scripts\test-mode.ps1 frontend on

# 프론트엔드 개발 서버 시작
cd frontend
npm run dev

# 테스트 모드 비활성화
.\scripts\test-mode.ps1 frontend off
```

### 🚀 배포 테스트 모드

**활성화 시:**
- 테스트 네임스페이스 사용 (`v-factory-test`)
- 테스트 환경으로 배포
- 테스트용 리소스 제한 적용

**비활성화 시:**
- 프로덕션 네임스페이스 사용 (`v-factory`)
- 프로덕션 환경으로 배포
- 프로덕션 리소스 설정 사용

**사용 예시:**
```powershell
# 테스트 모드 활성화
.\scripts\test-mode.ps1 deployment on

# Kubernetes 배포 (테스트 환경)
.\scripts\deploy-k8s.ps1

# 테스트 모드 비활성화
.\scripts\test-mode.ps1 deployment off
```

## 설정 파일

테스트 모드 상태는 `.test-mode.json` 파일에 저장됩니다:

```json
{
  "docker": false,
  "frontend": false,
  "deployment": false,
  "lastUpdated": "2024-01-01 12:00:00"
}
```

이 파일은 자동으로 생성되며, 수동으로 편집할 수도 있습니다.

## 통합 사용 예시

### 개발 환경 설정

```powershell
# 모든 영역 테스트 모드 활성화
.\scripts\test-mode.ps1 docker on
.\scripts\test-mode.ps1 frontend on
.\scripts\test-mode.ps1 deployment on

# 상태 확인
.\scripts\test-mode.ps1 status
```

### 프로덕션 환경 설정

```powershell
# 모든 영역 테스트 모드 비활성화
.\scripts\test-mode.ps1 docker off
.\scripts\test-mode.ps1 frontend off
.\scripts\test-mode.ps1 deployment off

# 상태 확인
.\scripts\test-mode.ps1 status
```

## 주의사항

1. **도커 테스트 모드 변경 후**: 도커 서비스를 재시작해야 변경사항이 적용됩니다.
   ```powershell
   docker compose down
   docker compose up --build -d
   ```

2. **프론트엔드 테스트 모드 변경 후**: 프론트엔드 서비스를 재시작해야 합니다.
   ```powershell
   # 로컬 개발 서버인 경우
   # Ctrl+C로 중지 후 다시 시작
   
   # 도커 컨테이너인 경우
   docker compose restart frontend
   ```

3. **배포 테스트 모드**: 배포 전에 반드시 확인하세요. 테스트 모드가 활성화되어 있으면 테스트 환경으로 배포됩니다.

## 문제 해결

### 테스트 모드가 적용되지 않는 경우

1. `.test-mode.json` 파일이 올바른 위치에 있는지 확인
2. 환경 변수가 올바르게 설정되었는지 확인
3. 서비스를 재시작했는지 확인

### 상태 확인

```powershell
# 현재 테스트 모드 상태 확인
.\scripts\test-mode.ps1 status

# .test-mode.json 파일 직접 확인
Get-Content .test-mode.json | ConvertFrom-Json
```
