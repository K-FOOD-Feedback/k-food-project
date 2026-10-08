"use client";

import { useState, type ReactNode } from "react";
import { FeedCard } from "@/components/FeedCard";
import { Icon } from "@/components/Icon";
import { BottomSheet } from "@/components/Layout";
import { track } from "@/lib/analytics";

/**
 * 게시 직후 "친구에게 공유" 시트 (3. 공유 유도, 담당 송희)
 * - 위: 친구에게 보일 카드 미리보기 + "Vote now" 스티커
 * - 가운데: 링크 복사
 * - 아래: 메시지 · WhatsApp · X · 더보기(휴대폰 기본 공유창)
 * TODO: 서버 연결 후 링크가 실제 글 주소로 열리게 / 카카오톡은 Kakao SDK 앱 키 받으면 추가
 */
export function ShareSheet({
  open,
  onClose,
  postId,
  title,
  photo,
  topic,
  from,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  title: string;
  photo: string;
  topic: string;
  /** 분석용: 어디서 열었는지 */
  from: "posted" | "my_post";
}) {
  const [copied, setCopied] = useState(false);
  // 시트는 버튼을 누른 뒤(브라우저에서만) 열리므로 여기서 주소를 읽어도 됩니다
  const url = open ? `${window.location.origin}/posts/${postId}` : "";

  const text = `Is this real K-food? 🇰🇷 Koreans, judge my "${title}"`;
  const shared = (channel: string) => track("post_shared", { channel, from });

  const copy = async () => {
    shared("copy_link");
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 클립보드가 막힌 브라우저 — 그래도 복사된 것처럼 보이지 않게 아무것도 안 함
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const more = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        shared("native");
      } catch {
        // 사용자가 공유창을 닫음
      }
    } else {
      await copy();
    }
  };

  const encoded = encodeURIComponent(`${text} ${url}`);

  return (
    <BottomSheet open={open} onClose={onClose} label="Share with friends">
      {/* 친구에게 보일 카드 */}
      <div className="relative mt-2 flex w-full justify-center" aria-hidden="true">
        <div className="w-[200px] -rotate-3 animate-pop">
          <FeedCard
            title={title}
            author="Sam · Canada"
            photo={photo}
            votesLabel="Vote now"
            questionLabel={topic}
            color="bg-content"
            scale={0.62}
          />
        </div>
        <span className="absolute right-[calc(50%-138px)] top-3 rotate-[8deg] animate-pop rounded-full bg-primary px-4 py-2.5 font-display text-[17px] leading-none text-on-light shadow-[0_8px_20px_rgba(0,0,0,0.4)] [animation-delay:200ms]">
          Koreans, vote! 🇰🇷
        </span>
        <span className="absolute left-[calc(50%-130px)] top-[118px] -rotate-6 animate-pop rounded-full bg-secondary px-3.5 py-2 text-[14px] font-extrabold leading-none text-on-light [animation-delay:320ms]">
          찐 한식?
        </span>
      </div>

      <div className="flex w-full flex-col gap-1.5 px-6 text-center">
        <h2 className="font-display text-[24px] leading-[1.15] [text-wrap:balance]">Get your friends to judge it</h2>
        <p className="text-[15px] leading-[1.5] text-muted">Know any Koreans? The more votes, the sooner your verdict.</p>
      </div>

      {/* 링크 복사 */}
      <div className="flex h-14 w-full items-center gap-2 rounded-full bg-surface-2 pl-5 pr-1.5">
        <Icon name="link" size={18} className="shrink-0 text-neutral-400" />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-neutral-400">
          {url.replace(/^https?:\/\//, "")}
        </span>
        <button
          type="button"
          onClick={copy}
          className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold transition active:scale-95 ${
            copied ? "bg-secondary text-on-light" : "bg-on-dark text-on-light"
          }`}
        >
          {copied && <Icon name="check" size={16} strokeWidth={3} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* 공유 채널 */}
      <div className="stagger grid w-full grid-cols-4 gap-2 px-2 pb-1">
        <Channel label="Messages" href={`sms:?&body=${encoded}`} onClick={() => shared("sms")} className="bg-[#34c759] text-white">
          <Icon name="message" size={26} />
        </Channel>
        <Channel
          label="WhatsApp"
          href={`https://wa.me/?text=${encoded}`}
          onClick={() => shared("whatsapp")}
          className="bg-[#25d366] text-white"
        >
          <WhatsAppLogo />
        </Channel>
        <Channel
          label="X"
          href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
          onClick={() => shared("x")}
          className="bg-black text-white ring-1 ring-white/15"
        >
          <XLogo />
        </Channel>
        <Channel label="More" onClick={more} className="bg-surface-2 text-on-dark">
          <Icon name="share" size={24} />
        </Channel>
      </div>
    </BottomSheet>
  );
}

function Channel({
  label,
  href,
  onClick,
  className,
  children,
}: {
  label: string;
  href?: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  const inner = (
    <>
      <span className={`flex size-[60px] items-center justify-center rounded-full ${className}`}>{children}</span>
      <span className="text-[12px] font-semibold text-neutral-400">{label}</span>
    </>
  );
  const cls = "flex animate-pop flex-col items-center gap-2 transition active:scale-90";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

// 브랜드 로고 (각 사 가이드의 단색 마크)
function WhatsAppLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.98 1-3.63-.24-.37a9.8 9.8 0 0 1-1.5-5.22c0-5.42 4.42-9.83 9.84-9.83a9.8 9.8 0 0 1 9.83 9.84c0 5.42-4.41 9.83-9.84 9.83m8.37-18.2A11.76 11.76 0 0 0 12.05.13C5.5.13.16 5.46.16 12.02c0 2.1.55 4.14 1.59 5.94L.06 24.13l6.3-1.65a11.9 11.9 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9a11.8 11.8 0 0 0-3.48-8.41" />
    </svg>
  );
}

function XLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.48l8.6-9.83L0 1.15h7.59l5.24 6.93zM17.61 20.64h2.04L6.49 3.24H4.3z" />
    </svg>
  );
}
