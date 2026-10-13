"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";
import { HEADER_BUTTON, PageHeader } from "@/components/PageHeader";
import { track } from "@/lib/analytics";
import { rememberRole } from "@/lib/role";

/*
  언어 변경 (Figma 378:10854) — 모든 화면 상단의 지구본 버튼과, 누르면 뜨는 언어 고르기 창.
  사용: 헤더에 <LanguageButton lang="ko" from="detail" /> 하나만 넣으면 됩니다.
  그 화면 글자만 바꾸려면 onChange를 주세요 → 메인으로 가지 않고 onChange(고른 언어)를 부른 뒤 창을 닫습니다.
  - 한국어·영어를 고르면 그 언어의 메인(/home, /home?lang=en)으로 갑니다. 지금 언어를 고르면 창만 닫힙니다.
  - 중국어·일본어는 아직 화면이 없어서 "곧 지원할게요"를 잠깐 보여 줍니다.
  - 창은 다른 화면처럼 가운데 430px 틀 안에만 뜹니다.
  - 창 하단에서 자동 번역을 켜고 끌 수 있습니다. 화면에서는 useAutoTranslate()로 읽습니다 (기본: 켬).
*/

/* ── 자동 번역 설정 (이 브라우저에 저장) ── */
const AUTO_TRANSLATE_KEY = "kfood:auto-translate";
const AUTO_TRANSLATE_EVENT = "kfood:auto-translate-change";

function readAutoTranslate() {
  try {
    return localStorage.getItem(AUTO_TRANSLATE_KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribeAutoTranslate(onChange: () => void) {
  window.addEventListener(AUTO_TRANSLATE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTO_TRANSLATE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setAutoTranslate(on: boolean) {
  try {
    localStorage.setItem(AUTO_TRANSLATE_KEY, on ? "on" : "off");
  } catch {
    // 저장이 막힌 브라우저면 이번 화면에서만 바뀌지 않음
  }
  window.dispatchEvent(new Event(AUTO_TRANSLATE_EVENT));
}

/** 자동 번역이 켜져 있는지 — 다른 언어로 쓴 글·한마디를 내 언어로 보여 줄지 정할 때 씁니다. */
export function useAutoTranslate() {
  return useSyncExternalStore(subscribeAutoTranslate, readAutoTranslate, () => true);
}

export type ServiceLang = "ko" | "en";
/** 고를 수 있는 언어 전체 (중국어·일본어는 지금 랜딩에서만, 송희) */
export type PickLang = ServiceLang | "zh" | "ja";

type Option = { id: string; flag: string; ko: string; en: string; href?: string };

const OPTIONS: Option[] = [
  { id: "ko", flag: "🇰🇷", ko: "한국어", en: "Korean", href: "/home" },
  { id: "en", flag: "🇺🇸", ko: "영어", en: "English", href: "/home?lang=en" },
  { id: "zh", flag: "🇨🇳", ko: "중국어", en: "Chinese" },
  { id: "ja", flag: "🇯🇵", ko: "일본어", en: "Japanese" },
];

/** 상단 지구본 버튼 — 누르면 언어 고르기 창이 뜹니다. from: 어느 화면에서 눌렀는지 (분석용) */
export function LanguageButton({
  lang,
  from,
  className = HEADER_BUTTON,
  onChange,
  onPick,
}: {
  lang: PickLang;
  from: string;
  className?: string;
  /** 랜딩처럼 중국어·일본어까지 네 언어 모두 그 자리에서 바꿀 때 (송희) — onChange보다 먼저 */
  onPick?: (lang: PickLang) => void;
  /** 있으면 언어를 골랐을 때 메인으로 가지 않고 이걸 부름 (그 화면 글자만 바꿀 때) */
  onChange?: (lang: ServiceLang) => void;
}) {
  const [open, setOpen] = useState(false);
  const en = lang !== "ko"; // 중국어·일본어 화면에서도 영어 문구 (송희)
  return (
    <>
      <button
        type="button"
        onClick={() => {
          track("language_clicked", { from, viewer: en ? "foreigner" : "korean" });
          setOpen(true);
        }}
        className={className}
        aria-label={en ? "Change language" : "언어 선택"}
        aria-haspopup="dialog"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
        <img src="/images/icon-world.svg" width={24} height={24} alt="" />
      </button>
      {open && <LanguagePicker lang={lang} from={from} onChange={onChange} onPick={onPick} onClose={() => setOpen(false)} />}
    </>
  );
}

function LanguagePicker({
  lang,
  from,
  onChange,
  onPick,
  onClose,
}: {
  lang: PickLang;
  from: string;
  onChange?: (lang: ServiceLang) => void;
  onPick?: (lang: PickLang) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const en = lang !== "ko"; // 중국어·일본어 화면에서도 영어 문구 (송희)
  const [soon, setSoon] = useState(false);
  const autoTranslate = useAutoTranslate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!soon) return;
    const t = window.setTimeout(() => setSoon(false), 2000);
    return () => window.clearTimeout(t);
  }, [soon]);

  const choose = (o: Option) => {
    track("language_clicked", {
      from: "language_picker",
      screen: from,
      viewer: en ? "foreigner" : "korean",
      selected: o.id,
      available: !!o.href,
    });
    // 랜딩(송희): 중국어·일본어도 "곧 지원" 없이 그 자리에서 바로
    if (onPick) {
      if (o.id !== lang) onPick(o.id as PickLang);
      return onClose();
    }
    if (!o.href) return setSoon(true);
    if (o.id === lang) return onClose();
    // 화면이 직접 언어를 바꾸는 경우(예: 한마디 화면) — 이동하지 않고 알려 준 뒤 창을 닫음
    if (onChange) {
      onChange(o.id as ServiceLang);
      return onClose();
    }
    rememberRole(o.id === "ko" ? "ko" : "en"); // 다음에 첫 화면(/)으로 와도 이 언어 메인으로 (송희)
    router.push(o.href);
  };

  return (
    // 바깥(430px 틀 밖)은 비워 두고 누르는 것만 막음
    <div className="fixed inset-0 z-40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={en ? "Change language" : "언어 변경"}
        className="relative mx-auto h-full w-full max-w-[430px] animate-[lang-fade_200ms_ease-out] bg-background/80 backdrop-blur-[8px]"
      >
        <PageHeader
          left={
            <button type="button" onClick={onClose} className={HEADER_BUTTON} aria-label={en ? "Close" : "닫기"}>
              <Icon name="x" />
            </button>
          }
        />

        {/* 언어 목록 + 자동 번역을 한 덩어리로 묶어 화면 가운데에 */}
        <div className="absolute top-1/2 left-1/2 flex w-[230px] -translate-x-1/2 -translate-y-1/2 flex-col gap-10">
          <ul className="flex flex-col gap-2">
            {OPTIONS.map((o, i) => {
              const selected = o.id === lang;
              return (
                <li
                  key={o.id}
                  className="animate-[lang-rise_320ms_cubic-bezier(0.2,0.8,0.2,1)_both]"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => choose(o)}
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-4 rounded-[32px] py-2.5 pr-5 pl-2.5 text-left transition-transform active:scale-[0.97] ${
                      selected ? "bg-secondary text-background" : "bg-surface-2 text-white"
                    }`}
                  >
                    <span
                      className={`flex size-[54px] shrink-0 items-center justify-center rounded-full text-[32px] leading-none ${
                        selected ? "bg-white" : "bg-background"
                      }`}
                      aria-hidden
                    >
                      {o.flag}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-(family-name:--font-paperlogy) text-[18px] leading-[1.3] tracking-[-0.36px]">
                        {o.ko}
                      </span>
                      <span className="font-display text-[22px] leading-[1.3] tracking-[-0.44px]">{o.en}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* 자동 번역 켬/끔 — 일본어 아래 40px */}
          <div className="flex animate-[lang-rise_320ms_cubic-bezier(0.2,0.8,0.2,1)_160ms_both] flex-col items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={autoTranslate}
              onClick={() => {
                track("auto_translate_toggled", { on: !autoTranslate, screen: from, viewer: en ? "foreigner" : "korean" });
                setAutoTranslate(!autoTranslate);
              }}
              className="flex w-full items-center gap-3 rounded-[32px] bg-surface-2 py-3 pr-3 pl-5 text-left text-white transition-transform active:scale-[0.97]"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-(family-name:--font-paperlogy) text-[16px] leading-[1.3] tracking-[-0.32px]">자동 번역</span>
                <span className="font-display text-[18px] leading-[1.3] tracking-[-0.36px]">Auto-translate</span>
              </span>
              {/* 스위치 */}
              <span
                aria-hidden
                className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200 ${autoTranslate ? "bg-secondary" : "bg-background"}`}
              >
                <span
                  className={`absolute top-[3px] left-[3px] size-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                    autoTranslate ? "translate-x-5" : ""
                  }`}
                />
              </span>
            </button>
            <p className="text-center text-[12px] leading-[1.4] break-keep text-muted">
              {en ? "Show posts and comments in your language" : "다른 언어로 쓴 글·한마디를 내 언어로 보여 줘요"}
            </p>
          </div>
        </div>

        {/* 중국어·일본어를 누르면 잠깐 알려 줌 */}
        <p
          role="status"
          className={`absolute bottom-[calc(40px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-surface-2 px-4 py-2.5 text-[14px] font-semibold whitespace-nowrap text-white transition-opacity duration-200 ${
            soon ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {soon ? (en ? "Coming soon" : "곧 지원할게요") : ""}
        </p>

      </div>

      <style>{`
        @keyframes lang-fade { from { opacity: 0 } }
        @keyframes lang-rise { from { opacity: 0; transform: translateY(12px) } }
      `}</style>
    </div>
  );
}
