import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { FlowProvider } from "@/lib/write-store";
import { Analytics } from "./Analytics";
import { paperlogy } from "./posts/[id]/font";
import "./globals.css";

// 굵은 제목 폰트: 영문 Gilroy(없으면 Figtree) · 한글 Paperlogy ExtraBold (font-display)
// Gilroy 대체용 영문 제목 폰트
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "오늘의 참견",
  description: "전 세계의 한식 도전에 한마디를 보태는 곳",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${figtree.variable} ${paperlogy.variable} h-full antialiased`}>
      <head>
        {/* Pretendard (OFL) — 한글/본문 폰트 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* 작성 → 게시 → 수정 흐름 상태 (서버 연결 전까지 메모리에 보관) */}
        <FlowProvider>{children}</FlowProvider>
        {/* Mixpanel (토큰 없으면 동작 안 함) */}
        <Analytics />
      </body>
    </html>
  );
}
