"use client";

import { compactCount } from "@/lib/format";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PillButton } from "@/components/Buttons";
import { Icon, type IconName } from "@/components/Icon";
import { BottomSheet } from "@/components/Layout";
import type { UiLang } from "@/app/posts/[id]/viewerLang";

/*
  마이 화면 공통 부품 (외국인 /my/en · 한국인 /my, 담당 송희)
  두 화면이 같은 구조: 프로필 → 탭 2개 → 사진 타일 / 한마디 카드 → 오른쪽 위 로그아웃
*/
export type MyLang = "en" | "ko";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
export const TIME = { MIN, HOUR, DAY };

/**
 * 한마디 시간 (화면 언어) — 지난 시간으로 셈 (달력 날짜 X)
 *   1분 안 방금/Just now/刚刚/たった今 · 1시간 안 5분 전/5m/5分钟前/5分前 · 24시간 안 3시간 전/3h/3小时前/3時間前
 *   · 48시간 안 어제/Yesterday/昨天/昨日 · 7일 안 3일 전/3d/3天前/3日前
 *   · 올해 9/4 (한·중·일 월/일) · Sep 4 (영어) · 작년 이전 2025/9/4 · Sep 4, 2025
 * 영어를 9/4/2025 처럼 숫자로만 쓰지 않는 이유: 미국은 월/일, 영국·호주 등은 일/월이라 9/4가 4월 9일로 읽힘
 */
const AGO: Record<UiLang, { now: string; min: (n: number) => string; hour: (n: number) => string; yesterday: string; day: (n: number) => string }> = {
  en: { now: "Just now", min: (n) => `${n}m`, hour: (n) => `${n}h`, yesterday: "Yesterday", day: (n) => `${n}d` },
  ko: { now: "방금", min: (n) => `${n}분 전`, hour: (n) => `${n}시간 전`, yesterday: "어제", day: (n) => `${n}일 전` },
  zh: { now: "刚刚", min: (n) => `${n}分钟前`, hour: (n) => `${n}小时前`, yesterday: "昨天", day: (n) => `${n}天前` },
  ja: { now: "たった今", min: (n) => `${n}分前`, hour: (n) => `${n}時間前`, yesterday: "昨日", day: (n) => `${n}日前` },
};
export function timeAgo(at: number, now: number, lang: UiLang) {
  const t = AGO[lang];
  const d = now - at;
  if (d < MIN) return t.now;
  if (d < HOUR) return t.min(Math.floor(d / MIN));
  if (d < DAY) return t.hour(Math.floor(d / HOUR));
  if (d < 2 * DAY) return t.yesterday;
  if (d < 7 * DAY) return t.day(Math.floor(d / DAY));
  const date = new Date(at);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const sameYear = y === new Date(now).getFullYear();
  if (lang === "en") {
    const mon = date.toLocaleDateString("en-US", { month: "short" });
    return sameYear ? `${mon} ${day}` : `${mon} ${day}, ${y}`;
  }
  return sameYear ? `${m}/${day}` : `${y}/${m}/${day}`;
}

/** 탭 2개 (이름 + 개수) */
export function MyTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  lang = "en",
}: {
  tabs: readonly (readonly [T, string, number])[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  /** 숫자 표시 언어 (1.2만 · 12K) */
  lang?: UiLang;
}) {
  return (
    <div className="px-2">
      <div role="tablist" aria-label={label} className="flex rounded-full bg-surface-2 p-1">
        {tabs.map(([id, text, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={value === id}
            onClick={() => value !== id && onChange(id)}
            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[15px] font-bold transition ${
              value === id ? "bg-on-dark text-on-light" : "text-neutral-400"
            }`}
          >
            {text}
            {/* 숫자는 앱 공통 규칙 (9,999 · 1.2만) */}
            <span className={`tabular-nums ${value === id ? "opacity-50" : ""}`}>{compactCount(n, lang)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** 빈 상태 — 카드 없이 문구 + 중간 크기 버튼 */
/** 빈 화면 버튼 모양 — PillButton md primary와 같음 (다른 동작의 버튼에 같은 모양을 입힐 때) */
export const EMPTY_CTA =
  "flex h-12 flex-none items-center justify-center rounded-full bg-primary px-6 text-[15px] leading-[1.5] font-semibold text-on-light transition active:scale-[0.99]";

/**
 * 빈 화면 (마이의 모든 탭 · 한국인/외국인 공통) — 안내 글 + 분홍 버튼 하나
 * 버튼은 여기서 그려서 탭마다 색·크기·간격이 달라지지 않게 함
 * action: 이동 링크(href) 또는 직접 만든 버튼(render — 로그인 흐름이 있는 Share 버튼 등, 모양은 EMPTY_CTA)
 */
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; href: string; onClick?: () => void } | { render: (className: string) => ReactNode };
}) {
  return (
    // 안내 글과 버튼 사이 48px (붙어 보이지 않게)
    <div className="flex flex-col items-center gap-12 px-6 pt-14 text-center break-keep">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="text-[14px] leading-[1.5] text-muted">{body}</p>
      </div>
      {action &&
        ("render" in action ? (
          action.render(EMPTY_CTA)
        ) : (
          <PillButton tone="primary" size="md" href={action.href} onClick={action.onClick}>
            {action.label}
          </PillButton>
        ))}
    </div>
  );
}

/** 2열 사진 타일 — 사진 · 왼쪽 아래 칩 · 제목 2줄 */
export function PhotoTile({
  href,
  onClick,
  photo,
  chip,
  chipStrong = false,
  chipIcon,
  title,
}: {
  href: string;
  onClick: () => void;
  photo?: string;
  chip: string;
  /** 노란 칩 (받은 투표가 있을 때 등) */
  chipStrong?: boolean;
  /** 칩 앞 아이콘 (예: 내 선택 ✓) — 글자 대신 써서 칸을 아낌 */
  chipIcon?: IconName;
  title: string;
}) {
  return (
    // 카드 테두리 없이 사진 + 제목 (사진이 주인공) — 사진 모서리와 제목 왼쪽 끝을 맞춤
    <Link href={href} onClick={onClick} className="flex min-w-0 flex-col gap-2.5 transition active:scale-[0.98]">
      <span className="relative aspect-square overflow-hidden rounded-[24px] bg-surface-2">
        {photo ? (
          <Image src={photo} alt="" fill sizes="200px" unoptimized={photo.startsWith("blob:")} className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-muted">
            <Icon name="image" size={28} />
          </span>
        )}
        {/* 칩: 한 줄, 길면 … (선택지는 최대 28자라 다 못 보여 줌 — 전체는 상세에서) */}
        <span
          className={`absolute bottom-3 left-3 flex max-w-[calc(100%-24px)] items-center gap-1 rounded-full py-1.5 pr-3 text-[12px] leading-none font-bold tabular-nums ${
            chipIcon ? "pl-2" : "pl-3"
          } ${chipStrong ? "bg-content text-on-light" : "bg-background/80 text-on-dark"}`}
        >
          {chipIcon && <Icon name={chipIcon} size={14} strokeWidth={3} className="shrink-0" />}
          <span className="min-w-0 truncate">{chip}</span>
        </span>
      </span>
      {/* 제목: 2줄까지, 길면 … */}
      <span className="line-clamp-2 break-keep px-1 text-[15px] font-semibold leading-[1.35]">{title}</span>
    </Link>
  );
}

const CARD_MASK = {
  maskImage: "url(/images/card-mask.svg)",
  WebkitMaskImage: "url(/images/card-mask.svg)",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
} as const;

/**
 * 한마디 카드 — 알림함과 같은 모양: 왼쪽 그 글 사진 · 한마디 2줄 + 시간 · 어느 글
 * href가 없으면(글이 지워짐) 누를 수 없고 화살표도 없음
 */
export function CommentCard({
  href,
  onClick,
  photo,
  text,
  time,
  where,
}: {
  href?: string;
  onClick?: () => void;
  photo?: string;
  text: string;
  time: string;
  where: string;
}) {
  const body = (
    <>
      <span className="relative size-12 shrink-0 bg-surface-2" style={CARD_MASK} aria-hidden="true">
        {photo && <Image src={photo} alt="" fill sizes="48px" unoptimized={photo.startsWith("blob:")} className="object-cover" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-start gap-2">
          {/* 2줄까지 …, 띄어쓰기 없는 긴 단어도 칸 안에서 줄바꿈 (시간 아래로 파고들지 않게) */}
          <span className="line-clamp-2 min-w-0 flex-1 break-keep text-[15px] font-semibold leading-[1.4] [overflow-wrap:anywhere]">{text}</span>
          <span className="shrink-0 pt-0.5 text-[12px] font-medium tabular-nums text-muted">{time}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="line-clamp-1 min-w-0 flex-1 text-[13px] leading-[1.45] text-muted [overflow-wrap:anywhere]">{where}</span>
          {href && <Icon name="chevron-right" size={16} className="shrink-0 text-muted" />}
        </span>
      </span>
    </>
  );
  const card = "flex items-start gap-3.5 rounded-[24px] bg-surface py-4 pl-4 pr-3";
  return href ? (
    <Link href={href} onClick={onClick} className={`${card} transition active:scale-[0.99]`}>
      {body}
    </Link>
  ) : (
    <div className={card}>{body}</div>
  );
}

const LOGOUT = {
  en: {
    label: "Log out",
    title: "Log out?",
    body: "Your posts stay. Log in again with Google anytime.",
    cancel: "Cancel",
    ok: "Log out",
  },
  ko: {
    label: "로그아웃",
    title: "로그아웃할까요?",
    body: "투표와 한마디는 그대로 남아요. 언제든 Google로 다시 로그인할 수 있어요.",
    cancel: "취소",
    ok: "로그아웃",
  },
  zh: {
    label: "退出登录",
    title: "要退出登录吗？",
    body: "你的记录都会保留。随时可以用 Google 重新登录。",
    cancel: "取消",
    ok: "退出登录",
  },
  ja: {
    label: "ログアウト",
    title: "ログアウトしますか？",
    body: "これまでの記録はそのまま残ります。いつでも Google で再ログインできます。",
    cancel: "キャンセル",
    ok: "ログアウト",
  },
} satisfies Record<UiLang, Record<string, string>>;

/** 로그아웃 확인 시트 */
export function LogoutSheet({
  open,
  onClose,
  onConfirm,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** 화면 언어 */
  lang: UiLang;
}) {
  const t = LOGOUT[lang];
  return (
    <BottomSheet open={open} onClose={onClose} label={t.label}>
      <div className="flex w-full flex-col gap-2 px-6 pt-2 break-keep">
        <h2 className="font-display text-[22px] leading-[1.25]">{t.title}</h2>
        <p className="text-[15px] leading-[1.5] text-muted">{t.body}</p>
      </div>
      <div className="flex w-full gap-1">
        <PillButton tone="soft" onClick={onClose}>
          {t.cancel}
        </PillButton>
        <PillButton tone="black" onClick={onConfirm}>
          {t.ok}
        </PillButton>
      </div>
    </BottomSheet>
  );
}
