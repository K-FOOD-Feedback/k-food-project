"use client";

import Link from "next/link";
import type { HomePost } from "@/app/home/mockPosts";
import { CommentPile } from "@/app/posts/[id]/CommentPile";
import { DetailScreen } from "@/app/posts/[id]/DetailScreen";
import { paperlogy } from "@/app/posts/[id]/font";
import { VoteGate } from "@/app/posts/[id]/comments/VoteGate";
import { TrackedLink } from "@/components/Track";
import { MY_POST_ID } from "@/lib/write-data";
import { coverOf, SAMPLE_MY_POST, useFlow, type MyPost } from "@/lib/write-store";

/*
  내가 올린 글을 지현의 상세 · 댓글 화면에 그대로 보여 주기 (담당 송희)
  서버가 없어서 내 글은 브라우저 메모리(useFlow)에만 있음 → 상세 화면이 쓰는 글 모양(HomePost)으로 바꿔서 넘김
  /posts/mine, /posts/mine/comments 에서 씀. 서버가 붙으면 이 파일은 지우고 상세 화면이 서버에서 글을 받아 오면 됨
  TODO: 한국인에게는 번역본이 보여야 함 (지금은 영어 원문 그대로)
*/
function asHomePost(p: MyPost): HomePost {
  return {
    id: MY_POST_ID,
    title: p.title,
    body: p.story,
    photos: p.photos.map((ph) => ph.src),
    cardPhoto: coverOf(p).src,
    color: "#fae276", // 메인 카드 노랑 (지현 목업과 같은 값)
    en: { title: p.title, country: "Canada" },
    author: { name: "Sam", country: "캐나다", flag: "🇨🇦" },
    createdAt: "2026-10-09T00:00:00Z",
    // 질문 종류 id는 지현 목업의 예전 5개 값이라 아직 맞지 않음 — 상세 화면은 이 값을 쓰지 않아서 자리만 채움
    question: { id: "korean", text: p.voteQuestion, options: p.options },
    votes: p.options.map(() => 0),
    commentCount: p.comments,
  };
}

function useMyPostAsHome() {
  const { myPost } = useFlow();
  return asHomePost(myPost ?? SAMPLE_MY_POST);
}

/** /posts/mine — 상세 */
export function MyPostDetail() {
  const post = useMyPostAsHome();
  return <DetailScreen key={post.id} post={post} />;
}

/** /posts/mine/comments — 댓글 전체 화면 (지현의 댓글 화면과 같은 모양) */
export function MyPostComments({ backHref }: { backHref: string }) {
  const post = useMyPostAsHome();
  const circle = "flex size-16 items-center justify-center rounded-full bg-white/8";
  return (
    <VoteGate postId={post.id}>
      <main
        className={`${paperlogy.variable} mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background text-on-dark`}
      >
        <header className="flex shrink-0 items-center justify-between px-2 pt-[calc(16px+env(safe-area-inset-top))] pb-4">
          <Link href={backHref} aria-label={backHref === `/posts/${post.id}` ? "상세로 돌아가기" : "알림으로 돌아가기"} className={circle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <TrackedLink href="/" event="language_clicked" props={{ from: "comments" }} className={circle} aria-label="언어 선택">
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 아이콘 */}
            <img src="/images/icon-world.svg" width={24} height={24} alt="" />
          </TrackedLink>
        </header>
        <div className="flex min-h-0 flex-1 flex-col pb-[calc(24px+env(safe-area-inset-bottom))]">
          <CommentPile
            postId={post.id}
            commentCount={post.commentCount}
            authorFlag={post.author.flag}
            postTitle={post.title}
            variant="full"
          />
        </div>
      </main>
    </VoteGate>
  );
}
