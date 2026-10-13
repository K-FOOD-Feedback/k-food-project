import Link from "next/link";
import { notFound } from "next/navigation";
import { getHomePost } from "@/app/home/mockPosts";
import { MyPostComments } from "@/app/write/MyPostDetail";
import { MY_POST_ID } from "@/lib/write-data";
import { backHrefFrom } from "@/lib/back";
import { HEADER_BUTTON, PageHeader } from "@/components/PageHeader";
import { LanguageButton } from "@/components/LanguagePicker";
import { CommentPile } from "../CommentPile";
import { paperlogy } from "../font";
import { VoteGate } from "./VoteGate";

/**
  4. 댓글 전체 화면 (Figma 332:3245)
  상세 화면의 댓글 영역과 같은 댓글·같은 인터랙션을, 화면 높이를 다 써서 크게 보여 줍니다.
  댓글 칸을 스크롤하면 그라데이션 아래로 묻힌 예전 댓글도 볼 수 있습니다.
  투표한 사람만 볼 수 있습니다 (VoteGate).
*/
export default async function Page(props: PageProps<"/posts/[id]/comments">) {
  const { id } = await props.params;
  // 알림함에서 들어왔으면 뒤로가기는 알림함으로 (송희) — 그 외에는 원래대로 상세로
  const sp = await props.searchParams;
  const backHref = backHrefFrom(sp.from, `/posts/${id}`);
  // 외국인은 투표를 못 해서 투표 없이 한마디를 봄 (송희·지현 합의) — 외국인 화면에서 온 링크는 ?viewer=en
  const foreigner = sp.viewer === "en" || sp.from === "notifications-en";
  // 내가 올린 글(송희) — 같은 댓글 화면 모양으로
  if (id === MY_POST_ID) return <MyPostComments backHref={backHref} />;
  const post = getHomePost(id);
  if (!post) notFound();

  return (
    <VoteGate postId={post.id} open={foreigner}>
      <main
        className={`${paperlogy.variable} mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background text-on-dark`}
      >
        {/* 공통 상단 바 (src/components/PageHeader — 모든 화면이 같은 위치·크기·디자인) */}
        <PageHeader
          left={
            <Link
              href={backHref}
              aria-label={backHref === `/posts/${id}` ? "상세로 돌아가기" : "알림으로 돌아가기"}
              className={HEADER_BUTTON}
            >
              <ChevronLeftIcon />
            </Link>
          }
          right={<LanguageButton lang="ko" from="comments" />}
        />

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

// Lucide chevron-left (MIT)
function ChevronLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
