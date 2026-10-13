"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { PillButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { BottomSheet } from "@/components/Layout";
import { track } from "@/lib/analytics";
import type { MyLang } from "./parts";

/*
  마이 프로필 — 닉네임 (담당 송희)
  - 이름은 Google 실명 대신 랜덤 닉네임. 처음 마이를 열 때 하나 정해 줌
  - 직접 입력은 없음. 프로필 시트에서 🔄를 누르면 슬롯머신처럼 닉네임이 띠로로롱 돌다가 띠용 하고 멈춤 → 마음에 들면 적용
  - 닉네임 옆 › → 닉네임 시트 (닉네임 바꾸기만)
  - Google 계정 · 계정 삭제는 마이 맨 아래에 회색 작은 글씨 (AccountFooter) — 잘 안 보이게
  서버 전까지: 닉네임은 이 브라우저에 저장, 이메일은 목업
*/

// 닉네임 재료 — 음식 · 참견 테마 (형용사 + 명사)
const WORDS = {
  en: {
    adj: ["Spicy", "Cheesy", "Crispy", "Saucy", "Sizzling", "Garlicky", "Tangy", "Smoky", "Chewy", "Fiery", "Umami", "Sweet"],
    noun: ["Judge", "Critic", "Taster", "Foodie", "Chopsticks", "Dumpling", "Kimchi", "Noodle", "Mandu", "Tteok", "Bibim", "Gochu"],
  },
  ko: {
    adj: ["매운맛", "바삭한", "쫄깃한", "깐깐한", "배고픈", "꼬들꼬들", "단짠단짠", "진지한", "국물 진한", "치즈 듬뿍", "맵찔이", "새벽의"],
    noun: ["참견러", "판사", "미식가", "젓가락", "떡볶이", "만두", "김치", "국밥러", "훈수꾼", "라면왕", "비빔이", "평론가"],
  },
};

export function randomNickname(lang: MyLang, not?: string): string {
  const w = WORDS[lang];
  for (;;) {
    const name = `${w.adj[Math.floor(Math.random() * w.adj.length)]} ${w.noun[Math.floor(Math.random() * w.noun.length)]}`;
    if (name !== not) return name;
  }
}

// ── 닉네임 저장 (이 브라우저) ─────────────────────
const key = (lang: MyLang) => `kfood:nickname:${lang}`;
const CHANGE = "kfood:nickname-change";

function subscribe(on: () => void) {
  window.addEventListener("storage", on);
  window.addEventListener(CHANGE, on);
  return () => {
    window.removeEventListener("storage", on);
    window.removeEventListener(CHANGE, on);
  };
}

function read(lang: MyLang) {
  try {
    return localStorage.getItem(key(lang)) ?? "";
  } catch {
    return "";
  }
}

export function saveNickname(lang: MyLang, name: string | null) {
  try {
    if (name) localStorage.setItem(key(lang), name);
    else localStorage.removeItem(key(lang));
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만
  }
  window.dispatchEvent(new Event(CHANGE));
}

/** 내 닉네임 — 없으면 처음 열 때 랜덤으로 정해 저장 (서버에서 그린 첫 화면은 빈 값) */
export function useNickname(lang: MyLang) {
  const name = useSyncExternalStore(subscribe, () => read(lang), () => "");
  useEffect(() => {
    if (!read(lang)) saveNickname(lang, randomNickname(lang));
  }, [lang]);
  return name;
}

const COPY = {
  en: {
    edit: "Edit profile",
    sheet: "Profile",
    title: "Your nickname",
    hint: "Tap ↻ to get a new random nickname.",
    reroll: "New nickname",
    apply: "Use this nickname",
    same: "This is your nickname",
    account: "Google account",
    delete: "Delete account",
    delTitle: "Delete your account?",
    delBody: "Your posts and comments will be deleted. This can't be undone.",
    cancel: "Cancel",
    delOk: "Delete",
  },
  ko: {
    edit: "프로필 수정",
    sheet: "프로필",
    title: "내 닉네임",
    hint: "↻를 누르면 새 닉네임이 나와요.",
    reroll: "새 닉네임",
    apply: "이 닉네임으로 할래요",
    same: "지금 쓰는 닉네임이에요",
    account: "Google 계정",
    delete: "계정 삭제",
    delTitle: "계정을 삭제할까요?",
    delBody: "투표와 한마디가 모두 사라지고, 되돌릴 수 없어요.",
    cancel: "취소",
    delOk: "삭제하기",
  },
};

/** 마이 맨 위 — 닉네임 › (누르면 프로필 시트) + 나라 */
export function ProfileHeader({
  lang,
  nickname,
  line,
  onOpen,
}: {
  lang: MyLang;
  nickname: string;
  line?: string;
  onOpen: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-6 pt-2 pb-6">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${COPY[lang].edit}: ${nickname}`}
        className="flex min-h-[35px] items-center gap-1 self-start text-left transition active:scale-[0.98]"
      >
        <span className="font-display text-[32px] leading-[1.1] break-keep">{nickname}</span>
        {nickname && <Icon name="chevron-right" size={24} className="shrink-0 text-muted" />}
      </button>
      {line && <p className="text-[15px] text-muted">{line}</p>}
    </div>
  );
}

const REEL_H = 44; // 슬롯 한 칸 높이
const REEL_SPINS = 12; // 멈추기 전에 지나가는 닉네임 수

/** 닉네임 시트 — 슬롯으로 새 랜덤 닉네임 고르기 */
export function ProfileSheet({
  open,
  onClose,
  lang,
  nickname,
}: {
  open: boolean;
  onClose: () => void;
  lang: MyLang;
  nickname: string;
}) {
  const t = COPY[lang];
  const [candidate, setCandidate] = useState(nickname);
  const [reel, setReel] = useState<string[]>([nickname]);
  const [spins, setSpins] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const reelRef = useRef<HTMLDivElement>(null);

  // 시트를 열 때마다 지금 닉네임부터
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCandidate(nickname);
      setReel([nickname]);
      setSpinning(false);
    }
  }

  // 🔄 → 닉네임들이 위로 빠르게 지나가다가 살짝 넘쳤다 돌아오며(띠용) 멈춤
  const reroll = () => {
    if (spinning) return;
    const final = randomNickname(lang, candidate);
    const passing = Array.from({ length: REEL_SPINS }, () => randomNickname(lang));
    setReel([candidate, ...passing, final]);
    setSpinning(true);
    setSpins((n) => n + 1);
    track("nickname_rerolled", { viewer: lang === "en" ? "foreigner" : "korean", spins: spins + 1 });
  };

  useLayoutEffect(() => {
    const el = reelRef.current;
    if (!el || reel.length < 2) return;
    const end = -(reel.length - 1) * REEL_H;
    const anim = el.animate(
      [
        { transform: "translateY(0)", filter: "blur(0)" },
        { filter: "blur(1.5px)", offset: 0.2 },
        { filter: "blur(1.5px)", offset: 0.7 },
        { transform: `translateY(${end - 10}px)`, filter: "blur(0)", offset: 0.88 },
        { transform: `translateY(${end}px)` },
      ],
      { duration: 1300, easing: "cubic-bezier(0.15, 0.6, 0.3, 1)", fill: "forwards" },
    );
    anim.onfinish = () => {
      const final = reel[reel.length - 1];
      setCandidate(final);
      setReel([final]);
      setSpinning(false);
      anim.cancel();
    };
    return () => anim.cancel();
  }, [reel]);

  // 멈춘 닉네임이 톡 튀어나옴
  const landed = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (spinning || spins === 0) return;
    landed.current?.animate([{ scale: "1" }, { scale: "1.12" }, { scale: "1" }], {
      duration: 320,
      easing: "cubic-bezier(0.3, 1.6, 0.5, 1)",
    });
  }, [spinning, spins]);

  const changed = candidate !== nickname;

  return (
    <>
      <BottomSheet open={open} onClose={onClose} label={t.sheet}>
        <div className="flex w-full flex-col gap-3 px-4 pt-2">
          <h2 className="px-2 font-display text-[22px] leading-[1.25]">{t.title}</h2>
          {/* 슬롯 */}
          <div className="flex h-[72px] items-center gap-2 rounded-[24px] bg-surface-2 pl-5 pr-3">
            <div className="relative min-w-0 flex-1 overflow-hidden" style={{ height: REEL_H }}>
              <div ref={reelRef} className="flex flex-col">
                {reel.map((name, i) => (
                  <span
                    key={`${spins}-${i}`}
                    ref={reel.length === 1 ? landed : undefined}
                    className="flex shrink-0 items-center truncate font-display text-[24px] leading-none break-keep"
                    style={{ height: REEL_H }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={reroll}
              disabled={spinning}
              aria-label={t.reroll}
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-on-dark text-on-light transition active:scale-90 disabled:opacity-60"
            >
              <span className={spinning ? "animate-spin [animation-duration:600ms]" : ""}>
                <Icon name="refresh" size={22} />
              </span>
            </button>
          </div>
          <p className="px-2 text-[13px] leading-[1.4] text-muted break-keep">{t.hint}</p>
        </div>

        <div className="flex w-full">
          <PillButton
            tone={changed && !spinning ? "primary" : "disabled"}
            disabled={!changed || spinning}
            onClick={() => {
              saveNickname(lang, candidate);
              track("nickname_changed", { viewer: lang === "en" ? "foreigner" : "korean", spins });
              onClose();
            }}
          >
            {changed ? t.apply : t.same}
          </PillButton>
        </div>
      </BottomSheet>
    </>
  );
}

/** 마이 맨 아래 — Google 계정 · 계정 삭제 (회색 작은 글씨, 잘 안 보이게) */
export function AccountFooter({ lang, email, onDelete }: { lang: MyLang; email: string; onDelete: () => void }) {
  const t = COPY[lang];
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <div className="mt-16 flex flex-col items-center gap-2 px-6 text-center text-[12px] text-neutral-400">
        <p>
          {t.account} · {email}
        </p>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="px-2 py-1 underline underline-offset-2 transition active:opacity-70"
        >
          {t.delete}
        </button>
      </div>

      {/* 계정 삭제 확인 */}
      <BottomSheet open={confirm} onClose={() => setConfirm(false)} label={t.delete}>
        <div className="flex w-full flex-col gap-2 px-6 pt-2 break-keep">
          <h2 className="font-display text-[22px] leading-[1.25]">{t.delTitle}</h2>
          <p className="text-[15px] leading-[1.5] text-muted">{t.delBody}</p>
        </div>
        <div className="flex w-full gap-1">
          <PillButton tone="soft" onClick={() => setConfirm(false)}>
            {t.cancel}
          </PillButton>
          <PillButton
            tone="error"
            onClick={() => {
              track("account_deleted", { viewer: lang === "en" ? "foreigner" : "korean" });
              saveNickname(lang, null);
              setConfirm(false);
              onDelete();
            }}
          >
            {t.delOk}
          </PillButton>
        </div>
      </BottomSheet>
    </>
  );
}
