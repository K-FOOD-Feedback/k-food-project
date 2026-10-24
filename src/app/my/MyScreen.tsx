"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getHomePost } from "@/app/home/mockPosts";
import { compactCount } from "@/lib/format";
import { titleIn } from "@/app/home/titles";
import { useViewerUiLang, type UiLang } from "@/app/posts/[id]/viewerLang";
import { useAutoTranslate } from "@/components/LanguagePicker";
import { IconButton } from "@/components/Buttons";
import { Screen, TopBar } from "@/components/Layout";
import { ShareKfoodButton } from "@/components/ShareKfoodButton";
import { track, useTrackOnce } from "@/lib/analytics";
import { MY_POST_ID } from "@/lib/write-data";
import { coverOf, useFlow } from "@/lib/write-store";
import { CommentCard, Empty, LogoutSheet, MyTabs, PhotoTile, TIME, timeAgo } from "./parts";
import { forgetRole } from "@/lib/role";
import { FEEDBACK_BAR_SPACE, FeedbackButton } from "./FeedbackSheet";
import { AccountFooter, GOOGLE_ACCOUNT, AccountMenu, countryFlag, countryName, ProfileHeader, ProfileSheet, useCountry, useNickname } from "./profile";
import { useMt } from "@/lib/useMt";

/*
  7. 마이 · 외국인 /my/en (담당 송희)
  재미 요소 없이 "내 글 · 내 한마디를 빠르게 확인"하는 화면
  - 프로필: 랜덤 닉네임 › · 나라 (프로필 사진 없음). › 누르면 닉네임 바꾸기 시트
  - 맨 아래 회색 작은 글씨: Google 계정
  - Posts / Comments 탭
    · Posts: 2열 사진 타일 (음식 사진이 주인공) + 받은 투표 칩 → 상세
    · Comments: 알림함과 같은 카드 (왼쪽 그 글 사진 · 한마디 · 어느 글에 썼는지 · 시간) → 그 한마디 상세(레이어)
  - 오른쪽 위 ⋯: 로그아웃 · 계정 삭제 (알림은 메인 🔔에 있어서 여기엔 두지 않음)
  - 쓰다 만 글은 여기 없음 (글 쓰기를 시작할 때 이어 쓰기로 보여 줌)
  서버 전까지: 프로필은 목업(Sam · Canada), 내 글은 이 브라우저의 글 1개, 한마디는 목업
  리뷰용: /my/en?comments=none 으로 열면 한마디가 없는 상태

  ── 경우별 정의 ─────────────────────────────
  [Posts]
  - 없음: 카드 없이 안내 문구 + 중간 크기 버튼(Share your K-food)
  - 제목: 2줄까지, 넘치면 … / 제목이 비면 "Untitled post"
  - 사진이 없으면: 회색 칸 + 이미지 아이콘
  - 받은 투표: 0 → "No votes yet" · 1 → "1 vote" · 9,999까지 "9,999 votes" · 1만부터 줄여서 "12K votes" (src/lib/format.ts)
  [Comments]
  - 없음: 안내 문구 + 중간 크기 버튼(Browse posts → 외국인 메인)
  - 한마디: 2줄까지, 넘치면 …
  - 어느 글: "On 글 제목" / 내 글 댓글에 단 답글이면 "Reply on 글 제목" · 1줄, 넘치면 …
  - 글이 지워졌으면: "On a deleted post", 사진 자리는 회색, 누를 수 없음(화살표 없음). 카드는 흐리게 하지 않음 (읽은 것처럼 보여 헷갈림)
  - 시간 (timeAgo):
      1분 안 "Just now" · 1시간 안 "5m" · 24시간 안 "3h" · 48시간 안 "Yesterday"
      · 7일 안 "3d" · 올해 "Oct 10" · 작년 이전 "Oct 10, 2025"
*/


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

/* 화면 언어 = 지구본에서 고른 언어(외국인 기억 kfood:viewer-lang), 남의 글 제목 = 자동 번역이면 화면 언어 · 아니면 원문(영어) — 메인·상세와 같은 규칙 */
const COPY: Record<
  UiLang,
  {
    back: string;
    activity: string;
    posts: string;
    comments: string;
    untitled: string;
    noPosts: string;
    noPostsBody: string;
    share: string;
    noComments: string;
    noCommentsBody: string;
    browse: string;
    on: (title: string) => string;
    replyOn: (title: string) => string;
    deleted: string;
    noVotes: string;
    votes: (n: number, compact: string) => string;
  }
> = {
  en: {
    back: "Back",
    activity: "My activity",
    posts: "Posts",
    comments: "Comments",
    untitled: "Untitled post",
    noPosts: "No posts yet",
    noPostsBody: "Share your K-food and Koreans will vote on it.",
    share: "Share your K-food",
    noComments: "No comments yet",
    noCommentsBody: "Comments you leave on posts will show up here.",
    browse: "Browse posts",
    on: (t) => `On ${t}`,
    replyOn: (t) => `Reply on ${t}`,
    deleted: "On a deleted post",
    noVotes: "No votes yet",
    votes: (n, c) => (n === 1 ? "1 vote" : `${c} votes`),
  },
  ko: {
    back: "뒤로",
    activity: "내 활동",
    posts: "내 글",
    comments: "한마디",
    untitled: "제목 없는 글",
    noPosts: "아직 쓴 글이 없어요",
    noPostsBody: "내 한식을 공유하면 한국인들이 투표해 줘요.",
    share: "내 한식 공유하기",
    noComments: "아직 남긴 한마디가 없어요",
    noCommentsBody: "글에 남긴 한마디가 여기 모여요.",
    browse: "둘러보기",
    on: (t) => t,
    replyOn: (t) => `답글 · ${t}`,
    deleted: "삭제된 글",
    noVotes: "아직 투표 없음",
    votes: (_, c) => `${c}표`,
  },
  zh: {
    back: "返回",
    activity: "我的动态",
    posts: "我的帖子",
    comments: "评论",
    untitled: "无标题帖子",
    noPosts: "还没有发过帖子",
    noPostsBody: "分享你的韩食，让韩国人来投票吧。",
    share: "分享你的韩食",
    noComments: "还没有留下评论",
    noCommentsBody: "你在帖子下留的评论会出现在这里。",
    browse: "随便看看",
    on: (t) => t,
    replyOn: (t) => `回复 · ${t}`,
    deleted: "已删除的帖子",
    noVotes: "还没有投票",
    votes: (_, c) => `${c}票`,
  },
  zht: {
    back: "返回",
    activity: "我的動態",
    posts: "我的帖子",
    comments: "評論",
    untitled: "無標題帖子",
    noPosts: "還沒有發過帖子",
    noPostsBody: "分享你的韓食，讓韓國人來投票吧。",
    share: "分享你的韓食",
    noComments: "還沒有留下評論",
    noCommentsBody: "你在帖子下留的評論會出現在這裡。",
    browse: "隨便看看",
    on: (t) => t,
    replyOn: (t) => `回覆 · ${t}`,
    deleted: "已刪除的帖子",
    noVotes: "還沒有投票",
    votes: (_, c) => `${c}票`,
  },
  ja: {
    back: "戻る",
    activity: "マイアクティビティ",
    posts: "投稿",
    comments: "コメント",
    untitled: "タイトルなし",
    noPosts: "まだ投稿がありません",
    noPostsBody: "あなたの韓国料理をシェアすると、韓国人が投票してくれます。",
    share: "あなたの韓国料理をシェア",
    noComments: "まだコメントがありません",
    noCommentsBody: "投稿に残したコメントがここに集まります。",
    browse: "見てみる",
    on: (t) => t,
    replyOn: (t) => `返信 · ${t}`,
    deleted: "削除された投稿",
    noVotes: "まだ投票なし",
    votes: (_, c) => `${c}票`,
  },
};

/** 받은 투표 — 숫자는 앱 공통 규칙 (9,999까지 그대로 · 1.2만 · 1.2万 · 12K) */
function votesLabel(n: number, lang: UiLang) {
  const T = COPY[lang];
  if (n === 0) return T.noVotes;
  return T.votes(n, compactCount(n, lang));
}

type Tab = "posts" | "comments";

export function MyScreen({ noComments = false }: { noComments?: boolean }) {
  useMt();
  const router = useRouter();
  const { myPost, logOut, deleteMyPost, discardDraft } = useFlow();
  const nickname = useNickname("en");
  const ui = useViewerUiLang();
  const content: UiLang = useAutoTranslate() ? ui : "en";
  const T = COPY[ui];
  const country = useCountry() || "CA"; // 가입 때 고른 나라 (없으면 목업 캐나다)
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");
  const [logoutOpen, setLogoutOpen] = useState(false);

  const posts = myPost
    ? [{ id: MY_POST_ID, title: myPost.title.trim() || T.untitled, photo: coverOf(myPost)?.src, votes: myPost.votes }]
    : [];

  // 한마디가 달린 글 — 내 글은 이 브라우저의 글, 남의 글은 목업 목록. 못 찾으면 지워진 글
  // 시간은 화면을 연 순간 기준 (서버·브라우저 결과가 같도록 처음 한 번만 잼)
  const [now] = useState(() => Date.now());
  const comments = noComments
    ? []
    : MY_COMMENTS.map((c) => {
        const home = getHomePost(c.postId);
        const title = c.postId === MY_POST_ID ? myPost?.title : home && titleIn(home, content);
        const photo = c.postId === MY_POST_ID ? (myPost ? coverOf(myPost)?.src : undefined) : home?.cardPhoto;
        return { ...c, postTitle: title ?? null, photo, time: timeAgo(now - c.ago, now, ui) };
      });

  useTrackOnce("my_page_viewed", { viewer: "foreigner", posts: posts.length, comments: comments.length });

  // 계정 삭제 (⋯ 메뉴에서 한 번 더 물은 뒤)
  const deleteAccount = () => {
    deleteMyPost();
    discardDraft();
    forgetRole(); // 다음에 / 로 오면 메인이 아니라 랜딩부터
    logOut();
    router.push("/");
  };

  return (
    <Screen className={FEEDBACK_BAR_SPACE}>
      <TopBar
        left={<IconButton icon="chevron-left" label={T.back} href="/home?lang=en" />}
        // ⋯ — 로그아웃 · 계정 삭제
        right={<AccountMenu lang="en" ui={ui} onLogout={() => setLogoutOpen(true)} onDelete={deleteAccount} />}
      />

      <ProfileHeader
        lang="en"
        ui={ui}
        nickname={nickname}
        line={`${countryFlag(country)} ${countryName(country, ui)}`}
        onOpen={() => {
          track("my_item_clicked", { item: "profile", viewer: "foreigner" });
          setProfileOpen(true);
        }}
      />

      <MyTabs
        lang={ui}
        label={T.activity}
        tabs={[
          ["posts", T.posts, posts.length],
          ["comments", T.comments, comments.length],
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
              title={T.noPosts}
              body={T.noPostsBody}
              // 메인의 Share 버튼과 같은 흐름 (로그인 → 가입 → 이어 쓰기 → 사진 고르기), 모양은 빈 화면 공통 버튼
              action={{
                render: (className) => (
                  <ShareKfoodButton from="my-en" className={className}>
                    {T.share}
                  </ShareKfoodButton>
                ),
              }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 px-1">
              {posts.map((p) => (
                <PhotoTile
                  key={p.id}
                  href={`/posts/${p.id}?from=my-en`}
                  onClick={() => track("my_item_clicked", { item: "post", viewer: "foreigner" })}
                  photo={p.photo}
                  chip={votesLabel(p.votes, ui)}
                  chipStrong={p.votes > 0}
                  title={p.title}
                />
              ))}
            </div>
          ))}

        {tab === "comments" &&
          (comments.length === 0 ? (
            <Empty
              title={T.noComments}
              body={T.noCommentsBody}
              action={{
                label: T.browse,
                href: "/home?lang=en",
                onClick: () => track("my_item_clicked", { item: "browse", viewer: "foreigner" }),
              }}
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
                  where={c.postTitle === null ? T.deleted : (c.reply ? T.replyOn : T.on)(c.postTitle)}
                />
              ))}
            </div>
          ))}
      </div>

      {/* 문의·의견 + 계정 줄 — 화면 아래 고정 */}
      <FeedbackButton ui={ui} viewer="foreigner">
        <AccountFooter lang="en" ui={ui} email={GOOGLE_ACCOUNT.en.email} className="mt-4" />
      </FeedbackButton>

      <ProfileSheet
        lang="en"
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
          track("logged_out", { from: "my", viewer: "foreigner" });
          logOut();
          router.push("/home?lang=en");
        }}
      />
    </Screen>
  );
}
