"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { IconButton, PillButton } from "@/components/Buttons";
import { Icon, type IconName } from "@/components/Icon";
import { BottomSheet, Screen, Tile, TopBar } from "@/components/Layout";
import { track, useTrackOnce } from "@/lib/analytics";
import { MY_POST_ID } from "@/lib/write-data";
import { coverOf, useFlow, type DraftStep } from "@/lib/write-store";

/*
  7. 마이 · 외국인 /my/en (담당 송희)
  재미 요소 없이 "내 정보를 빠르게 확인"하는 화면
  - 프로필 (이름 · 나라)
  - 숫자 한 줄: 올린 글 · 받은 투표 · 받은 한마디
  - 쓰다 만 글 (있을 때만) → 저장한 단계로 이어서 쓰기
  - 내 글 목록 → 상세 화면
  - 설정: 알림 · 로그아웃 · 계정 삭제
  서버 전까지: 프로필은 목업(Sam · Canada), 글은 이 브라우저에 있는 내 글 1개
*/
const PROFILE = { name: "Sam", country: "Canada", flag: "🇨🇦" };

const STEP_HREF: Record<DraftStep, string> = { photos: "/write", post: "/write/post", vote: "/write/vote" };
const STEP_LABEL: Record<DraftStep, string> = { photos: "Photos", post: "Your post", vote: "Ask Koreans" };

export function MyScreen() {
  const router = useRouter();
  const { myPost, draft, logOut, deleteMyPost, discardDraft } = useFlow();
  const [sheet, setSheet] = useState<"logout" | "delete" | null>(null);

  const posts = myPost ? [myPost] : [];
  const hasDraft = draft.savedStep !== null && draft.photos.length > 0;
  const votes = posts.reduce((n, p) => n + p.votes, 0);
  const comments = posts.reduce((n, p) => n + p.comments, 0);

  useTrackOnce("my_page_viewed", { posts: posts.length, has_draft: hasDraft });

  return (
    <Screen className="pb-16">
      <TopBar title="My" left={<IconButton icon="chevron-left" label="Back" href="/home/en" />} />

      <div className="flex flex-col gap-8 px-2">
        {/* 프로필 + 숫자 */}
        <Tile>
          <div className="flex items-center gap-4 px-5 pt-5 pb-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-lilac font-display text-[24px] text-on-light">
              {PROFILE.name[0]}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="truncate font-display text-[22px] leading-[1.15]">{PROFILE.name}</p>
              <p className="text-[14px] text-muted">
                {PROFILE.flag} {PROFILE.country} · Google account
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-3 rounded-[28px] bg-surface-2 py-4">
            <Stat label="Posts" value={posts.length} />
            <Stat label="Votes" value={votes} divided />
            <Stat label="Comments" value={comments} divided />
          </dl>
        </Tile>

        {/* 쓰다 만 글 */}
        {hasDraft && draft.savedStep && (
          <Section title="Unfinished">
            <Row
              href={STEP_HREF[draft.savedStep]}
              onClick={() => track("my_item_clicked", { item: "draft", step: draft.savedStep })}
              thumb={coverOf(draft)?.src}
              title={draft.title || "Untitled post"}
              meta={`Saved at ${STEP_LABEL[draft.savedStep]} · Continue writing`}
            />
          </Section>
        )}

        {/* 내 글 */}
        <Section title="My posts">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-[24px] bg-surface px-6 py-8 text-center">
              <div className="flex flex-col gap-1">
                <p className="text-[15px] font-semibold">No posts yet</p>
                <p className="text-[14px] leading-[1.5] text-muted">Share your K-food and Koreans will vote on it.</p>
              </div>
              <PillButton
                tone="primary"
                href="/write"
                className="h-12 w-full flex-none"
                onClick={() => track("my_item_clicked", { item: "write" })}
              >
                Share your K-food
              </PillButton>
            </div>
          ) : (
            posts.map((p) => (
              <Row
                key={MY_POST_ID}
                href={`/posts/${MY_POST_ID}`}
                onClick={() => track("my_item_clicked", { item: "post" })}
                thumb={coverOf(p)?.src}
                title={p.title}
                meta={`${p.votes} ${p.votes === 1 ? "vote" : "votes"} · ${p.comments} ${p.comments === 1 ? "comment" : "comments"}`}
              />
            ))
          )}
        </Section>

        {/* 설정 */}
        <Section title="Settings">
          <div className="flex flex-col overflow-hidden rounded-[24px] bg-surface">
            <SettingRow icon="bell" label="Notifications" href="/notifications/en" onClick={() => track("my_item_clicked", { item: "notifications" })} />
            <SettingRow icon="log-out" label="Log out" onClick={() => setSheet("logout")} />
            <SettingRow icon="trash" label="Delete account" danger onClick={() => setSheet("delete")} />
          </div>
        </Section>
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

      {/* 계정 삭제 확인 */}
      <BottomSheet open={sheet === "delete"} onClose={() => setSheet(null)} label="Delete account">
        <div className="flex w-full flex-col gap-2 px-6 pt-2">
          <h2 className="font-display text-[22px] leading-[1.25]">Delete your account?</h2>
          <p className="text-[15px] leading-[1.5] text-muted">
            Your posts, votes and comments will be deleted. This can&apos;t be undone.
          </p>
        </div>
        <div className="flex w-full gap-1">
          <PillButton tone="soft" onClick={() => setSheet(null)}>
            Cancel
          </PillButton>
          <PillButton
            tone="error"
            onClick={() => {
              track("account_deleted", { posts: posts.length });
              deleteMyPost();
              discardDraft();
              logOut();
              router.push("/");
            }}
          >
            Delete
          </PillButton>
        </div>
      </BottomSheet>
    </Screen>
  );
}

function Stat({ label, value, divided = false }: { label: string; value: number; divided?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${divided ? "border-l border-white/10" : ""}`}>
      <dt className="order-2 text-[13px] text-muted">{label}</dt>
      <dd className="order-1 font-display text-[22px] leading-none tabular-nums">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-4 font-display text-[20px] leading-[1.2]">{title}</h2>
      {children}
    </section>
  );
}

/** 글 한 줄 — 왼쪽 물결 모양 사진 (알림함과 같은 모양) */
function Row({
  href,
  onClick,
  thumb,
  title,
  meta,
}: {
  href: string;
  onClick: () => void;
  thumb?: string;
  title: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3.5 rounded-[24px] bg-surface py-4 pl-4 pr-3 transition active:scale-[0.99]"
    >
      <span
        className="relative size-14 shrink-0 bg-surface-2"
        style={{
          maskImage: "url(/images/card-mask.svg)",
          WebkitMaskImage: "url(/images/card-mask.svg)",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }}
        aria-hidden="true"
      >
        {thumb && <Image src={thumb} alt="" fill sizes="56px" unoptimized={thumb.startsWith("blob:")} className="object-cover" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 text-[15px] font-semibold leading-[1.4]">{title}</span>
        <span className="text-[13px] tabular-nums text-muted">{meta}</span>
      </span>
      <Icon name="chevron-right" size={18} className="shrink-0 text-muted" />
    </Link>
  );
}

function SettingRow({
  icon,
  label,
  href,
  onClick,
  danger = false,
}: {
  icon: IconName;
  label: string;
  href?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const cls = `flex h-14 w-full items-center gap-3 px-5 text-left text-[15px] font-semibold transition active:bg-surface-2 [&+&]:border-t [&+&]:border-white/5 ${
    danger ? "text-error" : ""
  }`;
  const inner = (
    <>
      <Icon name={icon} size={20} />
      <span className="flex-1">{label}</span>
      {href && <Icon name="chevron-right" size={18} className="text-muted" />}
    </>
  );
  return href ? (
    <Link href={href} onClick={onClick} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
