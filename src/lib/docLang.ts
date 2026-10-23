"use client";

import { useEffect } from "react";

/*
  화면 언어를 html lang 에 적음 — 본문 글꼴이 언어별로 바뀜 (globals.css 의 html:lang)
  영어 Inter · 일본어 M PLUS 2 · 중국어 간체 MiSans (한국어는 Pretendard 그대로)
  화면을 떠나면 한국어(기본)로 되돌림 — 이 훅을 안 쓰는 화면은 한국어 글꼴
*/
const TAG: Record<string, string> = { ko: "ko", en: "en", ja: "ja", zh: "zh-Hans" };

export function useDocLang(lang: string) {
  useEffect(() => {
    document.documentElement.lang = TAG[lang] ?? "ko";
    return () => {
      document.documentElement.lang = "ko";
    };
  }, [lang]);
}
