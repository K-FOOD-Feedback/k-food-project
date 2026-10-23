import type { Metadata, Viewport } from "next";
import { Figtree, Inter } from "next/font/google";
import { Suspense } from "react";
import { ViewerToggle } from "@/components/ViewerToggle";
import { DsPreviewBridge } from "@/components/DsPreviewBridge";
import { FlowProvider } from "@/lib/write-store";
import { Analytics } from "./Analytics";
import { mPlus2, paperlogy } from "./posts/[id]/font";
import "./globals.css";

/*
  글꼴 (디자인 정리 도구 · 토큰 관리 기준) — 화면 언어별
  - 한국어: 본문 Pretendard · 제목 Paperlogy ExtraBold
  - 영어: 본문 Inter · 제목 Figtree (font-display · font-title-en)
  - 일본어: M PLUS 2 (제목 · 본문) · 중국어 간체: MiSans · 번체: LINE Seed TW (제목 · 본문)
  본문 글꼴은 html lang 으로 고름 (useDocLang · globals.css)
*/
// 영어 제목
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-figtree",
});

// 영어 본문
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  // 서비스 이름은 여기 한 곳에만 — 화면별 제목은 앞부분만 적으면 뒤에 " · Toppy Tippy"가 붙음
  title: { default: "Toppy Tippy", template: "%s · Toppy Tippy" },
  description: "전 세계의 한식 도전에 한마디를 보태는 곳",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  // 모바일 브라우저 상단 바·툴바 색을 앱 바탕(--color-background)과 같게
  themeColor: "#111111",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${figtree.variable} ${inter.variable} ${mPlus2.variable} ${paperlogy.variable} h-full antialiased`}>
      <head>
        {/* Pretendard (OFL) — 한글/본문 폰트 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* MiSans (Xiaomi, 상업용 무료) — 중국어 간체. 본문 가변(150~700) + 제목 Heavy. 중국어 글자가 나올 때 그 조각만 받음 */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/misans@5.0.0/lib/Normal/MiSansVF.min.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/misans@5.0.0/lib/Normal/MiSans-Heavy.min.css" />
      </head>
      <body className="min-h-full flex flex-col">
        {/* 작성 → 게시 → 수정 흐름 상태 (서버 연결 전까지 메모리에 보관) */}
        <FlowProvider>{children}</FlowProvider>
        {/* 작업용 한국인 ↔ 외국인 화면 바꾸기 (개발 서버에서만, 배포 주소는 ?dev=1) — 주소를 읽어서 Suspense로 감쌈 */}
        <Suspense>
          <ViewerToggle />
        </Suspense>
        {/* 디자인 시스템 정리 도구(k-food-ds)의 미리보기 연결 — 그 도구 안에 띄웠을 때만 동작 */}
        <DsPreviewBridge />
        {/* Mixpanel (토큰 없으면 동작 안 함) */}
        <Analytics />
      </body>
    </html>
  );
}
