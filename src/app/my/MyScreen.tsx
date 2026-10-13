"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { getHomePost } from "@/app/home/mockPosts";
import { IconButton, PillButton } from "@/components/Buttons";
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
    · Comments: 상세 화면 한마디와 같은 말풍선 + 어느 글에 썼는지 → 상세
  - 오른쪽 위는 로그아웃만 (알림은 메인 🔔에 있어서 여기엔 두지 않음)
  - 쓰다 만 글은 여기 없음 (글 쓰기를 시작할 때 이어 쓰기로 보여 줌)
  서버 전까지: 프로필은 목업(Sam · Canada), 내 글은 이 브라우저의 글 1개, 한마디는 목업
*/
const PROFILE = { name: "Sam", country: "Canada", flag: "🇨🇦" };

/** 내가 쓴 한마디 — 목업 (외국인 화면에서 한마디 쓰기가 붙으면 실제 기록으로) */
const MY_COMMENTS: { id: string; postId: string; text: string; reply: boolean; time: string }[] = [
  { id: "c1", postId: MY_POST_ID, text: "Thanks! I'll try it with rice next time 🍚", reply: true, time: "2h" },
  { id: "c2", postId: "2", text: "Cheese is never too much 🧀", reply: false, time: "Yesterday" },
  { id: "c3", postId: "3", text: "Looks so good, I need the recipe!", reply: false, time: "Oct 10" },
];

// 말풍선 색 — 상세 화면 한마디처럼 하나씩 다르게
const BUBBLES = ["bg-content", "bg-lilac", "bg-secondary", "bg-primary"];

type Tab = "posts" | "comments";

export function MyScreen() {
  const router = useRouter();
  const { myPost, logOut } = useFlow();
  const [tab, setTab] = useState<Tab>("posts");
  const [sheet, setSheet] = useState<"logout" | null>(null);

  const posts = myPost ? [{ id: MY_POST_ID, title: myPost.title, photo: coverOf(myPost)?.src, votes: myPost.votes }] : [];

  // 한마디가 달린 글 (내 글은 이 브라우저의 글, 남의 글은 목업 목록에서)
  const comments = MY_COMMENTS.flatMap((c) => {
    if (c.postId === MY_POST_ID) return myPost ? [{ ...c, postTitle: myPost.title }] : [];
    const p = getHomePost(c.postId);
    return p ? [{ ...c, postTitle: p.en.title }] : [];
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
                <PillButton
                  tone="primary"
                  href="/write"
                  className="h-12 w-full flex-none"
                  onClick={() => track("my_item_clicked", { item: "write" })}
                >
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
                    {p.photo && (
                      <Image src={p.photo} alt="" fill sizes="200px" unoptimized={p.photo.startsWith("blob:")} className="object-cover" />
                    )}
                    {/* 받은 투표 */}
                    <span
                      className={`absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums ${
                        p.votes > 0 ? "bg-content text-on-light" : "bg-background/80 text-on-dark"
                      }`}
                    >
                      {p.votes > 0 ? `${p.votes} voted` : "No votes yet"}
                    </span>
                  </span>
                  <span className="line-clamp-2 px-1 text-[14px] font-semibold leading-[1.35]">{p.title}</span>
                </Link>
              ))}
            </div>
          ))}

        {tab === "comments" &&
          (comments.length === 0 ? (
            <Empty title="No comments yet" body="Comments you leave on posts will show up here." />
          ) : (
            <div className="flex flex-col gap-5 px-2">
              {comments.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/posts/${c.postId}`}
                  onClick={() => track("my_item_clicked", { item: "comment", reply: c.reply })}
                  className="flex flex-col items-start gap-1.5 transition active:scale-[0.99]"
                >
                  {/* 상세 화면 한마디와 같은 말풍선 */}
                  <span
                    className={`max-w-[85%] rounded-[22px] rounded-bl-[6px] px-4 py-2.5 text-[15px] font-semibold leading-[1.4] text-on-light ${
                      BUBBLES[i % BUBBLES.length]
                    }`}
                  >
                    {c.text}
                  </span>
                  <span className="flex w-full items-center gap-1 px-1 text-[13px] text-muted">
                    <span className="line-clamp-1 min-w-0">
                      {c.reply ? "Reply on" : "On"} {c.postTitle}
                    </span>
                    <span className="shrink-0">· {c.time}</span>
                  </span>
                </Link>
              ))}
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
    <div className="flex flex-col items-center gap-4 rounded-[24px] bg-surface px-6 py-8 text-center">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="text-[14px] leading-[1.5] text-muted">{body}</p>
      </div>
      {cta}
    </div>
  );
}
