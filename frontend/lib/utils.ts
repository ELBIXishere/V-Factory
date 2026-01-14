import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * TailwindCSS 클래스명 병합 유틸리티
 * ShadCN UI 패턴에서 사용
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * API Base URL 가져오기
 */
export function getApiUrl(service: "factory" | "incident" | "asset"): string {
  const urls = {
    factory: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001",
    incident:
      process.env.NEXT_PUBLIC_INCIDENT_API_URL || "http://localhost:8002",
    asset: process.env.NEXT_PUBLIC_ASSET_API_URL || "http://localhost:8003",
  };
  return urls[service];
}

/**
 * 날짜 포맷팅 유틸리티
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * 사고 심각도 레이블 가져오기
 */
export function getSeverityLabel(severity: number): string {
  const labels: Record<number, string> = {
    1: "경미",
    2: "보통",
    3: "주의",
    4: "심각",
    5: "위험",
  };
  return labels[severity] || "알 수 없음";
}

/**
 * 사고 유형 한글 레이블
 */
export function getIncidentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ENTANGLEMENT: "끼임",
    FALL: "전도/넘어짐",
    COLLISION: "충돌",
    FIRE: "화재",
    ELECTRIC_SHOCK: "감전",
    OTHER: "기타",
  };
  return labels[type] || type;
}
