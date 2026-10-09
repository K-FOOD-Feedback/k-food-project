import Link from "next/link";
import { notFound } from "next/navigation";
import { getHomePost } from "@/app/home/mockPosts";
import { TrackedLink } from "@/components/Track";
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
  const post = getHomePost(id);
  if (!post) notFound();

  const circle = "flex size-16 items-center justify-center rounded-full bg-white/8";

  return (
    <VoteGate postId={post.id}>
      <main
        className={`${paperlogy.variable} mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background text-on-dark`}
      >
        <header className="flex shrink-0 items-center justify-between px-2 pt-[calc(16px+env(safe-area-inset-top))] pb-4">
          <Link href={`/posts/${id}`} aria-label="상세로 돌아가기" className={circle}>
            <ChevronLeftIcon />
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

// Lucide chevron-left (MIT)
function ChevronLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
