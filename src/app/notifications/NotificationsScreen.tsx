"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { Screen, TopBar } from "@/components/Layout";
import { track, useTrackOnce } from "@/lib/analytics";
import { markNotificationsSeen } from "@/lib/notifications-seen";
import { DATA, groupByDay, photoOf, type Lang, type Notif } from "./data";

/**
 * 인앱 알림함 (4. 알림, 담당 송희) — 외국인 /notifications/en · 한국인 /notifications
 * - 투표·댓글·답글이 달리는 즉시 쌓임 (지금은 화면을 열고 2.5초 뒤 하나 도착하는 연출)
 * - 날짜별로 나눔 (종류가 적어서 탭 없음), 왼쪽은 그 글의 음식 사진
 * - 알림함을 열면 다 읽은 것 (안 읽음 표시·모두 읽음 없음)
 * - 알림이 많지 않아서 묶지 않고 하나씩 (댓글은 내용이 핵심이라 다 보이게)
 */
export function NotificationsScreen({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  const { incoming: INCOMING, list: NOTIFS } = DATA[lang];
  const [live, setLive] = useState(false);

  useTrackOnce("notifications_viewed", { count: NOTIFS.length, viewer: VIEWER[lang] });

  // 알림함을 열면 다 읽은 것 — 상단 🔔의 점을 끔 (서버 연결 전에는 이 브라우저에만 기록)
  useEffect(() => markNotificationsSeen(lang), [lang]);

  // 실시간 도착 연출 — 서버 연결 후 Supabase Realtime 구독으로 교체
  useEffect(() => {
    const t = window.setTimeout(() => setLive(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  const all = useMemo(() => (live ? [INCOMING, ...NOTIFS] : NOTIFS), [live, INCOMING, NOTIFS]);
  const days = useMemo(() => groupByDay(all), [all]);

  return (
    <Screen className="pb-16">
      <TopBar
        title={t.title}
        left={<IconButton icon="chevron-left" label={t.back} href={lang === "en" ? "/home/en" : "/home"} />}
      />

      <div className="flex flex-col gap-7 px-4 pt-2">
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
                  track("notification_clicked", { type: n.type, viewer: VIEWER[lang] });
                }}
                className="block transition active:scale-[0.99]"
              >
                <Card lang={lang} n={n} className={n.id === INCOMING.id ? "animate-arrive" : ""} />
              </Link>
            ))}
          </section>
        ))}
      </div>
    </Screen>
  );
}

function Card({ lang, n, className = "" }: { lang: Lang; n: Notif; className?: string }) {
  return (
    <span className={`flex items-start gap-3.5 rounded-[24px] bg-surface py-4 pl-4 pr-3 ${className}`}>
      {/* 그 글의 음식 사진 (앱의 물결 모양) */}
      <span
        className="relative size-12 shrink-0"
        style={{
          maskImage: "url(/images/card-mask.svg)",
          WebkitMaskImage: "url(/images/card-mask.svg)",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }}
        aria-hidden="true"
      >
        <Image src={photoOf(n)} alt="" fill sizes="48px" className="object-cover" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-start gap-2">
          <span className="line-clamp-2 min-w-0 flex-1 break-keep text-[15px] font-semibold leading-[1.4]">{titleOf(n, lang)}</span>
          <span className="shrink-0 pt-0.5 text-[12px] font-medium tabular-nums text-muted">{n.time}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="line-clamp-1 min-w-0 flex-1 text-[13px] leading-[1.45] text-muted">{bodyOf(n, lang)}</span>
          <Icon name="chevron-right" size={16} className="shrink-0 text-muted" />
        </span>
      </span>
    </span>
  );
}

const VIEWER = { en: "foreigner", ko: "korean" } as const;

const COPY = {
  en: {
    title: "Notifications",
    back: "Back",
    emptyTitle: "No notifications yet",
    emptyBody: "We'll let you know as soon as Koreans vote or comment.",
    close: "Close",
  },
  ko: {
    title: "알림",
    back: "뒤로",
    emptyTitle: "아직 알림이 없어요",
    emptyBody: "내 댓글에 답글이 달리면 바로 알려 드릴게요.",
    close: "닫기",
  },
};

/** 제목은 모두 문장형 */
function titleOf(n: Notif, lang: Lang) {
  if (lang === "ko") {
    return n.byAuthor ? `글쓴이 ${n.actor}님이 내 댓글에 답글을 달았어요` : "내 댓글에 답글이 달렸어요";
  }
  switch (n.type) {
    case "first":
      return "A Korean reacted to your post for the first time.";
    case "milestone":
      return `Your post got ${n.detail} votes.`;
    case "comment":
      return `${n.actor} commented on your post.`;
    case "reply":
      return `${n.actor} replied to your comment.`;
    case "draft":
      return "You have an unfinished post.";
  }
}

/** 아래 줄: 댓글·답글은 내용, 나머지는 어느 글인지 (어느 글인지는 왼쪽 사진으로도 보임) */
function bodyOf(n: Notif, lang: Lang) {
  if (n.type === "comment" || n.type === "reply") return `“${n.detail}”`;
  if (n.type === "draft") return lang === "ko" ? "이어서 써 보세요" : "Pick up where you left off.";
  return n.postTitle;
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
