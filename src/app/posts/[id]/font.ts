import localFont from "next/font/local";

// 상세 제목용 Paperlogy ExtraBold (SIL OFL 1.1, 이주임 — 눈누 배포본)
export const paperlogy = localFont({
  src: "./Paperlogy-8ExtraBold.woff2",
  weight: "800",
  variable: "--font-paperlogy",
  display: "swap",
});

/** Paperlogy 자리의 글꼴 — 영어 화면이면 Gilroy ExtraBold(font-display), 한국어면 Paperlogy */
export const titleFont = (lang: "ko" | "en") => (lang === "en" ? "font-display" : "font-(family-name:--font-paperlogy)");
