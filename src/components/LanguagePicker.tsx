"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { HEADER_BUTTON, PageHeader } from "@/components/PageHeader";
import { track } from "@/lib/analytics";
import { rememberRole } from "@/lib/role";

/*
  언어 변경 (Figma 378:10854) — 모든 화면 상단의 지구본 버튼과, 누르면 뜨는 언어 고르기 창.
  사용: 헤더에 <LanguageButton lang="ko" from="detail" /> 하나만 넣으면 됩니다.
  - 한국어·영어를 고르면 그 언어의 메인(/home, /home/en)으로 갑니다. 지금 언어를 고르면 창만 닫힙니다.
  - 중국어·일본어는 아직 화면이 없어서 "곧 지원할게요"를 잠깐 보여 줍니다.
  - 창은 다른 화면처럼 가운데 430px 틀 안에만 뜹니다.
*/

export type ServiceLang = "ko" | "en";

type Option = { id: string; flag: string; ko: string; en: string; href?: string };

const OPTIONS: Option[] = [
  { id: "ko", flag: "🇰🇷", ko: "한국어", en: "Korean", href: "/home" },
  { id: "en", flag: "🇺🇸", ko: "영어", en: "English", href: "/home/en" },
  { id: "zh", flag: "🇨🇳", ko: "중국어", en: "Chinese" },
  { id: "ja", flag: "🇯🇵", ko: "일본어", en: "Japanese" },
];

/** 상단 지구본 버튼 — 누르면 언어 고르기 창이 뜹니다. from: 어느 화면에서 눌렀는지 (분석용) */
export function LanguageButton({
  lang,
  from,
  className = HEADER_BUTTON,
}: {
  lang: ServiceLang;
  from: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const en = lang === "en";
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
      {open && <LanguagePicker lang={lang} from={from} onClose={() => setOpen(false)} />}
    </>
  );
}

function LanguagePicker({ lang, from, onClose }: { lang: ServiceLang; from: string; onClose: () => void }) {
  const router = useRouter();
  const en = lang === "en";
  const [soon, setSoon] = useState(false);

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
    if (!o.href) return setSoon(true);
    if (o.id === lang) return onClose();
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

        <ul className="absolute top-1/2 left-1/2 flex w-[230px] -translate-x-1/2 -translate-y-1/2 flex-col gap-2">
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

        {/* 중국어·일본어를 누르면 잠깐 알려 줌 */}
        <p
          role="status"
          className={`absolute bottom-[calc(60px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-surface-2 px-4 py-2.5 text-[14px] font-semibold whitespace-nowrap text-white transition-opacity duration-200 ${
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
