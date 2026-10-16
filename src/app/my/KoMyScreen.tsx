"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getHomePost, HOME_POSTS, type HomePost } from "@/app/home/mockPosts";
import { useMyVote, useVotedIds } from "@/app/home/votes";
import { useMyComments } from "@/app/posts/[id]/comments";
import { titleIn } from "@/app/home/titles";
import { useKoreanUiLang, type UiLang } from "@/app/posts/[id]/viewerLang";
import { useAutoTranslate } from "@/components/LanguagePicker";
import { IconButton } from "@/components/Buttons";
import { Screen, TopBar } from "@/components/Layout";
import { track, useTrackOnce } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { CommentCard, Empty, LogoutSheet, MyTabs, PhotoTile, timeAgo } from "./parts";
import { forgetRole } from "@/lib/role";
import { FEEDBACK_BAR_SPACE, FeedbackButton } from "./FeedbackSheet";
import { AccountFooter, GOOGLE_ACCOUNT, AccountMenu, ProfileHeader, ProfileSheet, useNickname } from "./profile";

/*
  7. 마이 · 한국인 /my (담당 송희)
  외국인 마이와 같은 구조 — "내가 한 참견을 빠르게 확인"
  - 프로필: 랜덤 닉네임 › (› 누르면 닉네임 바꾸기 시트)
  - 맨 아래 회색 작은 글씨: Google 계정
  - 투표 / 한마디 탭
    · 투표: 내가 투표한 글을 2열 사진 타일로, 칩은 내가 고른 선택지 → 상세
    · 한마디: 내가 남긴 한마디(답글 포함)를 알림함과 같은 카드로, 최신 순 → 그 한마디 상세(레이어)
  - 오른쪽 위 ⋯: 로그아웃 · 계정 삭제
  실제 기록: 이 브라우저에 저장된 투표·한마디 (서버 전까지). 프로필만 목업

  ── 경우별 정의 ─────────────────────────────
  [투표]
  - 없음: 안내 + 중간 버튼(투표하러 가기 → 메인)
  - 칩: "내 선택 · 비슷해요" (선택지 줄바꿈은 한 줄로), 넘치면 …
  - 제목: 2줄까지
  [한마디]
  - 없음: 안내 + 중간 버튼(둘러보기 → 메인)
  - 한마디 2줄까지 · 이모지 한마디도 그대로
  - 어느 글: "글 제목" / 답글이면 "답글 · 글 제목", 1줄
  - 글이 지워졌으면: "삭제된 글", 누를 수 없음
  - 시간: 방금 · 5분 전 · 3시간 전 · 어제 · 3일 전 · 9월 3일 · 2025년 9월 8일
*/

/* 화면 언어 = 지구본에서 고른 언어(한국인 기억 kfood:korean-lang), 글 제목 = 자동 번역이면 화면 언어 · 아니면 원문(영어) — 메인·상세와 같은 규칙 */
const COPY: Record<
  UiLang,
  {
    back: string;
    activity: string;
    votes: string;
    comments: string;
    noVotes: string;
    noVotesBody: string;
    goVote: string;
    noComments: string;
    noCommentsBody: string;
    browse: string;
    reply: string;
    deleted: string;
    voted: string;
  }
> = {
  ko: {
    back: "뒤로",
    activity: "내 활동",
    votes: "투표",
    comments: "한마디",
    noVotes: "아직 투표한 글이 없어요",
    noVotesBody: "외국인이 만든 한식에 한 표 던져 보세요.",
    goVote: "투표하러 가기",
    noComments: "아직 남긴 한마디가 없어요",
    noCommentsBody: "투표한 글에 한마디를 남기면 여기 모여요.",
    browse: "둘러보기",
    reply: "답글 · ",
    deleted: "삭제된 글",
    voted: "투표함",
  },
  en: {
    back: "Back",
    activity: "My activity",
    votes: "Votes",
    comments: "Comments",
    noVotes: "No votes yet",
    noVotesBody: "Cast your vote on K-food made by foreigners.",
    goVote: "Go vote",
    noComments: "No comments yet",
    noCommentsBody: "Comments you leave on posts you voted on will show up here.",
    browse: "Browse posts",
    reply: "Reply · ",
    deleted: "Deleted post",
    voted: "Voted",
  },
  zh: {
    back: "返回",
    activity: "我的动态",
    votes: "投票",
    comments: "评论",
    noVotes: "还没有投过票",
    noVotesBody: "给外国朋友做的韩食投上一票吧。",
    goVote: "去投票",
    noComments: "还没有留下评论",
    noCommentsBody: "在投过票的帖子下留言，就会出现在这里。",
    browse: "随便看看",
    reply: "回复 · ",
    deleted: "已删除的帖子",
    voted: "已投票",
  },
  ja: {
    back: "戻る",
    activity: "マイアクティビティ",
    votes: "投票",
    comments: "コメント",
    noVotes: "まだ投票した投稿がありません",
    noVotesBody: "海外の友だちが作った韓国料理に一票入れてみよう。",
    goVote: "投票しに行く",
    noComments: "まだコメントがありません",
    noCommentsBody: "投票した投稿にコメントを残すと、ここに集まります。",
    browse: "見てみる",
    reply: "返信 · ",
    deleted: "削除された投稿",
    voted: "投票済み",
  },
};

type Tab = "votes" | "comments";

export function KoMyScreen() {
  const router = useRouter();
  const { logOut } = useFlow();
  const nickname = useNickname("ko");
  const ui = useKoreanUiLang();
  const content: UiLang = useAutoTranslate() ? ui : "en";
  const T = COPY[ui];
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("votes");
  const [logoutOpen, setLogoutOpen] = useState(false);

  const voted = useVotedIds();
  const votedPosts = HOME_POSTS.filter((p) => voted.has(p.id));
  const mine = useMyComments();
  const [now] = useState(() => Date.now());

  useTrackOnce("my_page_viewed", { viewer: "korean", votes: votedPosts.length, comments: mine.length });

  // 계정 삭제 (⋯ 메뉴에서 한 번 더 물은 뒤)
  const deleteAccount = () => {
    // 서버 전까지: 이 브라우저에 남은 내 투표·한마디도 지움 (안 지우면 삭제 직후에도 마이에 그대로 보임)
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("kfood:vote:") || k.startsWith("kfood:comments:")) localStorage.removeItem(k);
    }
    forgetRole();
    logOut();
    router.push("/");
  };

  return (
    <Screen className={FEEDBACK_BAR_SPACE}>
      <TopBar
        left={<IconButton icon="chevron-left" label={T.back} href="/home" />}
        // ⋯ — 로그아웃 · 계정 삭제
        right={<AccountMenu lang="ko" ui={ui} onLogout={() => setLogoutOpen(true)} onDelete={deleteAccount} />}
      />

      <ProfileHeader
        lang="ko"
        ui={ui}
        nickname={nickname}
        onOpen={() => {
          track("my_item_clicked", { item: "profile", viewer: "korean" });
          setProfileOpen(true);
        }}
      />

      <MyTabs
        label={T.activity}
        tabs={[
          ["votes", T.votes, votedPosts.length],
          ["comments", T.comments, mine.length],
        ]}
        value={tab}
        onChange={(id) => {
          track("my_item_clicked", { item: `tab_${id}`, viewer: "korean" });
          setTab(id);
        }}
      />

      <div key={tab} className="animate-fade-in px-2 pt-4">
        {tab === "votes" &&
          (votedPosts.length === 0 ? (
            <Empty
              title={T.noVotes}
              body={T.noVotesBody}
              action={{
                label: T.goVote,
                href: "/home",
                onClick: () => track("my_item_clicked", { item: "browse", viewer: "korean" }),
              }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 px-1">
              {votedPosts.map((p) => (
                <VotedTile key={p.id} post={p} ui={ui} content={content} />
              ))}
            </div>
          ))}

        {tab === "comments" &&
          (mine.length === 0 ? (
            <Empty
              title={T.noComments}
              body={T.noCommentsBody}
              action={{
                label: T.browse,
                href: "/home",
                onClick: () => track("my_item_clicked", { item: "browse", viewer: "korean" }),
              }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {mine.map(({ postId, comment: c, at }) => {
                const post = getHomePost(postId);
                return (
                  <CommentCard
                    key={c.id}
                    href={post ? `/posts/${postId}/comments?comment=${encodeURIComponent(c.id)}&from=my` : undefined}
                    onClick={() => track("my_item_clicked", { item: "comment", reply: !!c.replyTo, viewer: "korean" })}
                    photo={post?.cardPhoto}
                    text={c.text}
                    time={at ? timeAgo(at, now, ui) : ""}
                    where={post ? `${c.replyTo ? T.reply : ""}${titleIn(post, content)}` : T.deleted}
                  />
                );
              })}
            </div>
          ))}
      </div>

      {/* 문의·의견 + 계정 줄 — 화면 아래 고정 */}
      <FeedbackButton ui={ui} viewer="korean">
        <AccountFooter lang="ko" ui={ui} email={GOOGLE_ACCOUNT.ko.email} className="mt-4" />
      </FeedbackButton>

      <ProfileSheet
        lang="ko"
        ui={ui}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        nickname={nickname}
      />

      <LogoutSheet
        lang={ui}
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          track("logged_out", { from: "my", viewer: "korean" });
          logOut();
          router.push("/home");
        }}
      />
    </Screen>
  );
}

/** 내가 투표한 글 — 칩은 내가 고른 선택지 */
function VotedTile({ post, ui, content }: { post: HomePost; ui: UiLang; content: UiLang }) {
  const choice = useMyVote(post.id);
  // 선택지는 상세 투표 칸과 같게: 한국어 글 언어면 한국어, 아니면 영어 (중·일 선택지 데이터는 아직 없음)
  const options = (content !== "ko" && post.en.options) || post.question.options;
  const picked = choice === null ? null : options[choice]?.replace(/\n/g, " ");
  return (
    <PhotoTile
      href={`/posts/${post.id}?from=my`}
      onClick={() => track("my_item_clicked", { item: "voted_post", viewer: "korean" })}
      photo={post.cardPhoto}
      // 내가 고른 선택지 — "내 선택" 글자 대신 ✓ (선택지가 길면 …)
      chip={picked ?? COPY[ui].voted}
      chipIcon="check"
      chipStrong
      title={titleIn(post, content)}
    />
  );
}
