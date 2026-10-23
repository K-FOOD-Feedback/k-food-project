import { M_PLUS_2 } from "next/font/google";
import localFont from "next/font/local";
import type { UiLang } from "./viewerLang";

// 상세 제목용 Paperlogy ExtraBold (SIL OFL 1.1, 이주임 — 눈누 배포본)
export const paperlogy = localFont({
  src: "./Paperlogy-8ExtraBold.woff2",
  weight: "800",
  variable: "--font-paperlogy",
  display: "swap",
});

/*
  일본어 글꼴 — M PLUS 2 (SIL OFL, Google Fonts) · 제목 · 본문 같은 글꼴, 굵기는 한 파일(가변)
  - preload: false → 미리 받지 않고, 일본어 글자가 화면에 나올 때만 받음 (글자 범위별로 잘게 나뉜 파일)
  중국어 글꼴 — 간체 MiSans (Xiaomi, 상업용 무료) · 번체 LINE Seed TW (아직 번체 화면이 없어서 기기에 있을 때만)
  - MiSans 는 layout.tsx 에서 jsDelivr 로 불러옴 (Pretendard 처럼, 글자 범위별 조각만 받음) — 이름은 globals.css --font-zh-hans
*/
export const mPlus2 = M_PLUS_2({ subsets: ["latin"], preload: false, display: "swap", variable: "--font-mplus2" });

/** 제목 글꼴 — 영어 Figtree(font-title-en, 한글과 크기가 맞게 보정) · 한국어 Paperlogy · 중국어 MiSans · 일본어 M PLUS 2 (모두 800) */
export const titleFont = (lang: UiLang) =>
  lang === "en"
    ? "font-title-en"
    : lang === "zh"
      ? "font-(family-name:--font-zh-hans-title) font-extrabold"
      : lang === "ja"
        ? `${mPlus2.className} font-extrabold`
        : "font-(family-name:--font-paperlogy)";
