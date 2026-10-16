import { Noto_Sans_JP, Noto_Sans_SC } from "next/font/google";
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
  중국어·일본어 제목 글꼴 — Paperlogy·Gilroy에는 한자·가나가 없어서, 같은 굵기(800)의 깔끔한 고딕을 Google Fonts에서
  - preload: false → 미리 받지 않고, 중·일 글자가 화면에 나올 때만 받음
  - 글자 범위별로 잘게 나뉜 파일이라, 화면에 실제로 나온 글자가 든 조각만 받음 (전체 수 MB를 한 번에 받지 않음)
*/
export const notoSansSC = Noto_Sans_SC({ weight: "800", preload: false, display: "swap" });
export const notoSansJP = Noto_Sans_JP({ weight: "800", preload: false, display: "swap" });

/** Paperlogy 자리의 글꼴 — 영어 Gilroy(font-title-en, 한글과 크기가 맞게 보정) · 한국어 Paperlogy · 중국어 Noto Sans SC · 일본어 Noto Sans JP (모두 800) */
export const titleFont = (lang: UiLang) =>
  lang === "en"
    ? "font-title-en"
    : lang === "zh"
      ? `${notoSansSC.className} font-extrabold`
      : lang === "ja"
        ? `${notoSansJP.className} font-extrabold`
        : "font-(family-name:--font-paperlogy)";
