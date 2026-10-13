"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { IconButton, PillButton } from "@/components/Buttons";
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

/** 저장된 내 닉네임 (없으면 "") — 버튼 누를 때 등 바로 읽기용 */
export const readNickname = read;

export function saveNickname(lang: MyLang, name: string | null) {
  try {
    if (name) localStorage.setItem(key(lang), name);
    else localStorage.removeItem(key(lang));
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만
  }
  window.dispatchEvent(new Event(CHANGE));
}

// ── 나라 · 가입 여부 (이 브라우저, 서버 전까지) ─────────────────────
const COUNTRY_KEY = "kfood:country";
const onboardedKey = (lang: MyLang) => `kfood:onboarded:${lang}`;

function readRaw(k: string) {
  try {
    return localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
}

function saveRaw(k: string, v: string | null) {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만
  }
  window.dispatchEvent(new Event(CHANGE));
}

/** 외국인 나라 (ISO 코드, 예: "CA") — 가입할 때 받음 */
export function useCountry() {
  return useSyncExternalStore(subscribe, () => readRaw(COUNTRY_KEY), () => "");
}
export const saveCountry = (code: string | null) => saveRaw(COUNTRY_KEY, code);

/** 처음 가입 환영 화면을 마쳤는지 (버튼 누를 때 바로 읽음) */
export const isOnboarded = (lang: MyLang) => readRaw(onboardedKey(lang)) === "1";
export const markOnboarded = (lang: MyLang, done: boolean) => saveRaw(onboardedKey(lang), done ? "1" : null);

/** 나라 이름 (영어) · 국기 이모지 */
export function countryName(code: string, lang: MyLang = "en") {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
export function countryFlag(code: string) {
  return code.length === 2 ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌍";
}

/**
 * 글쓴이(외국인)로 보이는 나 — 가입 때 정한 닉네임 · 나라 (내 글 상세·완료·공유 카드)
 * 나라를 아직 안 골랐으면(가입 전 예시) 캐나다
 */
export function useMyAuthor() {
  const name = useNickname("en");
  const code = useCountry() || "CA";
  return { name, flag: countryFlag(code), country: { en: countryName(code, "en"), ko: countryName(code, "ko") } };
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
    reroll: "New nickname",
    apply: "Use this nickname",
    same: "This is your nickname",
    account: "Google account",
    more: "More",
    closeMenu: "Close menu",
    logout: "Log out",
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
    reroll: "새 닉네임",
    apply: "이 닉네임으로 할래요",
    same: "지금 쓰는 닉네임이에요",
    account: "Google 계정",
    more: "더보기",
    closeMenu: "메뉴 닫기",
    logout: "로그아웃",
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

/**
 * 닉네임 슬롯 — ↻를 누르면 닉네임들이 위로 빠르게 지나가다가 살짝 넘쳤다 돌아오며 멈춤 (멈춘 뒤엔 움직임 없음)
 * 닉네임 시트와 가입 환영 화면에서 같이 씀. 멈춘 닉네임은 onChange로
 */
export function NicknameSlot({
  lang,
  value,
  onChange,
  onSpinningChange,
  from,
}: {
  lang: MyLang;
  value: string;
  onChange: (name: string) => void;
  onSpinningChange?: (spinning: boolean) => void;
  /** 분석용: 어디서 돌렸는지 */
  from: "profile" | "signup";
}) {
  const t = COPY[lang];
  const [reel, setReel] = useState<string[]>([value]);
  const [spins, setSpins] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const reelRef = useRef<HTMLDivElement>(null);

  // 바깥에서 값이 바뀌면(시트를 다시 열 때 등) 그 닉네임부터
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!spinning) setReel([value]);
  }

  const reroll = () => {
    if (spinning) return;
    const final = randomNickname(lang, value);
    const passing = Array.from({ length: REEL_SPINS }, () => randomNickname(lang));
    setReel([value, ...passing, final]);
    setSpinning(true);
    onSpinningChange?.(true);
    setSpins((n) => n + 1);
    track("nickname_rerolled", { viewer: lang === "en" ? "foreigner" : "korean", spins: spins + 1, from });
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
      setReel([final]);
      setSpinning(false);
      onSpinningChange?.(false);
      onChange(final);
      // 여기서 바로 cancel하면 릴이 하나로 바뀌어 그려지기 전 한 프레임 동안 맨 처음 닉네임으로 튀어 보임
      // → 그려지기 직전(다음 릴의 레이아웃 정리 단계)에 아래 return에서 정리
    };
    return () => anim.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 릴이 바뀔 때만 돌림
  }, [reel]);

  return (
    <div className="flex h-[72px] items-center gap-2 rounded-[24px] bg-surface-2 pl-5 pr-3">
      <div className="relative min-w-0 flex-1 overflow-hidden" style={{ height: REEL_H }}>
        <div ref={reelRef} className="flex flex-col">
          {reel.map((name, i) => (
            <span
              key={`${spins}-${i}`}
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
  );
}

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
  const [spinning, setSpinning] = useState(false);

  // 시트를 열 때마다 지금 닉네임부터
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setCandidate(nickname);
  }

  const changed = candidate !== nickname;

  return (
    <BottomSheet open={open} onClose={onClose} label={t.sheet}>
      <div className="flex w-full flex-col gap-3 px-4 pt-2">
        <h2 className="px-2 font-display text-[22px] leading-[1.25]">{t.title}</h2>
        <NicknameSlot lang={lang} value={candidate} onChange={setCandidate} onSpinningChange={setSpinning} from="profile" />
      </div>

      <div className="flex w-full">
        <PillButton
          tone={changed && !spinning ? "primary" : "disabled"}
          disabled={!changed || spinning}
          onClick={() => {
            saveNickname(lang, candidate);
            track("nickname_changed", { viewer: lang === "en" ? "foreigner" : "korean", from: "profile" });
            onClose();
          }}
        >
          {changed ? t.apply : t.same}
        </PillButton>
      </div>
    </BottomSheet>
  );
}

/** 마이 맨 아래 — Google 계정 · 계정 삭제 (회색 작은 글씨, 잘 안 보이게) */
/** 마이 맨 아래 회색 작은 글씨 — 로그인한 Google 계정 (계정 삭제는 오른쪽 위 ⋯ 메뉴로) */
export function AccountFooter({ lang, email }: { lang: MyLang; email: string }) {
  const t = COPY[lang];
  return (
    <p className="mt-16 px-6 text-center text-[12px] text-neutral-400">
      {t.account} · {email}
    </p>
  );
}

/**
 * 마이 오른쪽 위 ⋯ — 로그아웃 · 계정 삭제
 * 로그아웃은 쓰는 화면의 확인 시트(onLogout), 계정 삭제는 여기서 한 번 더 묻고 onDelete
 */
export function AccountMenu({ lang, onLogout, onDelete }: { lang: MyLang; onLogout: () => void; onDelete: () => void }) {
  const t = COPY[lang];
  const viewer = lang === "en" ? "foreigner" : "korean";
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);

  // 메뉴는 Esc로 닫힘
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const items = [
    { icon: "log-out" as const, label: t.logout, danger: false, onClick: onLogout, item: "logout" },
    { icon: "trash" as const, label: t.delete, danger: true, onClick: () => setConfirm(true), item: "delete_account" },
  ];

  return (
    <>
      <IconButton
        icon="more"
        label={t.more}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          track("my_item_clicked", { item: "more", viewer });
          setOpen(true);
        }}
      />

      {open &&
        createPortal(
          <>
            <button
              type="button"
              aria-label={t.closeMenu}
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 animate-fade-in bg-black/50"
            />
            {/* 상세 화면 ⋯ 메뉴(PostMenu)와 같은 모양 */}
            <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+64px)] z-50 mx-auto flex w-full max-w-[430px] justify-end px-2">
              <div
                role="menu"
                className="pointer-events-auto flex w-fit origin-top-right animate-menu flex-col gap-0.5 rounded-[24px] bg-surface p-1.5 text-on-dark shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
              >
                {items.map((it) => (
                  <button
                    key={it.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      track("my_item_clicked", { item: it.item, viewer });
                      setOpen(false);
                      it.onClick();
                    }}
                    className={`flex h-12 w-[184px] items-center gap-3 rounded-[18px] px-3 text-[14px] font-bold leading-[1.3] hover:bg-surface-2 ${
                      it.danger ? "text-error" : ""
                    }`}
                  >
                    <Icon name={it.icon} size={20} />
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}

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
              track("account_deleted", { viewer });
              saveNickname(lang, null);
              markOnboarded(lang, false);
              if (lang === "en") saveCountry(null);
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
