"use client";

import type { HomePost } from "@/app/home/mockPosts";
import { useMyAuthor } from "@/app/my/profile";
import { DetailScreen } from "@/app/posts/[id]/DetailScreen";
import { paperlogy } from "@/app/posts/[id]/font";
import { CommentsScreen } from "@/app/posts/[id]/comments/CommentsScreen";
import { VoteGate } from "@/app/posts/[id]/comments/VoteGate";
import type { BackFrom } from "@/lib/back";
import { MY_POST_ID } from "@/lib/write-data";
import { coverOf, SAMPLE_MY_POST, useFlow, type MyPost } from "@/lib/write-store";

/*
  내가 올린 글을 지현의 상세 · 댓글 화면에 그대로 보여 주기 (담당 송희)
  서버가 없어서 내 글은 브라우저 메모리(useFlow)에만 있음 → 상세 화면이 쓰는 글 모양(HomePost)으로 바꿔서 넘김
  /posts/mine, /posts/mine/comments 에서 씀. 서버가 붙으면 이 파일은 지우고 상세 화면이 서버에서 글을 받아 오면 됨
  TODO: 한국인에게는 번역본이 보여야 함 (지금은 영어 원문 그대로)
  글쓴이(나)는 외국인이라 외국인 상세·한마디 화면으로 봄. 작성자 표시는 가입 때 정한 닉네임·나라
*/
type Author = ReturnType<typeof useMyAuthor>;

/** 가입 전 예시 글(SAMPLE)은 받은 표가 있는 것처럼 — 알림 "20표" 등과 맞게. 방금 올린 내 글은 0표에서 시작 */
const SAMPLE_VOTES = [9, 6, 3, 2];

function asHomePost(p: MyPost, author: Author, sample: boolean): HomePost {
  return {
    id: MY_POST_ID,
    title: p.title,
    body: p.story,
    photos: p.photos.map((ph) => ph.src),
    cardPhoto: coverOf(p).src,
    color: "#fae276", // 메인 카드 노랑 (지현 목업과 같은 값)
    // 글쓴이 = 나 (가입 때 정한 닉네임 · 나라)
    en: { title: p.title, country: author.country.en, body: p.story, options: p.options },
    author: { name: author.name || "Sam", country: author.country.ko, flag: author.flag },
    createdAt: "2026-10-09T00:00:00Z",
    // 질문 종류 id는 지현 목업의 예전 5개 값이라 아직 맞지 않음 — 상세 화면은 이 값을 쓰지 않아서 자리만 채움
    question: { id: "korean", text: p.voteQuestion, options: p.options },
    votes: p.options.map((_, i) => (sample ? (SAMPLE_VOTES[i] ?? 1) : 0)),
    commentCount: p.comments,
  };
}

function useMyPostAsHome() {
  const { myPost } = useFlow();
  const author = useMyAuthor();
  return asHomePost(myPost ?? SAMPLE_MY_POST, author, !myPost);
}

/**
 * /posts/mine — 상세
 * 글쓴이는 외국인이라 지현의 외국인 상세(viewer "en")로: 투표 없이 결과만, 받은 한마디는 잠금 없이 바로
 */
export function MyPostDetail({ from }: { from?: BackFrom }) {
  const post = useMyPostAsHome();
  return <DetailScreen key={post.id} post={post} from={from} viewer="en" />;
}

/** /posts/mine/comments — 한마디 전체 화면 (지현의 외국인 한마디 화면을 그대로) */
export function MyPostComments({ backHref, backTo }: { backHref: string; backTo: "detail" | "notifications" | "other" }) {
  const post = useMyPostAsHome();
  return (
    <VoteGate postId={post.id} open>
      <main
        className={`${paperlogy.variable} mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background text-on-dark`}
      >
        <CommentsScreen
          initialLang="en"
          foreigner
          backHref={backHref}
          backTo={backTo}
          postId={post.id}
          commentCount={post.commentCount}
          authorFlag={post.author.flag}
          title={{ ko: post.title, en: post.title }}
        />
      </main>
    </VoteGate>
  );
}
