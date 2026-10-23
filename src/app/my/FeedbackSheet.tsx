"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CARD_SHAPES } from "@/app/home/cardShapes";
import { burstConfetti } from "@/app/posts/[id]/confetti";
import { PillButton } from "@/components/Buttons";
import { BottomSheet } from "@/components/Layout";
import { track } from "@/lib/analytics";
import type { UiLang } from "@/app/posts/[id]/viewerLang";
import { GOOGLE_ACCOUNT, useCountry, useNickname } from "./profile";
import { clampText, limitTyped, textLength } from "@/lib/text-length";

/*
  마이 맨 아래 "전하고 싶은 의견이 있나요?" — 문의·의견 (한국인 /my · 외국인 /my/en 같이 씀)
  화면 아래에 고정 (children = 그 밑 계정 줄도 같이). 목록이 길면 아래로 갈수록 배경색으로 흐려지는 띠 위에 떠 있고,
  쓰는 화면은 아래 여백을 FEEDBACK_BAR_SPACE 만큼 둬서 마지막 항목이 가려지지 않게 함
  누르면 시트: 의견 쓰기(최대 FEEDBACK_MAX칸 — 한·중·일 글자 2칸, 넘치면 더 안 써짐) → 보내기 → /api/feedback 이 DB(Supabase)에 쌓음 → /admin/feedback 에서 봄
  보내면 시트가 바로 닫히고, 화면 가운데에 "고마워요! 잘 받았어요" + 웃는 얼굴(직접 그린 2D 아이콘 SmileFace)을 크게 띄우며 폭죽 (투표 완료와 같은 폭죽 — 카드 사진 모양 조각)
  → THANKS_MS 뒤 사라짐. 실패하면 시트는 그대로, 글도 그대로 두고 안내
  분석: 연 것만 (my_item_clicked item=feedback) — 글 내용은 보내지 않음
*/
/** 의견 글자 수 — 칸 단위 (영어 1000자 · 한·중·일 500자). 서버 저장 한도(db.ts FEEDBACK_MAX, 글자 수)를 넘지 않게 같은 숫자 */
const FEEDBACK_MAX = 1000;
const THANKS_MS = 670;
/** 고정 띠 높이만큼 쓰는 화면 아래 여백 (Screen className) */
export const FEEDBACK_BAR_SPACE = "pb-[calc(160px+env(safe-area-inset-bottom))]";

const COPY: Record<
  UiLang,
  { button: string; title: string; body: string; placeholder: string; send: string; sending: string; done: string; error: string }
> = {
  ko: {
    button: "전하고 싶은 의견이 있나요?",
    title: "전하고 싶은 의견이 있나요?",
    body: "불편했던 점, 바라는 점 무엇이든 좋아요.",
    placeholder: "의견을 적어 주세요",
    send: "보내기",
    sending: "보내는 중…",
    done: "고마워요! 잘 받았어요",
    error: "보내지 못했어요. 잠시 후 다시 시도해 주세요.",
  },
  en: {
    button: "Got feedback for us?",
    title: "Got feedback for us?",
    body: "Anything that bugged you or you'd love to see.",
    placeholder: "Write your feedback",
    send: "Send",
    sending: "Sending…",
    done: "Thanks! We got it",
    error: "Couldn't send. Please try again in a moment.",
  },
  zh: {
    button: "有想对我们说的话吗？",
    title: "有想对我们说的话吗？",
    body: "不方便的地方、希望的功能，什么都可以。",
    placeholder: "写下你的意见",
    send: "发送",
    sending: "发送中…",
    done: "谢谢！我们收到了",
    error: "发送失败，请稍后再试。",
  },
  ja: {
    button: "伝えたい意見はありますか？",
    title: "伝えたい意見はありますか？",
    body: "不便な点や欲しい機能、なんでもどうぞ。",
    placeholder: "ご意見を書いてください",
    send: "送信",
    sending: "送信中…",
    done: "ありがとうございます！受け取りました",
    error: "送信できませんでした。しばらくしてからもう一度お試しください。",
  },
};

type State = "idle" | "sending" | "error";

export function FeedbackButton({
  ui,
  viewer,
  children,
}: {
  ui: UiLang;
  viewer: "korean" | "foreigner";
  /** 버튼 밑에 같이 고정할 것 (계정 줄) */
  children?: ReactNode;
}) {
  const t = COPY[ui];
  // 보낸 사람 — 로그인 정보(Google 이름) + 서비스 닉네임 + 나라 (한국인은 KR, 외국인은 가입 때 고른 나라, 없으면 목업 캐나다)
  const version = viewer === "korean" ? "ko" : "en";
  const nickname = useNickname(version);
  const country = useCountry();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<State>("idle");
  const [thanks, setThanks] = useState(false);
  const ok = text.trim().length > 0 && state !== "sending";

  // 닫기 함수는 글자를 칠 때마다 새로 만들면 안 됨 — BottomSheet가 onClose가 바뀔 때마다 시트로 포커스를 옮겨서
  // 한글 조합 중 포커스가 빠져 "ㅇㅁㅁ"처럼 자모가 끊김. 그래서 useCallback으로 고정
  const close = useCallback(() => setOpen(false), []);
  const hideThanks = useCallback(() => setThanks(false), []);

  const send = async () => {
    if (!ok) return;
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          viewer,
          lang: ui,
          name: GOOGLE_ACCOUNT[version].name,
          nickname,
          country: viewer === "korean" ? "KR" : country || "CA",
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setOpen(false);
      setText("");
      setState("idle");
      setThanks(true);
      burstConfetti(window.innerWidth / 2, window.innerHeight / 2, CARD_SHAPES.map((c) => c.mask));
    } catch {
      setState("error");
    }
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[430px] flex-col items-center bg-linear-to-t from-background from-70% to-transparent px-6 pt-8 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => {
            track("my_item_clicked", { item: "feedback", viewer });
            setOpen(true);
          }}
          className="pointer-events-auto rounded-full bg-surface-2 px-5 py-3 text-[14px] font-semibold text-neutral-300 transition active:scale-[0.98]"
        >
          {t.button}
        </button>
        {children}
      </div>

      <BottomSheet open={open} onClose={close} label={t.title}>
        <form
          className="flex w-full flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="flex flex-col gap-2 px-2 pt-2 break-keep">
            <h2 className="font-display text-[24px] leading-[1.2]">{t.title}</h2>
            <p className="text-[16px] leading-[1.5] text-muted">{t.body}</p>
          </div>
          <label className="flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => {
                setText(limitTyped(e, FEEDBACK_MAX));
                if (state === "error") setState("idle");
              }}
              onCompositionEnd={(e) => setText(clampText(e.currentTarget.value, FEEDBACK_MAX))}
              rows={4}
              placeholder={t.placeholder}
              disabled={state === "sending"}
              className="resize-none rounded-[20px] bg-surface-2 px-4 py-3 text-[16px] leading-[1.5] outline-none placeholder:text-white/40 disabled:opacity-60"
            />
            <span className="flex justify-between gap-3 px-1 text-[12px]">
              <span className="text-error">{state === "error" ? t.error : ""}</span>
              <span className="shrink-0 text-white/40">
                {textLength(text)}/{FEEDBACK_MAX}
              </span>
            </span>
          </label>
          <div className="flex">
            <PillButton type="submit" tone={ok ? "primary" : "disabled"} disabled={!ok}>
              {state === "sending" ? t.sending : t.send}
            </PillButton>
          </div>
        </form>
      </BottomSheet>

      {thanks && <Thanks text={t.done} onDone={hideThanks} />}
    </>
  );
}

/** 화면 가운데 큰 감사 토스트 — 톡 커지며 나타났다가 THANKS_MS 뒤 사라짐 (누르기는 통과). 글 오른쪽에 웃는 얼굴 */
function Thanks({ text, onDone }: { text: string; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const out = window.setTimeout(() => setLeaving(true), THANKS_MS);
    const done = window.setTimeout(onDone, THANKS_MS + 300);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(done);
    };
  }, [onDone]);
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-center justify-center px-8">
      <p
        role="status"
        className={`flex items-center gap-2 rounded-[32px] bg-on-dark px-8 py-6 text-center font-display text-[24px] leading-[1.4] break-keep text-on-light shadow-[0_16px_48px_rgba(0,0,0,0.55)] transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.3,1.4,0.5,1)] starting:scale-50 starting:opacity-0 ${
          leaving ? "scale-90 opacity-0" : ""
        }`}
      >
        {text}
        <SmileFace className="size-8 shrink-0" />
      </p>
    </div>,
    document.body,
  );
}

/*
  웃는 얼굴 — 애플 이모지 대신 직접 그린 2D 아이콘 (토스 이모지처럼 납작한 면 + 은은한 아래 그늘)
  노란 얼굴 · 웃어서 감은 눈(호) · 활짝 웃는 입(혀) · 분홍 볼
*/
function SmileFace({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#FFCD3C" />
      {/* 아래쪽 은은한 그늘 — 납작하지만 살짝 도톰하게 */}
      <path d="M3.14 31A22 22 0 0 0 44.86 31A28 28 0 0 1 3.14 31Z" fill="#F5B528" />
      <ellipse cx="12.5" cy="28.5" rx="4.2" ry="2.6" fill="#FF8FA3" opacity="0.75" />
      <ellipse cx="35.5" cy="28.5" rx="4.2" ry="2.6" fill="#FF8FA3" opacity="0.75" />
      <path d="M12.5 20.5q3.5-4.5 7 0M28.5 20.5q3.5-4.5 7 0" fill="none" stroke="#5B3A1E" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 27.5h18a9 9 0 0 1-18 0Z" fill="#5B3A1E" />
      <path d="M19.2 33.4a7 4.2 0 0 1 9.6 0a9 9 0 0 1-9.6 0Z" fill="#FF6F86" />
    </svg>
  );
}
