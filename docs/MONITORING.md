# V-Factory 모니터링 설정 가이드

## 개요

V-Factory 프로젝트의 모니터링 및 로깅 설정에 대한 가이드입니다.

## 헬스체크 엔드포인트

모든 백엔드 서비스는 `/health` 엔드포인트를 제공합니다.

### 엔드포인트
- **Factory Core Service**: `http://factory-core-service:8000/health`
- **Incident Event Service**: `http://incident-event-service:8000/health`
- **Asset Management Service**: `http://asset-management-service:8000/health`

### 응답 형식

#### 기본 응답 (정상 상태)
```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T10:30:00Z",
  "database": "connected",
  "redis": "connected"
}
```

#### Factory Core 및 Incident Event 서비스
- `database`: 데이터베이스 연결 상태 (`connected` 또는 `disconnected`)
- `redis`: Redis 연결 상태 (`connected` 또는 `disconnected`)

#### Asset Management 서비스
- `database`: 데이터베이스 연결 상태 (`connected` 또는 `disconnected`)

#### 비정상 상태 응답
```json
{
  "status": "unhealthy",
  "timestamp": "2026-01-15T10:30:00Z",
  "database": "disconnected",
  "database_error": "Connection refused",
  "redis": "disconnected",
  "redis_error": "Connection timeout"
}
```

비정상 상태일 경우 HTTP 상태 코드 `503 Service Unavailable`을 반환합니다.

### Kubernetes Health Checks

Kubernetes Deployment 매니페스트에 다음과 같은 Health Check가 설정되어 있습니다:

- **Liveness Probe**: 컨테이너가 살아있는지 확인 (실패 시 재시작)
- **Readiness Probe**: 컨테이너가 트래픽을 받을 준비가 되었는지 확인 (실패 시 트래픽 차단)

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 40
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 20
  periodSeconds: 10
```

## 로깅 시스템

### 로그 출력 방식

모든 백엔드 서비스는 **표준 출력(stdout)** 및 **표준 에러(stderr)**로 로그를 출력합니다.
Kubernetes 환경에서는 이러한 로그를 자동으로 수집합니다.

### 로그 레벨

환경변수 `LOG_LEVEL`로 로그 레벨을 설정할 수 있습니다:

- `DEBUG`: 상세한 디버그 정보
- `INFO`: 일반 정보 (프로덕션 권장)
- `WARNING`: 경고 메시지
- `ERROR`: 에러 메시지
- `CRITICAL`: 치명적 에러

### 구조화된 JSON 로깅

모든 백엔드 서비스는 **구조화된 JSON 로깅**을 사용합니다. 이는 Kubernetes 로그 수집 시스템과의 통합에 최적화되어 있습니다.

#### 로그 포맷

JSON 형식으로 출력되며, 각 로그 항목은 다음 필드를 포함합니다:

```json
{
  "timestamp": "2026-01-15T10:30:00.123456Z",
  "level": "INFO",
  "name": "factory-core",
  "message": "Factory Core Service 시작 완료"
}
```

#### 로그 레벨 설정

환경변수 `LOG_LEVEL`로 로그 레벨을 설정할 수 있습니다:

- `DEBUG`: 상세한 디버그 정보
- `INFO`: 일반 정보 (프로덕션 권장)
- `WARNING`: 경고 메시지
- `ERROR`: 에러 메시지
- `CRITICAL`: 치명적 에러

#### 로깅 사용 예시

```python
from utils.logging import logger

logger.info("서비스 시작 중...")
logger.warning("경고 메시지")
logger.error("에러 발생", extra={"error_code": 500})
```

#### 로그 수집

Kubernetes 환경에서는 `kubectl logs` 명령어로 로그를 확인할 수 있으며, JSON 형식으로 출력되어 로그 집계 시스템(ELK Stack, Loki 등)에서 쉽게 파싱할 수 있습니다.

## Prometheus 메트릭 수집

모든 백엔드 서비스는 **Prometheus 형식의 메트릭**을 자동으로 수집합니다.

### 메트릭 엔드포인트

각 서비스는 `/metrics` 엔드포인트를 제공합니다:

- **Factory Core Service**: `http://factory-core-service:8000/metrics`
- **Incident Event Service**: `http://incident-event-service:8000/metrics`
- **Asset Management Service**: `http://asset-management-service:8000/metrics`

### 수집되는 메트릭

`prometheus-fastapi-instrumentator`를 사용하여 다음 메트릭을 자동으로 수집합니다:

- **HTTP 요청 수**: `http_requests_total` - 총 HTTP 요청 수 (메서드, 경로, 상태 코드별)
- **HTTP 응답 시간**: `http_request_duration_seconds` - HTTP 요청 처리 시간 (히스토그램)
- **HTTP 요청 크기**: `http_request_size_bytes` - 요청 본문 크기
- **HTTP 응답 크기**: `http_response_size_bytes` - 응답 본문 크기

### 메트릭 예시

```prometheus
# HTTP 요청 수
http_requests_total{method="GET",path="/health",status_code="200"} 42

# HTTP 응답 시간 (히스토그램)
http_request_duration_seconds_bucket{method="GET",path="/health",le="0.005"} 40
http_request_duration_seconds_bucket{method="GET",path="/health",le="0.01"} 42
http_request_duration_seconds_sum{method="GET",path="/health"} 0.15
http_request_duration_seconds_count{method="GET",path="/health"} 42
```

### Prometheus 설정

Prometheus에서 메트릭을 수집하려면 `prometheus.yml`에 다음 설정을 추가하세요:

```yaml
scrape_configs:
  - job_name: 'v-factory-factory-core'
    static_configs:
      - targets: ['factory-core-service:8000']
  
  - job_name: 'v-factory-incident-event'
    static_configs:
      - targets: ['incident-event-service:8000']
  
  - job_name: 'v-factory-asset-management'
    static_configs:
      - targets: ['asset-management-service:8000']
```

### Grafana 대시보드

Prometheus 메트릭을 Grafana에서 시각화할 수 있습니다:

- HTTP 요청 수 추이
- 평균 응답 시간
- 에러율 (4xx, 5xx 상태 코드 비율)
- 엔드포인트별 성능 분석

## Kubernetes 로그 수집

Kubernetes 환경에서 로그를 수집하는 방법:

### 1. kubectl 로그 확인

```bash
# 특정 서비스의 로그 확인
kubectl logs -f deployment/factory-core -n v-factory

# 모든 파드의 로그 확인
kubectl logs -f -l app=factory-core -n v-factory
```

### 2. 로그 집계 시스템 (선택사항)

프로덕션 환경에서는 다음과 같은 로그 집계 시스템을 사용할 수 있습니다:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Loki** + **Grafana**
- **Fluentd** / **Fluent Bit**
- **Datadog**
- **Splunk**

이러한 시스템들은 Kubernetes의 로그를 자동으로 수집하고 시각화합니다.

## 모니터링 대시보드 (선택사항)

### Grafana 대시보드

Grafana를 사용하여 다음 메트릭을 모니터링할 수 있습니다:

- CPU 및 메모리 사용률
- HTTP 요청 수 및 응답 시간
- 데이터베이스 연결 수
- 에러율

### Kubernetes 메트릭

`kubectl top` 명령어로 리소스 사용률을 확인할 수 있습니다:

```bash
# Pod 리소스 사용률
kubectl top pods -n v-factory

# Node 리소스 사용률
kubectl top nodes
```

## 알림 설정 (선택사항)

프로덕션 환경에서는 다음 상황에 대한 알림을 설정하는 것이 좋습니다:

- Pod 재시작
- 헬스체크 실패
- 리소스 사용률 임계값 초과
- 에러율 증가

이러한 알림은 Prometheus Alertmanager, PagerDuty, Slack 등과 연동하여 설정할 수 있습니다.
