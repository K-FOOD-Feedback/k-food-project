"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { IconButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { Screen, TopBar } from "@/components/Layout";
import { track, useTrackOnce } from "@/lib/analytics";
import { markNotificationsSeen } from "@/lib/notifications-seen";
import { useAutoTranslate } from "@/components/LanguagePicker";
import { STEP_HREF, useFlow, type DraftStep } from "@/lib/write-store";
import { useKoreanUiLang, useViewerUiLang, type UiLang } from "@/app/posts/[id]/viewerLang";
import { timeAgo, TIME } from "@/app/my/parts";
import { compactCount } from "@/lib/format";
import { DATA, groupByDay, photoOf, postTitleOf, type Lang, type Notif } from "./data";

/**
 * 인앱 알림함 (4. 알림, 담당 송희) — 외국인 /notifications/en · 한국인 /notifications
 * - 투표·댓글·답글이 달리는 즉시 쌓임 (지금은 화면을 열고 2.5초 뒤 하나 도착하는 연출)
 * - 날짜별로 나눔 (종류가 적어서 탭 없음), 왼쪽은 그 글의 음식 사진
 * - 알림함을 열면 다 읽은 것 (안 읽음 표시·모두 읽음 없음)
 * - 알림이 많지 않아서 묶지 않고 하나씩 (댓글은 내용이 핵심이라 다 보이게)
 * - 화면 언어: 외국인은 🌐에서 고른 언어(영·중·일·한), 한국인은 한국인 🌐 언어 — lang 은 누구의 알림함인지만
 * - 시간: 1시간 안은 "방금 · 5분 전", 그 뒤는 시각(오후 9:55 · 9:55 PM · 21:55). 묶음 제목이 오늘 · 어제 · 날짜
 */
export function NotificationsScreen({ lang }: { lang: Lang }) {
  const ui = useNotifUi(lang);
  const t = COPY[ui];
  // 지금 시각 — 서버와 브라우저의 시간대가 달라 시각 글자가 어긋나지 않게 브라우저에서만 (서버는 0 → 목록을 그리지 않음)
  const now = useSyncExternalStore(subscribeNone, readNow, () => 0);
  const { incoming: INCOMING, list: NOTIFS } = DATA[lang];
  const translate = useAutoTranslate(); // 🌐의 자동 번역 설정 (한마디 화면과 같음)
  const { draft } = useFlow();
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
  const days = useMemo(() => (now ? groupByDay(all, now, ui) : []), [all, now, ui]);

  return (
    <Screen className="pb-16">
      <TopBar
        left={<IconButton icon="chevron-left" label={t.back} href={lang === "en" ? "/home?lang=en" : "/home"} />}
      />

      <div className="flex flex-col gap-6 px-4 pt-2">
        {now > 0 && days.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-24 text-center">
            <span className="text-[32px]" aria-hidden="true">
              🫥
            </span>
            <p className="text-[16px] font-semibold">{t.emptyTitle}</p>
            <p className="text-[14px] text-muted">{lang === "en" ? t.emptyForeigner : t.emptyKorean}</p>
          </div>
        )}
        {days.map(({ day, items }) => (
          <section key={day} className="flex flex-col gap-3">
            <h2 className="px-1 text-[14px] font-semibold text-muted">{day}</h2>
            {items.map((n) => (
              <Link
                key={n.id}
                href={hrefOf(n, lang, draft.savedStep)}
                onClick={() => {
                  track("notification_clicked", { type: n.type, viewer: VIEWER[lang] });
                }}
                className="block transition active:scale-[0.99]"
              >
                <NotificationCard lang={lang} ui={ui} now={now} n={n} translate={translate} className={n.id === INCOMING.id ? "animate-arrive" : ""} />
              </Link>
            ))}
          </section>
        ))}
      </div>
    </Screen>
  );
}

const subscribeNone = () => () => {};
// 화면을 그릴 때 한 번 잡은 시각 (그릴 때마다 바뀌지 않게)
let pageNow = 0;
const readNow = () => (pageNow ||= Date.now());

/** 알림함 화면 언어 — 외국인은 외국인 🌐, 한국인은 한국인 🌐 */
function useNotifUi(lang: Lang): UiLang {
  const foreign = useViewerUiLang();
  const korean = useKoreanUiLang();
  return lang === "en" ? foreign : korean;
}

/** 카드 오른쪽 시간 — 1시간 안은 "방금 · 5분 전", 그 뒤는 그 나라 방식의 시각 */
function timeOf(n: Notif, now: number, ui: UiLang) {
  const at = now - n.ago;
  if (n.ago < TIME.HOUR) return timeAgo(at, now, ui);
  const locale = { ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP" }[ui];
  return new Date(at).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

export function NotificationCard({
  lang,
  ui = lang,
  now,
  n,
  translate,
  className = "",
}: {
  lang: Lang;
  ui?: UiLang;
  now: number;
  n: Notif;
  translate: boolean;
  className?: string;
}) {
  return (
    <span className={`flex items-start gap-4 rounded-[20px] bg-surface p-5 ${className}`}>
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
          {/* 한국어는 낱말 단위로 줄바꿈(break-keep), 중·일은 띄어쓰기가 없어 글자 단위로 (break-keep이면 한 줄에서 잘림) */}
          <span className={`line-clamp-2 min-w-0 flex-1 text-[16px] font-semibold leading-[1.4] ${ui === "zh" || ui === "ja" ? "" : "break-keep"}`}>{titleOf(n, lang, ui)}</span>
          <span className="shrink-0 pt-1 text-[12px] font-medium tabular-nums text-muted">{timeOf(n, now, ui)}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="line-clamp-1 min-w-0 flex-1 text-[14px] leading-[1.5] text-muted">{bodyOf(n, ui, translate)}</span>
          <Icon name="chevron-right" size={16} className="shrink-0 text-muted" />
        </span>
      </span>
    </span>
  );
}

const VIEWER = { en: "foreigner", ko: "korean" } as const;

const COPY: Record<UiLang, { title: string; back: string; emptyTitle: string; emptyForeigner: string; emptyKorean: string; close: string }> = {
  en: {
    title: "Notifications",
    back: "Back",
    emptyTitle: "No notifications yet",
    emptyForeigner: "We'll let you know as soon as Koreans vote or comment.",
    emptyKorean: "We'll let you know when someone replies to your comment.",
    close: "Close",
  },
  ko: {
    title: "알림",
    back: "뒤로",
    emptyTitle: "아직 알림이 없어요",
    emptyForeigner: "한국인이 투표하거나 한마디를 남기면 바로 알려 드릴게요.",
    emptyKorean: "내 한마디에 답글이 달리면 바로 알려 드릴게요.",
    close: "닫기",
  },
  zh: {
    title: "通知",
    back: "返回",
    emptyTitle: "还没有通知",
    emptyForeigner: "韩国人投票或评论时，我们会第一时间通知你。",
    emptyKorean: "有人回复你的评论时，我们会第一时间通知你。",
    close: "关闭",
  },
  ja: {
    title: "通知",
    back: "戻る",
    emptyTitle: "まだ通知はありません",
    emptyForeigner: "韓国の人が投票やコメントをしたら、すぐにお知らせします。",
    emptyKorean: "あなたのひとことに返信があったら、すぐにお知らせします。",
    close: "閉じる",
  },
};

/** 알림 제목 — 문장형. 한국인 한마디는 익명이라 "한국인" · 글쓴이도 닉네임 없이 "글쓴이" (지현 규칙) */
const TITLES: Record<UiLang, {
  first: string;
  milestone: (n: string) => string;
  comment: string;
  reply: string;
  draft: string;
  koReply: string;
  koReplyByAuthor: string;
  draftBody: string;
}> = {
  en: {
    first: "A Korean reacted to your post for the first time.",
    milestone: (n) => `Your post got ${n} votes.`,
    comment: "A Korean commented on your post.",
    reply: "A Korean replied to your comment.",
    draft: "You have an unfinished post.",
    koReply: "Someone replied to your comment.",
    koReplyByAuthor: "The author replied to your comment.",
    draftBody: "Pick up where you left off.",
  },
  ko: {
    first: "한국인이 내 글에 처음 반응했어요",
    milestone: (n) => `내 글이 ${n}표를 받았어요`,
    comment: "한국인이 내 글에 한마디를 남겼어요",
    reply: "한국인이 내 한마디에 답글을 달았어요",
    draft: "다 쓰지 않은 글이 있어요",
    koReply: "내 한마디에 답글이 달렸어요",
    koReplyByAuthor: "글쓴이가 내 한마디에 답글을 달았어요",
    draftBody: "이어서 써 보세요",
  },
  zh: {
    first: "有韩国人第一次回应了你的帖子。",
    milestone: (n) => `你的帖子获得了 ${n} 票。`,
    comment: "有韩国人评论了你的帖子。",
    reply: "有韩国人回复了你的评论。",
    draft: "你有一篇没写完的帖子。",
    koReply: "有人回复了你的评论。",
    koReplyByAuthor: "作者回复了你的评论。",
    draftBody: "接着写吧。",
  },
  ja: {
    first: "韓国の人があなたの投稿に初めて反応しました。",
    milestone: (n) => `あなたの投稿に${n}票が集まりました。`,
    comment: "韓国の人があなたの投稿にコメントしました。",
    reply: "韓国の人があなたのコメントに返信しました。",
    draft: "書きかけの投稿があります。",
    koReply: "あなたのひとことに返信がありました。",
    koReplyByAuthor: "投稿者があなたのひとことに返信しました。",
    draftBody: "続きを書きましょう。",
  },
};

function titleOf(n: Notif, lang: Lang, ui: UiLang) {
  const T = TITLES[ui];
  if (lang === "ko") return n.byAuthor ? T.koReplyByAuthor : T.koReply;
  if (n.type === "milestone") return T.milestone(compactCount(Number(n.detail), ui));
  return T[n.type];
}

/** 아래 줄: 댓글·답글은 내용(자동 번역이 켜져 있으면 화면 언어 번역본), 나머지는 어느 글인지 (어느 글인지는 왼쪽 사진으로도 보임) */
function bodyOf(n: Notif, ui: UiLang, translate: boolean) {
  if (n.type === "comment" || n.type === "reply") {
    const tr = translate && n.detailLang !== ui ? n.translated?.[ui] : undefined;
    return tr ?? n.detail; // 따옴표 없이 (송희)
  }
  if (n.type === "draft") return TITLES[ui].draftBody;
  return postTitleOf(n, ui);
}

/**
 * 알림을 누르면 가는 곳. ?from= 을 붙여서, 그 화면의 뒤로가기 버튼이 알림함으로 돌아오게 함
 * - 외국인: 내 글 / 남의 글 대댓글은 그 글의 댓글 화면 / 쓰다 만 글은 작성 화면(뒤로 → 알림함)
 * - 한국인: 대댓글이 달린 글의 댓글 화면 — 답글이 달린 내 한마디가 바로 열린 채로
 */
function hrefOf(n: Notif, lang: Lang, savedStep: DraftStep | null) {
  const from = lang === "en" ? "notifications-en" : "notifications";
  // 쓰다 만 글: 멈춘 단계로 바로 (이 브라우저에 쓰다 만 글이 없으면 사진 고르기부터)
  if (n.type === "draft") return `${savedStep ? STEP_HREF[savedStep] : "/write"}?from=${from}`;
  if (n.type === "reply" && (lang === "ko" || n.postId !== "mine")) {
    // 답글이 달린 내 한마디를 바로 열어 줌 (한마디 화면의 ?comment=)
    const comment = n.commentId ? `&comment=${encodeURIComponent(n.commentId)}` : "";
    return `/posts/${n.postId}/comments?from=${from}${comment}`;
  }
  // 내 글에 달린 한마디 → 한마디 전체 화면으로
  if (n.type === "comment") return `/posts/${n.postId}/comments?from=${from}`;
  return `/posts/${n.postId}?from=${from}`;
}
