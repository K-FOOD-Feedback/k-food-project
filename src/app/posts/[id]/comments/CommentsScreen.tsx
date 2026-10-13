"use client";

import Link from "next/link";
import { useState } from "react";
import { LanguageButton } from "@/components/LanguagePicker";
import { HEADER_BUTTON, PageHeader } from "@/components/PageHeader";
import { CommentPile } from "../CommentPile";
import { COMMENTS_COPY, type Lang } from "../copy";

/**
  한마디 전체 화면의 상단 바 + 한마디 칸.
  지구본으로 언어를 고르면 메인으로 가지 않고 이 화면 글자만 그 언어로 바뀝니다.
  (영어에서 자동 번역이 켜져 있으면 한마디도 영어로 — CommentPile)
  고른 언어는 주소 ?lang= 에 남겨 새로 고쳐도 그대로입니다.
*/
export function CommentsScreen({
  initialLang,
  backHref,
  backTo,
  postId,
  commentCount,
  authorFlag,
  title,
}: {
  initialLang: Lang;
  backHref: string;
  /** 뒤로 가기가 어디로 가는지 (버튼 이름용) */
  backTo: "detail" | "notifications" | "other";
  postId: string;
  commentCount: number;
  authorFlag: string;
  title: Record<Lang, string>;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = COMMENTS_COPY[lang];

  const changeLang = (next: Lang) => {
    setLang(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <>
      {/* 공통 상단 바 (src/components/PageHeader — 모든 화면이 같은 위치·크기·디자인) */}
      <PageHeader
        left={
          <Link href={backHref} aria-label={backTo === "detail" ? t.backToDetail : backTo === "notifications" ? t.backToNotifications : t.back} className={HEADER_BUTTON}>
            <ChevronLeftIcon />
          </Link>
        }
        right={<LanguageButton lang={lang} from="comments" onChange={changeLang} />}
      />

      <div className="flex min-h-0 flex-1 flex-col pb-[calc(24px+env(safe-area-inset-bottom))]">
        <CommentPile
          postId={postId}
          commentCount={commentCount}
          authorFlag={authorFlag}
          postTitle={title[lang]}
          variant="full"
          lang={lang}
        />
      </div>
    </>
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
