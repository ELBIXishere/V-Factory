"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * TanStack Query Provider 컴포넌트
 * 앱 전체에 Query Client를 제공
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // QueryClient를 상태로 관리하여 SSR 시 새 인스턴스 생성 방지
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 기본 쿼리 옵션
            staleTime: 60 * 1000, // 1분
            gcTime: 5 * 60 * 1000, // 5분 (이전 cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            // 기본 mutation 옵션
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
