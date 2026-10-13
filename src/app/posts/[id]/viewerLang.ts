"use client";

import { useSyncExternalStore } from "react";
import type { Lang } from "./copy";

/*
  외국인이 상세·한마디 화면에서 고른 언어 (이 브라우저에 저장)
  상세 화면에서 지구본으로 바꾸면 한마디 전체 화면·말풍선 모달도 같은 언어로 열리고, 그 반대도 같습니다.
  기본값은 영어. 자동 번역(기본 켬)은 LanguagePicker의 useAutoTranslate()가 따로 기억합니다.
*/
const KEY = "kfood:viewer-lang";
const EVENT = "kfood:viewer-lang-change";

function read(): Lang {
  try {
    return localStorage.getItem(KEY) === "ko" ? "ko" : "en";
  } catch {
    return "en";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function saveViewerLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // 저장이 막힌 브라우저면 이번 화면에서만 바뀌지 않음
  }
  window.dispatchEvent(new Event(EVENT));
}

/** 외국인 화면 언어 — 고른 적 없으면 영어 */
export function useViewerLang() {
  return useSyncExternalStore(subscribe, read, () => "en" as Lang);
}

/*
  한국인 상세 화면에서 지구본으로 고른 언어 (기본 한국어). 외국인 쪽과 따로 기억합니다.
  화면 문구는 이 언어로 바뀌고, 글·한마디는 원어 그대로 — 자동 번역이 켜져 있으면 이 언어로 번역해 보여 줌.
*/
const KO_KEY = "kfood:korean-lang";
const readKo = (): Lang => {
  try {
    return localStorage.getItem(KO_KEY) === "en" ? "en" : "ko";
  } catch {
    return "ko";
  }
};

export function saveKoreanLang(lang: Lang) {
  try {
    localStorage.setItem(KO_KEY, lang);
  } catch {
    // 저장이 막힌 브라우저면 이번 화면에서만 바뀌지 않음
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useKoreanLang() {
  return useSyncExternalStore(subscribe, readKo, () => "ko" as Lang);
}
