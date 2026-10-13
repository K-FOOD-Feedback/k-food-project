"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { IconButton, PillButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { track } from "@/lib/analytics";
import type { MyLang } from "./parts";
import {
  countryFlag,
  countryName,
  markOnboarded,
  NicknameSlot,
  randomNickname,
  saveCountry,
  saveNickname,
} from "./profile";

/*
  처음 가입 환영 화면 (풀 팝업, 담당 송희) — Google 로그인 직후 처음 한 번만
  - 랜덤 닉네임 알려 주기 (↻ 슬롯으로 바꿀 수 있음)
  - 외국인만: 어느 나라에서 왔는지 (상세 화면 "from. 캐나다"·국기) — Google은 나라를 주지 않음
    기기 언어 설정의 지역으로 미리 골라 둠
  - 약관 동의: 전체 동의 + 펼쳐 보기 (만 14세 이상 · 이용약관 · 개인정보 수집·이용, 모두 필수)
  - 시작 → 원래 하려던 행동으로 (사진 고르기 / 투표)
  서버 전까지: 닉네임·나라·가입 여부는 이 브라우저에 저장
*/

// 나라 목록 (자주 쓰는 순 아님, 이름순으로 정렬해서 보여 줌). 한국은 외국인 화면이라 뺌
const COUNTRIES = [
  "US", "CA", "GB", "AU", "NZ", "IE", "FR", "DE", "ES", "IT", "PT", "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI",
  "PL", "CZ", "HU", "RO", "GR", "TR", "RU", "UA", "JP", "CN", "TW", "HK", "SG", "MY", "TH", "VN", "PH", "ID", "IN",
  "PK", "BD", "AE", "SA", "IL", "EG", "ZA", "NG", "KE", "MX", "BR", "AR", "CL", "CO", "PE",
];

const COPY = {
  en: {
    label: "Welcome",
    title: "Welcome! 👋",
    sub: "Just a few things before you start.",
    nickname: "Your nickname",
    nicknameHint: "This is how others see you. Tap ↻ for another one.",
    country: "Where are you from?",
    countryHint: "Koreans will see your flag next to your posts.",
    all: "Agree to all",
    items: ["I'm 14 or older", "Terms of Service", "Privacy Policy"],
    required: "Required",
    view: "View",
    start: "Let's go",
    close: "Close",
  },
  ko: {
    label: "가입 환영",
    title: "반가워요! 👋",
    sub: "시작하기 전에 두 가지만 확인할게요.",
    nickname: "내 닉네임",
    nicknameHint: "다른 사람에게 보이는 이름이에요. ↻로 바꿀 수 있어요.",
    country: "",
    countryHint: "",
    all: "전체 동의",
    items: ["만 14세 이상이에요", "이용약관 동의", "개인정보 수집·이용 동의"],
    required: "필수",
    view: "보기",
    start: "시작하기",
    close: "닫기",
  },
};

const LINKS = [null, "/terms", "/privacy"] as const;

/** 기기 언어 설정의 지역 (예: en-CA → CA). 목록에 없으면 미국 */
function guessCountry() {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    if (region && COUNTRIES.includes(region)) return region;
  } catch {
    // 알 수 없으면 기본값
  }
  return "US";
}

export function WelcomePopup({
  open,
  lang,
  onClose,
  onDone,
}: {
  open: boolean;
  lang: MyLang;
  /** × 로 닫음 (가입은 다음에 다시) */
  onClose: () => void;
  /** 시작 — 원래 하려던 행동으로 (사진 고르기 등은 이 클릭 안에서 열어야 브라우저가 막지 않음) */
  onDone: () => void;
}) {
  const t = COPY[lang];
  const foreigner = lang === "en";
  const [nickname, setNickname] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [country, setCountry] = useState("");
  const [agreed, setAgreed] = useState([false, false, false]);
  const [expanded, setExpanded] = useState(false);

  // 열 때마다 새로 (닉네임은 랜덤으로, 나라는 기기 설정에서)
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNickname(randomNickname(lang));
      setCountry(foreigner ? guessCountry() : "");
      setAgreed([false, false, false]);
      setExpanded(false);
    }
  }

  if (!open) return null;

  const allAgreed = agreed.every(Boolean);
  const canStart = allAgreed && !spinning && (!foreigner || !!country);
  const countries = [...COUNTRIES].sort((a, b) => countryName(a).localeCompare(countryName(b)));

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.label}
      className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] animate-sheet-up flex-col bg-background text-on-dark"
    >
      <div className="flex items-center px-2 pt-[calc(8px+env(safe-area-inset-top))]">
        <IconButton
          icon="x"
          label={t.close}
          onClick={() => {
            track("signup_closed", { viewer: foreigner ? "foreigner" : "korean" });
            onClose();
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 pt-2 pb-6 break-keep">
        <div className="flex flex-col gap-2 px-2">
          <h1 className="font-display text-[32px] leading-[1.1]">{t.title}</h1>
          <p className="text-[15px] leading-[1.5] text-muted">{t.sub}</p>
        </div>

        {/* 닉네임 */}
        <section className="flex flex-col gap-3">
          <h2 className="px-2 font-display text-[20px] leading-[1.2]">{t.nickname}</h2>
          {nickname && (
            <NicknameSlot lang={lang} value={nickname} onChange={setNickname} onSpinningChange={setSpinning} from="signup" />
          )}
          <p className="px-2 text-[13px] leading-[1.4] text-muted">{t.nicknameHint}</p>
        </section>

        {/* 나라 (외국인만) */}
        {foreigner && (
          <section className="flex flex-col gap-3">
            <h2 className="px-2 font-display text-[20px] leading-[1.2]">{t.country}</h2>
            <label className="relative flex h-14 items-center gap-3 rounded-[24px] bg-surface-2 px-5">
              <span className="text-[22px] leading-none" aria-hidden="true">
                {countryFlag(country)}
              </span>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label={t.country}
                className="min-w-0 flex-1 appearance-none bg-transparent text-[16px] font-semibold outline-none"
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {countryName(c)}
                  </option>
                ))}
              </select>
              <Icon name="chevron-right" size={18} className="rotate-90 text-muted" />
            </label>
            <p className="px-2 text-[13px] leading-[1.4] text-muted">{t.countryHint}</p>
          </section>
        )}
      </div>

      {/* 약관 동의 + 시작 */}
      <div className="flex flex-col gap-3 border-t border-white/10 px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="flex items-center rounded-[24px] bg-surface">
          <button
            type="button"
            role="checkbox"
            aria-checked={allAgreed}
            onClick={() => setAgreed(agreed.map(() => !allAgreed))}
            className="flex h-14 flex-1 items-center gap-3 pl-5 text-left text-[16px] font-bold"
          >
            <Check on={allAgreed} />
            {t.all}
          </button>
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={t.view}
            onClick={() => setExpanded((v) => !v)}
            className="flex size-14 shrink-0 items-center justify-center text-muted"
          >
            <Icon name="chevron-right" size={20} className={`transition ${expanded ? "-rotate-90" : "rotate-90"}`} />
          </button>
        </div>

        {expanded && (
          <ul className="flex animate-fade-in flex-col gap-1 px-2">
            {t.items.map((item, i) => (
              <li key={item} className="flex items-center">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={agreed[i]}
                  onClick={() => setAgreed(agreed.map((v, j) => (j === i ? !v : v)))}
                  className="flex h-11 flex-1 items-center gap-3 pl-3 text-left text-[14px]"
                >
                  <Check on={agreed[i]} small />
                  <span>
                    <span className="text-muted">({t.required})</span> {item}
                  </span>
                </button>
                {LINKS[i] && (
                  // 새 탭으로 (이 화면에서 고른 것들이 사라지지 않게)
                  <Link
                    href={LINKS[i]}
                    target="_blank"
                    className="shrink-0 px-3 py-2 text-[13px] text-muted underline underline-offset-2"
                  >
                    {t.view}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex">
          <PillButton
            tone={canStart ? "primary" : "disabled"}
            disabled={!canStart}
            onClick={() => {
              saveNickname(lang, nickname);
              if (foreigner) saveCountry(country);
              markOnboarded(lang, true);
              track("signup_completed", { viewer: foreigner ? "foreigner" : "korean", ...(foreigner && { country }) });
              onDone();
            }}
          >
            {t.start}
          </PillButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Check({ on, small = false }: { on: boolean; small?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full transition ${small ? "size-5" : "size-6"} ${
        on ? "bg-primary text-on-light" : "border-2 border-white/25"
      }`}
      aria-hidden="true"
    >
      {on && <Icon name="check" size={small ? 12 : 14} strokeWidth={3} />}
    </span>
  );
}
