"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { Screen, TopBar } from "@/components/Layout";
import { track, useTrackOnce } from "@/lib/analytics";
import { DATA, FILTERS, groupByDay, matchesFilter, type FilterId, type Lang, type Notif } from "./data";

/**
 * 인앱 알림함 (4. 알림, 담당 송희) — 외국인 /notifications/en · 한국인 /notifications
 * - 투표·댓글·답글이 달리는 즉시 쌓임 (지금은 화면을 열고 2.5초 뒤 하나 도착하는 연출)
 * - 날짜별로 나누고, 위 탭으로 투표/댓글만 골라 보기
 * - 같은 날 같은 글에 같은 종류가 이어지면 카드 더미로 묶고, 누르면 펼쳐 보기
 */
export function NotificationsScreen({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  const { incoming: INCOMING, list: NOTIFS } = DATA[lang];
  const [filter, setFilter] = useState<FilterId>("all");
  const [live, setLive] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [openStack, setOpenStack] = useState<Notif[] | null>(null);

  useTrackOnce("notifications_viewed", { unread: NOTIFS.filter((n) => !n.read).length, viewer: VIEWER[lang] });

  // 실시간 도착 연출 — 서버 연결 후 Supabase Realtime 구독으로 교체
  useEffect(() => {
    const t = window.setTimeout(() => setLive(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  const all = useMemo(
    () => (live ? [INCOMING, ...NOTIFS] : NOTIFS).map((n) => (readIds.has(n.id) ? { ...n, read: true } : n)),
    [live, readIds, INCOMING, NOTIFS],
  );
  const days = useMemo(() => groupByDay(all.filter((n) => matchesFilter(n, filter))), [all, filter]);
  const unreadOf = (f: FilterId) => all.filter((n) => !n.read && matchesFilter(n, f)).length;

  const markRead = (list: Notif[]) => setReadIds((prev) => new Set([...prev, ...list.map((n) => n.id)]));

  return (
    <Screen className="pb-16">
      <TopBar
        title={t.title}
        left={<IconButton icon="chevron-left" label={t.back} href={lang === "en" ? "/home/en" : "/home"} />}
        right={
          unreadOf("all") > 0 ? (
            <button
              type="button"
              onClick={() => markRead(all)}
              className="h-12 rounded-full px-4 text-[14px] font-semibold text-neutral-400 transition active:scale-95"
            >
              {t.readAll}
            </button>
          ) : null
        }
      />

      {/* 종류 탭 (외국인만 — 한국인은 대댓글 하나뿐) */}
      {lang === "en" && (
      <div
        role="tablist"
        aria-label={t.filterLabel}
        className="sticky top-[calc(80px+env(safe-area-inset-top))] z-20 flex gap-1.5 bg-background px-4 pb-3"
      >
        {FILTERS.map((f) => {
          const on = f.id === filter;
          const unread = unreadOf(f.id);
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setFilter(f.id);
                track("notification_filter_changed", { filter: f.id, viewer: VIEWER[lang] });
              }}
              className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition active:scale-95 ${
                on ? "bg-on-dark text-on-light" : "bg-surface text-neutral-400"
              }`}
            >
              {f.label}
              {unread > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                    on ? "bg-primary text-on-light" : "bg-primary/20 text-primary"
                  }`}
                >
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
      )}

      <div className="flex flex-col gap-7 px-4 pt-3">
        {days.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-24 text-center">
            <span className="text-[40px]" aria-hidden="true">
              🫥
            </span>
            <p className="text-[15px] font-semibold">{t.emptyTitle}</p>
            <p className="text-[14px] text-muted">{t.emptyBody}</p>
          </div>
        )}
        {days.map(({ day, stacks }) => (
          <section key={day} className="flex flex-col gap-3">
            <h2 className="px-1 text-[13px] font-semibold text-muted">{day}</h2>
            {stacks.map((stack) => (
              <Stack
                key={stack[0].id}
                lang={lang}
                stack={stack}
                fresh={stack[0].id === INCOMING.id}
                onOpen={() => {
                  track("notification_stack_opened", { type: stack[0].type, count: stack.length });
                  setOpenStack(stack);
                }}
                onRead={() => markRead(stack)}
              />
            ))}
          </section>
        ))}
      </div>

      {openStack && (
        <StackOverlay
          lang={lang}
          stack={openStack}
          onClose={() => setOpenStack(null)}
          onRead={(n) => markRead([n])}
        />
      )}
    </Screen>
  );
}

/** 한 장이면 카드, 여러 장이면 카드 더미 */
function Stack({
  lang,
  stack,
  fresh,
  onOpen,
  onRead,
}: {
  lang: Lang;
  stack: Notif[];
  fresh: boolean;
  onOpen: () => void;
  onRead: () => void;
}) {
  const n = stack[0];
  const count = stack.length;
  const unread = stack.some((s) => !s.read);
  const card = (
    <Card lang={lang} n={n} count={count} unread={unread} className={fresh ? "animate-arrive" : ""} />
  );

  if (count === 1)
    return (
      <Link
        href={hrefOf(n, lang)}
        onClick={() => {
          onRead();
          track("notification_clicked", { type: n.type, grouped: false, viewer: VIEWER[lang] });
        }}
        className="block transition active:scale-[0.99]"
      >
        {card}
      </Link>
    );

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${titleOf(n, lang, count)} — ${COPY[lang].showAll}`}
      className="relative block w-full pb-3 text-left transition active:scale-[0.99]"
    >
      {/* 뒤에 깔린 카드들 */}
      {count > 2 && <span className="absolute inset-x-6 bottom-0 h-10 rounded-[22px] bg-surface-2/40" aria-hidden="true" />}
      <span className="absolute inset-x-3 bottom-1.5 h-10 rounded-[22px] bg-surface-2/80" aria-hidden="true" />
      <span className="relative block">{card}</span>
    </button>
  );
}

function Card({
  lang,
  n,
  count = 1,
  unread,
  className = "",
}: {
  lang: Lang;
  n: Notif;
  count?: number;
  unread: boolean;
  className?: string;
}) {
  return (
    <span
      className={`flex items-start gap-3.5 rounded-[24px] bg-surface py-4 pl-4 pr-3 ${
        unread ? "ring-1 ring-white/10" : ""
      } ${className}`}
    >
      <Badge type={n.type} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline gap-2">
          <span className={`min-w-0 flex-1 truncate text-[15px] font-semibold leading-[1.4] ${unread ? "text-on-dark" : "text-neutral-400"}`}>
            {titleOf(n, lang, count)}
          </span>
          <span className="shrink-0 text-[12px] font-medium tabular-nums text-muted">{n.time}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="line-clamp-1 min-w-0 flex-1 text-[13px] leading-[1.45] text-muted">{bodyOf(n, lang, count)}</span>
          {unread ? (
            <span className="size-2 shrink-0 rounded-full bg-primary" aria-label={COPY[lang].unread} />
          ) : (
            <Icon name="chevron-right" size={16} className="shrink-0 text-muted" />
          )}
        </span>
      </span>
    </span>
  );
}

function Badge({ type }: { type: Notif["type"] }) {
  const tone = {
    first: "bg-primary text-[20px]",
    comment: "bg-secondary text-on-light",
    reply: "bg-lilac text-on-light",
    milestone: "bg-content text-[20px]",
    draft: "bg-surface-2 text-on-dark",
  }[type];
  const icon = {
    first: "🎉",
    milestone: "🔥",
    comment: <Icon name="message" size={20} />,
    reply: <Icon name="message" size={20} />,
    draft: <Icon name="pencil" size={20} />,
  }[type];
  return (
    <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tone}`} aria-hidden="true">
      {icon}
    </span>
  );
}

/** 카드 더미를 눌렀을 때 — 뒤는 흐리게, 묶인 알림을 한 장에 펼쳐서 */
function StackOverlay({
  lang,
  stack,
  onClose,
  onRead,
}: {
  lang: Lang;
  stack: Notif[];
  onClose: () => void;
  onRead: (n: Notif) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={titleOf(stack[0], lang, stack.length)}>
      <button
        type="button"
        aria-label={COPY[lang].close}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/55 backdrop-blur-md"
      />
      <div className="relative flex w-full max-w-[398px] animate-menu flex-col overflow-hidden rounded-[28px] bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-[13px] font-semibold text-muted">
            {titleOf(stack[0], lang, stack.length)} · {stack[0].day}
          </p>
          <button type="button" onClick={onClose} aria-label={COPY[lang].close} className="-mr-2 flex size-9 items-center justify-center rounded-full text-muted">
            <Icon name="x" size={18} />
          </button>
        </div>
        <ul className="stagger flex max-h-[60dvh] flex-col overflow-y-auto pb-2">
          {stack.map((n) => (
            <li key={n.id} className="animate-rise">
              <Link
                href={hrefOf(n, lang)}
                onClick={() => {
                  onRead(n);
                  track("notification_clicked", { type: n.type, grouped: true, viewer: VIEWER[lang] });
                }}
                className="block px-1 transition active:bg-white/5"
              >
                <Card lang={lang} n={n} unread={!n.read} className="!ring-0 bg-transparent" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const VIEWER = { en: "foreigner", ko: "korean" } as const;

const COPY = {
  en: {
    title: "Notifications",
    back: "Back",
    readAll: "Mark all read",
    filterLabel: "Filter notifications",
    emptyTitle: "No notifications yet",
    emptyBody: "We'll let you know as soon as Koreans vote or comment.",
    showAll: "see all",
    unread: "Unread",
    close: "Close",
  },
  ko: {
    title: "알림",
    back: "뒤로",
    readAll: "모두 읽음",
    filterLabel: "알림 종류",
    emptyTitle: "아직 알림이 없어요",
    emptyBody: "내 댓글에 답글이 달리면 바로 알려 드릴게요.",
    showAll: "모두 보기",
    unread: "안 읽음",
    close: "닫기",
  },
};

function titleOf(n: Notif, lang: Lang, count = 1) {
  if (lang === "ko") {
    if (count > 1) return `내 댓글에 답글 ${count}개`;
    return n.byAuthor ? `글쓴이 ${n.actor}님의 답글` : "내 댓글에 답글이 달렸어요";
  }
  switch (n.type) {
    case "first":
      return "Your first Korean reaction 🎉";
    case "milestone":
      return `${n.detail} Koreans have voted`;
    case "comment":
      return count > 1 ? `${count} new comments` : `${n.actor} commented`;
    case "reply":
      return count > 1 ? `${count} replies to your comment` : `${n.actor} replied to your comment`;
    case "draft":
      return "You have an unfinished post";
  }
}

function bodyOf(n: Notif, lang: Lang, count = 1) {
  if (lang === "ko") return `${n.postTitle} · “${n.detail}”`;
  switch (n.type) {
    case "first":
      return `${n.actor} reacted to ${n.postTitle}.`;
    case "milestone":
      return "See what they think of your dish.";
    case "comment":
      return count > 1 ? `${n.actor}: “${n.detail}”` : `“${n.detail}”`;
    case "reply":
      return `${n.postTitle} · “${n.detail}”`;
    case "draft":
      return "Pick up where you left off.";
  }
}

/**
 * 알림을 누르면 가는 곳. ?from= 을 붙여서, 그 화면의 뒤로가기 버튼이 알림함으로 돌아오게 함
 * - 외국인: 내 글 / 남의 글 대댓글은 그 글의 댓글 화면 / 쓰다 만 글은 작성 화면(뒤로 → 알림함)
 * - 한국인: 대댓글이 달린 글의 댓글 화면
 */
function hrefOf(n: Notif, lang: Lang) {
  const from = lang === "en" ? "notifications-en" : "notifications";
  if (n.type === "draft") return `/write?from=${from}`;
  if (n.type === "reply" && (lang === "ko" || n.postId !== "mine")) return `/posts/${n.postId}/comments?from=${from}`;
  return `/my/posts/${n.postId}?from=${from}`;
}
