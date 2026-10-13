"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getHomePost, HOME_POSTS, type HomePost } from "@/app/home/mockPosts";
import { useMyVote, useVotedIds } from "@/app/home/votes";
import { useMyComments } from "@/app/posts/[id]/comments";
import { IconButton, PillButton } from "@/components/Buttons";
import { Screen, TopBar } from "@/components/Layout";
import { track, useTrackOnce } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { CommentCard, Empty, LogoutSheet, MyTabs, PhotoTile, timeAgo } from "./parts";
import { forgetRole } from "@/lib/role";
import { AccountFooter, AccountMenu, ProfileHeader, ProfileSheet, useNickname } from "./profile";

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
const PROFILE = { email: "minjun.kim@gmail.com" };

type Tab = "votes" | "comments";

export function KoMyScreen() {
  const router = useRouter();
  const { logOut } = useFlow();
  const nickname = useNickname("ko");
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
    <Screen className="pb-16">
      <TopBar
        left={<IconButton icon="chevron-left" label="뒤로" href="/home" />}
        // ⋯ — 로그아웃 · 계정 삭제
        right={<AccountMenu lang="ko" onLogout={() => setLogoutOpen(true)} onDelete={deleteAccount} />}
      />

      <ProfileHeader
        lang="ko"
        nickname={nickname}
        onOpen={() => {
          track("my_item_clicked", { item: "profile", viewer: "korean" });
          setProfileOpen(true);
        }}
      />

      <MyTabs
        label="내 활동"
        tabs={[
          ["votes", "투표", votedPosts.length],
          ["comments", "한마디", mine.length],
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
              title="아직 투표한 글이 없어요"
              body="외국인이 만든 한식에 한 표 던져 보세요."
              cta={
                <PillButton
                  tone="primary"
                  size="md"
                  href="/home"
                  onClick={() => track("my_item_clicked", { item: "browse", viewer: "korean" })}
                >
                  투표하러 가기
                </PillButton>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 px-1">
              {votedPosts.map((p) => (
                <VotedTile key={p.id} post={p} />
              ))}
            </div>
          ))}

        {tab === "comments" &&
          (mine.length === 0 ? (
            <Empty
              title="아직 남긴 한마디가 없어요"
              body="투표한 글에 한마디를 남기면 여기 모여요."
              cta={
                <PillButton
                  tone="soft"
                  size="md"
                  href="/home"
                  onClick={() => track("my_item_clicked", { item: "browse", viewer: "korean" })}
                >
                  둘러보기
                </PillButton>
              }
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
                    time={at ? timeAgo(at, now, "ko") : ""}
                    where={post ? `${c.replyTo ? "답글 · " : ""}${post.title}` : "삭제된 글"}
                  />
                );
              })}
            </div>
          ))}
      </div>

      <AccountFooter lang="ko" email={PROFILE.email} />

      <ProfileSheet
        lang="ko"
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        nickname={nickname}
      />

      <LogoutSheet
        lang="ko"
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
function VotedTile({ post }: { post: HomePost }) {
  const choice = useMyVote(post.id);
  const picked = choice === null ? null : post.question.options[choice]?.replace(/\n/g, " ");
  return (
    <PhotoTile
      href={`/posts/${post.id}?from=my`}
      onClick={() => track("my_item_clicked", { item: "voted_post", viewer: "korean" })}
      photo={post.cardPhoto}
      // 내가 고른 선택지 — "내 선택" 글자 대신 ✓ (선택지가 길면 …)
      chip={picked ?? "투표함"}
      chipIcon="check"
      chipStrong
      title={post.title}
    />
  );
}
