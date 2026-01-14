"use client";

import { useEffect, useState } from "react";
import { Menu, Bell, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

/**
 * 시스템 상태 타입
 */
type SystemStatus = "normal" | "warning" | "danger";

/**
 * 헤더 컴포넌트
 * 시스템 상태와 실시간 시계를 표시
 */
export function Header() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isConnected, setIsConnected] = useState(true);
  const { toggleSidebar } = useUIStore();

  // 시스템 상태 (추후 API 연동)
  const systemStatus: SystemStatus = "normal";
  const unreadAlerts = 0;

  // 실시간 시계 업데이트
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // 상태별 스타일
  const statusStyles = {
    normal: {
      bg: "bg-status-safe",
      text: "text-status-safe",
      label: "정상 운영 중",
    },
    warning: {
      bg: "bg-status-warning",
      text: "text-status-warning",
      label: "주의 필요",
    },
    danger: {
      bg: "bg-status-danger",
      text: "text-status-danger",
      label: "위험 상황",
    },
  };

  const currentStatusStyle = statusStyles[systemStatus];

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      {/* 좌측: 모바일 메뉴 버튼 & 시스템 상태 */}
      <div className="flex items-center gap-4">
        {/* 모바일 메뉴 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">메뉴 열기</span>
        </Button>

        {/* 시스템 상태 */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">시스템 상태:</span>
          <span
            className={cn(
              "flex items-center gap-1.5 text-sm",
              currentStatusStyle.text
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full animate-pulse",
                currentStatusStyle.bg
              )}
            />
            {currentStatusStyle.label}
          </span>
        </div>
      </div>

      {/* 우측: 알림, 연결 상태, 시간 */}
      <div className="flex items-center gap-4">
        {/* 알림 버튼 */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadAlerts > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadAlerts}
            </Badge>
          )}
          <span className="sr-only">알림</span>
        </Button>

        {/* 연결 상태 */}
        <div className="hidden sm:flex items-center gap-1.5">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-status-safe" />
              <span className="text-xs text-status-safe">연결됨</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-status-danger" />
              <span className="text-xs text-status-danger">연결 끊김</span>
            </>
          )}
        </div>

        {/* 현재 시간 */}
        <div className="hidden md:block text-sm text-muted-foreground font-mono">
          {currentTime}
        </div>
      </div>
    </header>
  );
}
