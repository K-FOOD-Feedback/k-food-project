"use client";

import Link from "next/link";
import { useState } from "react";
import { LanguageButton } from "@/components/LanguagePicker";
import { HEADER_BUTTON, PageHeader } from "@/components/PageHeader";
import { CommentPile } from "../CommentPile";
import { useCommentLogin } from "../CommentLogin";
import { COMMENTS_COPY, type Lang } from "../copy";
import { saveKoreanLang, saveViewerLang, useKoreanLang, useViewerLang } from "../viewerLang";

/**
  한마디 전체 화면의 상단 바 + 한마디 칸.
  지구본으로 언어를 고르면 메인으로 가지 않고 이 화면 글자만 그 언어로 바뀝니다.
  (영어에서 자동 번역이 켜져 있으면 한마디도 영어로 — CommentPile)
  고른 언어는 주소 ?lang= 에 남겨 새로 고쳐도 그대로입니다.
  외국인은 상세 화면과 같은 언어 설정(viewerLang, 기본 영어)을 함께 쓰고, 한마디·답글을 남기려면 로그인합니다.
*/
export function CommentsScreen({
  initialLang,
  foreigner = false,
  backHref,
  backTo,
  postId,
  commentCount,
  authorFlag,
  authorColor,
  title,
}: {
  /** 주소 ?lang= 으로 정해진 언어 (없으면 null → 저장된 언어) */
  initialLang: Lang | null;
  /** 외국인 화면 (?viewer=en) */
  foreigner?: boolean;
  backHref: string;
  /** 뒤로 가기가 어디로 가는지 (버튼 이름용) */
  backTo: "detail" | "notifications" | "other";
  postId: string;
  commentCount: number;
  authorFlag: string;
  /** 글쓴이 한마디 말풍선 색 (그 글의 카드 색) */
  authorColor?: string;
  /** 안 씀 — 한마디에는 닉네임을 보여 주지 않음 (내 글 화면 MyPostDetail이 아직 넘겨서 받아만 둠) */
  authorName?: string;
  title: Record<Lang, string>;
}) {
  // 한국인도 상세 화면과 같은 언어 설정(koreanLang, 기본 한국어)을 함께 씁니다 — 상세에서 고른 언어가 여기서도 이어짐.
  // 주소에 ?lang= 이 있으면(공유 링크 등) 이번 화면에서는 그 언어로 시작합니다.
  const [urlLang, setUrlLang] = useState<Lang | null>(initialLang);
  const koreanLang = useKoreanLang();
  const viewerLang = useViewerLang();
  const lang = foreigner ? viewerLang : (urlLang ?? koreanLang);
  const t = COMMENTS_COPY[lang];
  const login = useCommentLogin({ enabled: foreigner, lang, postId, screen: "comments" });

  const changeLang = (next: Lang) => {
    if (foreigner) saveViewerLang(next);
    else {
      saveKoreanLang(next);
      setUrlLang(null);
    }
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
          authorColor={authorColor}
          postTitle={title[lang]}
          variant="full"
          lang={lang}
          writeLocked={login.locked}
          onLockedWrite={login.ask}
        />
      </div>
      {login.sheet}
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
