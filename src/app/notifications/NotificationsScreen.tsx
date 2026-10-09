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
 * - 알림이 많지 않아서 묶지 않고 하나씩 (댓글은 내용이 핵심이라 다 보이게)
 */
export function NotificationsScreen({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  const { incoming: INCOMING, list: NOTIFS } = DATA[lang];
  const [filter, setFilter] = useState<FilterId>("all");
  const [live, setLive] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

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
        {days.map(({ day, items }) => (
          <section key={day} className="flex flex-col gap-3">
            <h2 className="px-1 text-[13px] font-semibold text-muted">{day}</h2>
            {items.map((n) => (
              <Link
                key={n.id}
                href={hrefOf(n, lang)}
                onClick={() => {
                  markRead([n]);
                  track("notification_clicked", { type: n.type, viewer: VIEWER[lang] });
                }}
                className="block transition active:scale-[0.99]"
              >
                <Card lang={lang} n={n} unread={!n.read} className={n.id === INCOMING.id ? "animate-arrive" : ""} />
              </Link>
            ))}
          </section>
        ))}
      </div>
    </Screen>
  );
}

function Card({
  lang,
  n,
  unread,
  className = "",
}: {
  lang: Lang;
  n: Notif;
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
            {titleOf(n, lang)}
          </span>
          <span className="shrink-0 text-[12px] font-medium tabular-nums text-muted">{n.time}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="line-clamp-1 min-w-0 flex-1 text-[13px] leading-[1.45] text-muted">{bodyOf(n, lang)}</span>
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

const VIEWER = { en: "foreigner", ko: "korean" } as const;

const COPY = {
  en: {
    title: "Notifications",
    back: "Back",
    readAll: "Mark all read",
    filterLabel: "Filter notifications",
    emptyTitle: "No notifications yet",
    emptyBody: "We'll let you know as soon as Koreans vote or comment.",
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
    unread: "안 읽음",
    close: "닫기",
  },
};

function titleOf(n: Notif, lang: Lang) {
  if (lang === "ko") {
    return n.byAuthor ? `글쓴이 ${n.actor}님의 답글` : "내 댓글에 답글이 달렸어요";
  }
  switch (n.type) {
    case "first":
      return "Your first Korean reaction 🎉";
    case "milestone":
      return `${n.detail} Koreans have voted`;
    case "comment":
      return `${n.actor} commented`;
    case "reply":
      return `${n.actor} replied to your comment`;
    case "draft":
      return "You have an unfinished post";
  }
}

function bodyOf(n: Notif, lang: Lang) {
  if (lang === "ko") return `${n.postTitle} · “${n.detail}”`;
  switch (n.type) {
    case "first":
      return `${n.actor} reacted to ${n.postTitle}.`;
    case "milestone":
      return "See what they think of your dish.";
    case "comment":
      return `“${n.detail}”`;
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
