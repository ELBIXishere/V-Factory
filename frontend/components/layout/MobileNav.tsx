"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Camera,
  AlertTriangle,
  Settings,
  Factory,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

// 네비게이션 메뉴 아이템 정의
const navItems = [
  {
    href: "/",
    label: "대시보드",
    icon: LayoutDashboard,
  },
  {
    href: "/monitoring",
    label: "CCTV 모니터링",
    icon: Camera,
  },
  {
    href: "/incidents",
    label: "사고 로그",
    icon: AlertTriangle,
  },
  {
    href: "/settings",
    label: "설정",
    icon: Settings,
  },
];

/**
 * 모바일 네비게이션 컴포넌트
 * 사이드바가 열릴 때 오버레이로 표시
 */
export function MobileNav() {
  const pathname = usePathname();
  const { isSidebarOpen, closeSidebar } = useUIStore();

  // 페이지 이동 시 사이드바 닫기
  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSidebar();
      }
    };

    if (isSidebarOpen) {
      document.addEventListener("keydown", handleEsc);
      // 스크롤 방지
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen, closeSidebar]);

  if (!isSidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* 오버레이 배경 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeSidebar}
      />

      {/* 사이드바 */}
      <nav className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border shadow-xl animate-in slide-in-from-left duration-300">
        {/* 헤더 */}
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link href="/" className="flex items-center gap-2" onClick={closeSidebar}>
            <Factory className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">V-Factory</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={closeSidebar}>
            <X className="h-5 w-5" />
            <span className="sr-only">닫기</span>
          </Button>
        </div>

        {/* 메뉴 */}
        <div className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary"
                    )}
                    onClick={closeSidebar}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 하단 정보 */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
          <div className="text-xs text-muted-foreground">
            <p>V-Factory v0.1.0</p>
            <p className="mt-1">WebGPU 기반 관제 시스템</p>
          </div>
        </div>
      </nav>
    </div>
  );
}
