import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// 컴포넌트
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { GlobalSceneProvider } from "@/components/three/GlobalSceneProvider";

// 폰트 설정
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// 메타데이터
export const metadata: Metadata = {
  title: "V-Factory | 가상 공장 안전 모니터링",
  description:
    "WebGPU 기반 3D 렌더링 기술을 활용한 가상 공장 안전 모니터링 시뮬레이터",
  keywords: ["공장", "안전", "모니터링", "CCTV", "WebGPU", "3D"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <QueryProvider>
          {/* 전역 3D 씬 프로바이더 (페이지 간 씬 상태 공유) */}
          <GlobalSceneProvider />
          
          {/* 메인 레이아웃 구조 */}
          <div className="flex min-h-screen">
            {/* 사이드바 (데스크톱) */}
            <Sidebar />

            {/* 모바일 네비게이션 */}
            <MobileNav />

            {/* 메인 콘텐츠 영역 */}
            <div className="flex flex-1 flex-col">
              {/* 헤더 */}
              <Header />

              {/* 페이지 콘텐츠 */}
              <main className="flex-1 overflow-auto p-6">{children}</main>
            </div>
          </div>

          {/* 토스트 알림 */}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              className: "bg-card border-border",
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
