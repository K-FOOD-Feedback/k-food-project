import { notFound } from "next/navigation";
import { getHomePost } from "@/app/home/mockPosts";
import { MyPostComments } from "@/app/write/MyPostDetail";
import { MY_POST_ID } from "@/lib/write-data";
import { backHrefFrom } from "@/lib/back";
import { paperlogy } from "../font";
import { CommentsScreen } from "./CommentsScreen";
import { VoteGate } from "./VoteGate";

/**
  4. 댓글 전체 화면 (Figma 332:3245)
  상세 화면의 댓글 영역과 같은 댓글·같은 인터랙션을, 화면 높이를 다 써서 크게 보여 줍니다.
  댓글 칸을 스크롤하면 그라데이션 아래로 묻힌 예전 댓글도 볼 수 있습니다.
  투표한 사람만 볼 수 있습니다 (VoteGate).
  지구본으로 언어를 바꾸면 이 화면 글자만 바뀝니다 (CommentsScreen).
*/
export default async function Page(props: PageProps<"/posts/[id]/comments">) {
  const { id } = await props.params;
  // 알림함에서 들어왔으면 뒤로가기는 알림함으로 (송희) — 그 외에는 원래대로 상세로
  const sp = await props.searchParams;
  // 외국인은 투표를 못 해서 투표 없이 한마디를 봄 (송희·지현 합의) — 외국인 화면에서 온 링크는 ?viewer=en
  const foreigner = sp.viewer === "en" || sp.from === "notifications-en";
  // 외국인은 외국인 상세로 돌아감
  const detailHref = foreigner ? `/posts/${id}?viewer=en` : `/posts/${id}`;
  const backHref = backHrefFrom(sp.from, detailHref);
  // 내가 올린 글(송희) — 같은 댓글 화면 모양으로
  if (id === MY_POST_ID) return <MyPostComments backHref={backHref} />;
  const post = getHomePost(id);
  if (!post) notFound();
  // 화면 언어: 지구본으로 고른 언어(?lang=). 외국인은 상세에서 고른 언어를 따름 (CommentsScreen)
  const lang = sp.lang === "en" || sp.lang === "ko" ? sp.lang : "ko";

  return (
    <VoteGate postId={post.id} open={foreigner}>
      <main
        className={`${paperlogy.variable} mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background text-on-dark`}
      >
        <CommentsScreen
          initialLang={lang}
          foreigner={foreigner}
          backHref={backHref}
          isDetailBack={backHref === detailHref}
          postId={post.id}
          commentCount={post.commentCount}
          authorFlag={post.author.flag}
          title={{ ko: post.title, en: post.en.title }}
        />
      </main>
    </VoteGate>
  );
}
