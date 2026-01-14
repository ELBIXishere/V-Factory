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
```json
{
  "status": "healthy"
}
```

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

### 로그 포맷

프로덕션 환경에서는 uvicorn의 기본 로그 포맷을 사용합니다:

```
INFO:     127.0.0.1:12345 - "GET /health HTTP/1.1" 200 OK
```

### 구조화된 로깅 (선택사항)

JSON 형식의 구조화된 로깅을 사용하려면 `python-json-logger` 라이브러리를 추가하고 설정을 수정해야 합니다.

## 메트릭 수집

### 현재 상태

현재는 기본 헬스체크 엔드포인트만 제공합니다.

### Prometheus 메트릭 (선택사항)

Prometheus 형식의 메트릭을 수집하려면 다음 라이브러리를 사용할 수 있습니다:

- `prometheus-fastapi-instrumentator`: FastAPI 애플리케이션에 Prometheus 메트릭 자동 추가
- `prometheus-client`: 커스텀 메트릭 생성

### 메트릭 엔드포인트 추가 예시

```python
from prometheus_fastapi_instrumentator import Instrumentator

# FastAPI 앱에 메트릭 추가
Instrumentator().instrument(app).expose(app)
```

이렇게 설정하면 `/metrics` 엔드포인트가 자동으로 생성됩니다.

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
