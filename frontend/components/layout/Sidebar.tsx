"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Camera,
  AlertTriangle,
  Settings,
  Factory,
} from "lucide-react";
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
 * 사이드바 네비게이션 컴포넌트
 * 관제 시스템 다크 테마에 맞춘 디자인
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card md:block">
      {/* 로고 영역 */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/" className="flex items-center gap-2">
          <Factory className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-primary">V-Factory</h1>
        </Link>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 하단 시스템 정보 */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
        <div className="text-xs text-muted-foreground">
          <p>V-Factory v0.1.0</p>
          <p className="mt-1">WebGPU 기반 관제 시스템</p>
        </div>
      </div>
    </aside>
  );
}
