"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getHomePost } from "@/app/home/mockPosts";
import { IconButton, PillButton } from "@/components/Buttons";
import { Screen, TopBar } from "@/components/Layout";
import { ShareKfoodButton } from "@/components/ShareKfoodButton";
import { track, useTrackOnce } from "@/lib/analytics";
import { MY_POST_ID } from "@/lib/write-data";
import { coverOf, useFlow } from "@/lib/write-store";
import { CommentCard, Empty, LogoutSheet, MyTabs, PhotoTile, TIME, timeAgo } from "./parts";
import { forgetRole } from "@/lib/role";
import { AccountFooter, countryFlag, countryName, ProfileHeader, ProfileSheet, useCountry, useNickname } from "./profile";

/*
  7. 마이 · 외국인 /my/en (담당 송희)
  재미 요소 없이 "내 글 · 내 한마디를 빠르게 확인"하는 화면
  - 프로필: 랜덤 닉네임 › · 나라 (프로필 사진 없음). › 누르면 닉네임 바꾸기 시트
  - 맨 아래 회색 작은 글씨: Google 계정 · 계정 삭제
  - Posts / Comments 탭
    · Posts: 2열 사진 타일 (음식 사진이 주인공) + 받은 투표 칩 → 상세
    · Comments: 알림함과 같은 카드 (왼쪽 그 글 사진 · 한마디 · 어느 글에 썼는지 · 시간) → 그 한마디 상세(레이어)
  - 오른쪽 위는 로그아웃만 (알림은 메인 🔔에 있어서 여기엔 두지 않음)
  - 쓰다 만 글은 여기 없음 (글 쓰기를 시작할 때 이어 쓰기로 보여 줌)
  서버 전까지: 프로필은 목업(Sam · Canada), 내 글은 이 브라우저의 글 1개, 한마디는 목업
  리뷰용: /my/en?comments=none 으로 열면 한마디가 없는 상태

  ── 경우별 정의 ─────────────────────────────
  [Posts]
  - 없음: 카드 없이 안내 문구 + 중간 크기 버튼(Share your K-food)
  - 제목: 2줄까지, 넘치면 … / 제목이 비면 "Untitled post"
  - 사진이 없으면: 회색 칸 + 이미지 아이콘
  - 받은 투표: 0 → "No votes yet" · 1 → "1 vote" · 2~999 → "12 votes" · 1,000부터 줄여서 "1.2K votes"
  [Comments]
  - 없음: 안내 문구 + 중간 크기 버튼(Browse posts → 외국인 메인)
  - 한마디: 2줄까지, 넘치면 …
  - 어느 글: "On 글 제목" / 내 글 댓글에 단 답글이면 "Reply on 글 제목" · 1줄, 넘치면 …
  - 글이 지워졌으면: "On a deleted post", 사진 자리는 회색, 누를 수 없음(화살표 없음). 카드는 흐리게 하지 않음 (읽은 것처럼 보여 헷갈림)
  - 시간 (timeAgo):
      1분 안 "Just now" · 1시간 안 "5m" · 오늘 "3h" · 어제 "Yesterday"
      · 7일 안 "3d" · 올해 "Oct 10" · 작년 이전 "Oct 10, 2025"
*/

const PROFILE = { email: "sam.taylor@gmail.com" };

/**
 * 내가 쓴 한마디 — 목업 (외국인 화면에서 한마디 쓰기가 붙으면 실제 기록으로). 위 경우들이 다 보이게 구성
 * id는 한마디 목록(posts/[id]/comments.ts)에 실제로 있는 것과 맞춰서, 누르면 그 한마디 레이어가 열림
 * (목업 id인 c3·c4는 레이어 없이 한마디 화면만 열림)
 */
const MY_COMMENTS: { id: string; postId: string; text: string; reply: boolean; ago: number }[] = [
  { id: "mine-seed-9", postId: MY_POST_ID, text: "고마워요 다음에 시도해볼게요!", reply: true, ago: 2 * TIME.HOUR },
  { id: "2-seed-8", postId: "2", text: "치즈는 많을수록 맛있죠!", reply: true, ago: TIME.DAY + 3 * TIME.HOUR },
  {
    id: "c3",
    postId: "4",
    text: "In Canada we eat it late at night, never for breakfast 😂 Is it really a breakfast thing in Korea? I need to know before my trip next month!",
    reply: false,
    ago: 3 * TIME.DAY,
  },
  { id: "c4", postId: "3", text: "Looks so good, I need the recipe!", reply: false, ago: 40 * TIME.DAY },
  { id: "c5", postId: "deleted", text: "Too much gochujang 🌶️", reply: false, ago: 400 * TIME.DAY },
];

/** 받은 투표 — 위 "받은 투표" 규칙 */
function votesLabel(n: number) {
  if (n === 0) return "No votes yet";
  if (n === 1) return "1 vote";
  return `${n < 1000 ? n : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)} votes`;
}

type Tab = "posts" | "comments";

export function MyScreen({ noComments = false }: { noComments?: boolean }) {
  const router = useRouter();
  const { myPost, logOut, deleteMyPost, discardDraft } = useFlow();
  const nickname = useNickname("en");
  const country = useCountry() || "CA"; // 가입 때 고른 나라 (없으면 목업 캐나다)
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");
  const [logoutOpen, setLogoutOpen] = useState(false);

  const posts = myPost
    ? [{ id: MY_POST_ID, title: myPost.title.trim() || "Untitled post", photo: coverOf(myPost)?.src, votes: myPost.votes }]
    : [];

  // 한마디가 달린 글 — 내 글은 이 브라우저의 글, 남의 글은 목업 목록. 못 찾으면 지워진 글
  // 시간은 화면을 연 순간 기준 (서버·브라우저 결과가 같도록 처음 한 번만 잼)
  const [now] = useState(() => Date.now());
  const comments = noComments
    ? []
    : MY_COMMENTS.map((c) => {
        const home = getHomePost(c.postId);
        const title = c.postId === MY_POST_ID ? myPost?.title : home?.en.title;
        const photo = c.postId === MY_POST_ID ? (myPost ? coverOf(myPost)?.src : undefined) : home?.cardPhoto;
        return { ...c, postTitle: title ?? null, photo, time: timeAgo(now - c.ago, now, "en") };
      });

  useTrackOnce("my_page_viewed", { viewer: "foreigner", posts: posts.length, comments: comments.length });

  return (
    <Screen className="pb-16">
      <TopBar
        left={<IconButton icon="chevron-left" label="Back" href="/home?lang=en" />}
        right={
          <IconButton
            icon="log-out"
            label="Log out"
            onClick={() => {
              track("my_item_clicked", { item: "logout", viewer: "foreigner" });
              setLogoutOpen(true);
            }}
          />
        }
      />

      <ProfileHeader
        lang="en"
        nickname={nickname}
        line={`${countryFlag(country)} ${countryName(country)}`}
        onOpen={() => {
          track("my_item_clicked", { item: "profile", viewer: "foreigner" });
          setProfileOpen(true);
        }}
      />

      <MyTabs
        label="My activity"
        tabs={[
          ["posts", "Posts", posts.length],
          ["comments", "Comments", comments.length],
        ]}
        value={tab}
        onChange={(id) => {
          track("my_item_clicked", { item: `tab_${id}`, viewer: "foreigner" });
          setTab(id);
        }}
      />

      <div key={tab} className="animate-fade-in px-2 pt-4">
        {tab === "posts" &&
          (posts.length === 0 ? (
            <Empty
              title="No posts yet"
              body="Share your K-food and Koreans will vote on it."
              cta={
                // 메인의 Share 버튼과 같은 흐름 (로그인 → 가입 → 이어 쓰기 → 사진 고르기). 모양은 PillButton md primary와 같게
                <ShareKfoodButton
                  from="my-en"
                  className="flex h-12 flex-none items-center justify-center rounded-full bg-primary px-6 text-[15px] font-semibold leading-[1.5] text-on-light transition active:scale-[0.99]"
                >
                  Share your K-food
                </ShareKfoodButton>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {posts.map((p) => (
                <PhotoTile
                  key={p.id}
                  href={`/posts/${p.id}?from=my-en`}
                  onClick={() => track("my_item_clicked", { item: "post", viewer: "foreigner" })}
                  photo={p.photo}
                  chip={votesLabel(p.votes)}
                  chipStrong={p.votes > 0}
                  title={p.title}
                />
              ))}
            </div>
          ))}

        {tab === "comments" &&
          (comments.length === 0 ? (
            <Empty
              title="No comments yet"
              body="Comments you leave on posts will show up here."
              cta={
                <PillButton
                  tone="soft"
                  size="md"
                  href="/home?lang=en"
                  onClick={() => track("my_item_clicked", { item: "browse", viewer: "foreigner" })}
                >
                  Browse posts
                </PillButton>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {comments.map((c) => (
                <CommentCard
                  key={c.id}
                  href={
                    c.postTitle === null
                      ? undefined
                      : `/posts/${c.postId}/comments?comment=${encodeURIComponent(c.id)}&viewer=en&from=my-en`
                  }
                  onClick={() => track("my_item_clicked", { item: "comment", reply: c.reply, viewer: "foreigner" })}
                  photo={c.photo}
                  text={c.text}
                  time={c.time}
                  where={c.postTitle === null ? "On a deleted post" : `${c.reply ? "Reply on" : "On"} ${c.postTitle}`}
                />
              ))}
            </div>
          ))}
      </div>

      <AccountFooter
        lang="en"
        email={PROFILE.email}
        onDelete={() => {
          deleteMyPost();
          discardDraft();
          forgetRole(); // 다음에 / 로 오면 메인이 아니라 랜딩부터
          logOut();
          router.push("/");
        }}
      />

      <ProfileSheet
        lang="en"
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        nickname={nickname}
      />

      <LogoutSheet
        lang="en"
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          track("logged_out", { from: "my", viewer: "foreigner" });
          logOut();
          router.push("/home?lang=en");
        }}
      />
    </Screen>
  );
}
