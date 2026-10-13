"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PillButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { BottomSheet } from "@/components/Layout";

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
 * 한마디 시간
 *   1분 안 Just now/방금 · 1시간 안 5m/5분 전 · 오늘 3h/3시간 전 · 어제 Yesterday/어제
 *   · 7일 안 3d/3일 전 · 올해 Sep 3/9월 3일 · 작년 이전 Sep 8, 2025/2025년 9월 8일
 */
export function timeAgo(at: number, now: number, lang: MyLang) {
  const ko = lang === "ko";
  const d = now - at;
  if (d < MIN) return ko ? "방금" : "Just now";
  if (d < HOUR) return ko ? `${Math.floor(d / MIN)}분 전` : `${Math.floor(d / MIN)}m`;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (at >= today.getTime()) return ko ? `${Math.floor(d / HOUR)}시간 전` : `${Math.floor(d / HOUR)}h`;
  if (at >= today.getTime() - DAY) return ko ? "어제" : "Yesterday";
  if (d < 7 * DAY) return ko ? `${Math.floor(d / DAY)}일 전` : `${Math.floor(d / DAY)}d`;
  const date = new Date(at);
  const sameYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString(ko ? "ko-KR" : "en-US", {
    month: ko ? "long" : "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** 탭 2개 (이름 + 개수) */
export function MyTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: readonly (readonly [T, string, number])[];
  value: T;
  onChange: (id: T) => void;
  label: string;
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
            <span className={`tabular-nums ${value === id ? "opacity-50" : ""}`}>{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** 빈 상태 — 카드 없이 문구 + 중간 크기 버튼 */
export function Empty({ title, body, cta }: { title: string; body: string; cta?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-5 px-6 pt-14 text-center break-keep">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="text-[14px] leading-[1.5] text-muted">{body}</p>
      </div>
      {cta}
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
  title,
}: {
  href: string;
  onClick: () => void;
  photo?: string;
  chip: string;
  /** 노란 칩 (받은 투표가 있을 때 등) */
  chipStrong?: boolean;
  title: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex flex-col gap-2 rounded-[24px] bg-surface p-2 pb-3 transition active:scale-[0.98]"
    >
      <span className="relative aspect-square overflow-hidden rounded-[18px] bg-surface-2">
        {photo ? (
          <Image src={photo} alt="" fill sizes="200px" unoptimized={photo.startsWith("blob:")} className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-muted">
            <Icon name="image" size={28} />
          </span>
        )}
        <span
          className={`absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums ${
            chipStrong ? "bg-content text-on-light" : "bg-background/80 text-on-dark"
          }`}
        >
          {chip}
        </span>
      </span>
      <span className="line-clamp-2 break-keep px-1 text-[14px] font-semibold leading-[1.35]">{title}</span>
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
          <span className="line-clamp-2 min-w-0 flex-1 break-keep text-[15px] font-semibold leading-[1.4]">{text}</span>
          <span className="shrink-0 pt-0.5 text-[12px] font-medium tabular-nums text-muted">{time}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="line-clamp-1 min-w-0 flex-1 text-[13px] leading-[1.45] text-muted">{where}</span>
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
};

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
  lang: MyLang;
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
