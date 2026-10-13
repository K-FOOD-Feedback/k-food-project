"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { getHomePost } from "@/app/home/mockPosts";
import { IconButton, PillButton } from "@/components/Buttons";
import { Icon } from "@/components/Icon";
import { BottomSheet, Screen, TopBar } from "@/components/Layout";
import { track, useTrackOnce } from "@/lib/analytics";
import { MY_POST_ID } from "@/lib/write-data";
import { coverOf, useFlow } from "@/lib/write-store";

/*
  7. 마이 · 외국인 /my/en (담당 송희)
  재미 요소 없이 "내 글 · 내 한마디를 빠르게 확인"하는 화면
  - 프로필: 이름 · 나라만 (프로필 사진은 받지 않음)
  - Posts / Comments 탭
    · Posts: 2열 사진 타일 (음식 사진이 주인공) + 받은 투표 칩 → 상세
    · Comments: 알림함과 같은 카드 (왼쪽 그 글 사진 · 한마디 · 어느 글에 썼는지 · 시간) → 상세
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
const PROFILE = { name: "Sam", country: "Canada", flag: "🇨🇦" };

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** 내가 쓴 한마디 — 목업 (외국인 화면에서 한마디 쓰기가 붙으면 실제 기록으로). 위 경우들이 다 보이게 구성 */
const MY_COMMENTS: { id: string; postId: string; text: string; reply: boolean; ago: number }[] = [
  { id: "c1", postId: MY_POST_ID, text: "Thanks! I'll try it with rice next time 🍚", reply: true, ago: 2 * HOUR },
  { id: "c2", postId: "2", text: "Cheese is never too much 🧀", reply: false, ago: DAY + 3 * HOUR },
  {
    id: "c3",
    postId: "4",
    text: "In Canada we eat it late at night, never for breakfast 😂 Is it really a breakfast thing in Korea? I need to know before my trip next month!",
    reply: false,
    ago: 3 * DAY,
  },
  { id: "c4", postId: "3", text: "Looks so good, I need the recipe!", reply: false, ago: 40 * DAY },
  { id: "c5", postId: "deleted", text: "Too much gochujang 🌶️", reply: false, ago: 400 * DAY },
];

/** 한마디 시간 — 위 "시간" 규칙 */
function timeAgo(at: number, now = Date.now()) {
  const d = now - at;
  if (d < MIN) return "Just now";
  if (d < HOUR) return `${Math.floor(d / MIN)}m`;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (at >= today.getTime()) return `${Math.floor(d / HOUR)}h`;
  if (at >= today.getTime() - DAY) return "Yesterday";
  if (d < 7 * DAY) return `${Math.ceil(d / DAY)}d`;
  const date = new Date(at);
  const sameYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

/** 받은 투표 — 위 "받은 투표" 규칙 */
function votesLabel(n: number) {
  if (n === 0) return "No votes yet";
  if (n === 1) return "1 vote";
  return `${n < 1000 ? n : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)} votes`;
}

const CARD_MASK = {
  maskImage: "url(/images/card-mask.svg)",
  WebkitMaskImage: "url(/images/card-mask.svg)",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
} as const;

type Tab = "posts" | "comments";

export function MyScreen({ noComments = false }: { noComments?: boolean }) {
  const router = useRouter();
  const { myPost, logOut } = useFlow();
  const [tab, setTab] = useState<Tab>("posts");
  const [sheet, setSheet] = useState<"logout" | null>(null);

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
        return { ...c, postTitle: title ?? null, photo, time: timeAgo(now - c.ago, now) };
      });

  useTrackOnce("my_page_viewed", { posts: posts.length, comments: comments.length });

  return (
    <Screen className="pb-16">
      <TopBar
        title="My"
        left={<IconButton icon="chevron-left" label="Back" href="/home/en" />}
        right={
          <IconButton
            icon="log-out"
            label="Log out"
            onClick={() => {
              track("my_item_clicked", { item: "logout" });
              setSheet("logout");
            }}
          />
        }
      />

      {/* 프로필 — 사진 없이 이름 · 나라만 */}
      <div className="flex flex-col gap-1.5 px-6 pt-2 pb-6">
        <p className="font-display text-[32px] leading-[1.1]">{PROFILE.name}</p>
        <p className="text-[15px] text-muted">
          {PROFILE.flag} {PROFILE.country} · Google account
        </p>
      </div>

      {/* 탭 */}
      <div className="px-2">
        <div role="tablist" aria-label="My activity" className="flex rounded-full bg-surface-2 p-1">
          {(
            [
              ["posts", "Posts", posts.length],
              ["comments", "Comments", comments.length],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                if (tab === id) return;
                track("my_item_clicked", { item: `tab_${id}` });
                setTab(id);
              }}
              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[15px] font-bold transition ${
                tab === id ? "bg-on-dark text-on-light" : "text-neutral-400"
              }`}
            >
              {label}
              <span className={`tabular-nums ${tab === id ? "opacity-50" : ""}`}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div key={tab} className="animate-fade-in px-2 pt-4">
        {tab === "posts" &&
          (posts.length === 0 ? (
            <Empty
              title="No posts yet"
              body="Share your K-food and Koreans will vote on it."
              cta={
                <PillButton tone="primary" size="md" href="/write" onClick={() => track("my_item_clicked", { item: "write" })}>
                  Share your K-food
                </PillButton>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/posts/${p.id}`}
                  onClick={() => track("my_item_clicked", { item: "post" })}
                  className="flex flex-col gap-2 rounded-[24px] bg-surface p-2 pb-3 transition active:scale-[0.98]"
                >
                  <span className="relative aspect-square overflow-hidden rounded-[18px] bg-surface-2">
                    {p.photo ? (
                      <Image src={p.photo} alt="" fill sizes="200px" unoptimized={p.photo.startsWith("blob:")} className="object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-muted">
                        <Icon name="image" size={28} />
                      </span>
                    )}
                    {/* 받은 투표 */}
                    <span
                      className={`absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums ${
                        p.votes > 0 ? "bg-content text-on-light" : "bg-background/80 text-on-dark"
                      }`}
                    >
                      {votesLabel(p.votes)}
                    </span>
                  </span>
                  <span className="line-clamp-2 px-1 text-[14px] font-semibold leading-[1.35]">{p.title}</span>
                </Link>
              ))}
            </div>
          ))}

        {tab === "comments" &&
          (comments.length === 0 ? (
            <Empty
              title="No comments yet"
              body="Comments you leave on posts will show up here."
              cta={
                <PillButton tone="soft" size="md" href="/home/en" onClick={() => track("my_item_clicked", { item: "browse" })}>
                  Browse posts
                </PillButton>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {comments.map((c) => {
                const deleted = c.postTitle === null;
                // 알림함 카드와 같은 모양: 왼쪽 그 글 사진 · 한마디(2줄) + 시간 · 어느 글에 썼는지
                const body = (
                  <>
                    <span className="relative size-12 shrink-0 bg-surface-2" style={CARD_MASK} aria-hidden="true">
                      {c.photo && (
                        <Image src={c.photo} alt="" fill sizes="48px" unoptimized={c.photo.startsWith("blob:")} className="object-cover" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-start gap-2">
                        <span className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-[1.4]">{c.text}</span>
                        <span className="shrink-0 pt-0.5 text-[12px] font-medium tabular-nums text-muted">{c.time}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="line-clamp-1 min-w-0 flex-1 text-[13px] leading-[1.45] text-muted">
                          {deleted ? "On a deleted post" : `${c.reply ? "Reply on" : "On"} ${c.postTitle}`}
                        </span>
                        {!deleted && <Icon name="chevron-right" size={16} className="shrink-0 text-muted" />}
                      </span>
                    </span>
                  </>
                );
                const card = "flex items-start gap-3.5 rounded-[24px] bg-surface py-4 pl-4 pr-3";
                return deleted ? (
                  <div key={c.id} className={card}>
                    {body}
                  </div>
                ) : (
                  <Link
                    key={c.id}
                    href={`/posts/${c.postId}`}
                    onClick={() => track("my_item_clicked", { item: "comment", reply: c.reply })}
                    className={`${card} transition active:scale-[0.99]`}
                  >
                    {body}
                  </Link>
                );
              })}
            </div>
          ))}
      </div>

      {/* 로그아웃 확인 */}
      <BottomSheet open={sheet === "logout"} onClose={() => setSheet(null)} label="Log out">
        <div className="flex w-full flex-col gap-2 px-6 pt-2">
          <h2 className="font-display text-[22px] leading-[1.25]">Log out?</h2>
          <p className="text-[15px] leading-[1.5] text-muted">Your posts stay. Log in again with Google anytime.</p>
        </div>
        <div className="flex w-full gap-1">
          <PillButton tone="soft" onClick={() => setSheet(null)}>
            Cancel
          </PillButton>
          <PillButton
            tone="black"
            onClick={() => {
              track("logged_out", { from: "my" });
              logOut();
              router.push("/home/en");
            }}
          >
            Log out
          </PillButton>
        </div>
      </BottomSheet>

    </Screen>
  );
}

function Empty({ title, body, cta }: { title: string; body: string; cta?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-5 px-6 pt-14 text-center">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="text-[14px] leading-[1.5] text-muted">{body}</p>
      </div>
      {cta}
    </div>
  );
}
