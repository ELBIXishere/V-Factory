// 시스템 설정 페이지
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">시스템 설정</h1>
        <p className="text-muted-foreground">
          V-Factory 시스템 설정을 관리합니다
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 일반 설정 */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">일반 설정</h2>
          </div>
          <div className="space-y-4 p-6">
            <div>
              <label className="text-sm font-medium text-foreground">
                공장 이름
              </label>
              <input
                type="text"
                defaultValue="메인 생산 공장"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                시간대
              </label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="Asia/Seoul">Asia/Seoul (KST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">다크 모드</p>
                <p className="text-xs text-muted-foreground">
                  관제 시스템 다크 테마 사용
                </p>
              </div>
              <button className="relative h-6 w-11 rounded-full bg-primary">
                <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white transition-transform"></span>
              </button>
            </div>
          </div>
        </div>

        {/* CCTV 설정 */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">CCTV 설정</h2>
          </div>
          <div className="space-y-4 p-6">
            <div>
              <label className="text-sm font-medium text-foreground">
                기본 그리드 레이아웃
              </label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="2x2">2x2 (4대)</option>
                <option value="3x3">3x3 (9대)</option>
                <option value="4x4">4x4 (16대)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                렌더링 품질
              </label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="high">높음 (1080p)</option>
                <option value="medium">중간 (720p)</option>
                <option value="low">낮음 (480p)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                프레임 레이트 제한
              </label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="60">60 FPS</option>
                <option value="30">30 FPS</option>
                <option value="unlimited">무제한</option>
              </select>
            </div>
          </div>
        </div>

        {/* 알림 설정 */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">알림 설정</h2>
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  사고 알림 활성화
                </p>
                <p className="text-xs text-muted-foreground">
                  사고 발생 시 즉시 알림
                </p>
              </div>
              <button className="relative h-6 w-11 rounded-full bg-primary">
                <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white transition-transform"></span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  소리 알림
                </p>
                <p className="text-xs text-muted-foreground">
                  경고음과 함께 알림
                </p>
              </div>
              <button className="relative h-6 w-11 rounded-full bg-primary">
                <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white transition-transform"></span>
              </button>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                최소 알림 심각도
              </label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="1">Level 1 (모든 사고)</option>
                <option value="2">Level 2 이상</option>
                <option value="3">Level 3 이상</option>
                <option value="4">Level 4 이상 (심각한 사고만)</option>
              </select>
            </div>
          </div>
        </div>

        {/* API 연결 상태 */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              API 연결 상태
            </h2>
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Factory Core API</span>
              <span className="flex items-center gap-1 text-sm text-status-safe">
                <span className="h-2 w-2 rounded-full bg-status-safe"></span>
                연결됨
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                Incident Event API
              </span>
              <span className="flex items-center gap-1 text-sm text-status-safe">
                <span className="h-2 w-2 rounded-full bg-status-safe"></span>
                연결됨
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                Asset Management API
              </span>
              <span className="flex items-center gap-1 text-sm text-status-safe">
                <span className="h-2 w-2 rounded-full bg-status-safe"></span>
                연결됨
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Redis (SSE)</span>
              <span className="flex items-center gap-1 text-sm text-status-safe">
                <span className="h-2 w-2 rounded-full bg-status-safe"></span>
                연결됨
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-2">
        <button className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
          취소
        </button>
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          설정 저장
        </button>
      </div>
    </div>
  );
}
