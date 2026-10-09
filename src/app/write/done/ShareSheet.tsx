"use client";

import { toBlob } from "html-to-image";
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { BottomSheet } from "@/components/Layout";
import { track } from "@/lib/analytics";
import { CARD_H, CARD_STYLES, CARD_W, ShareCard, type CardTheme, type ShareCardPost } from "./ShareCard";

/**
 * 게시 직후 "친구에게 공유" 시트 (3. 공유 유도, 담당 송희)
 * 레퍼런스: Spotify 공유 카드 · Eimi 공유 카드
 * - 열릴 때: 완료 화면의 카드가 아래로 내려오며 작아져 시트 안 카드 자리로 들어감 (origin)
 * - 위: 인스타 스토리용 세로 카드. 옆으로 넘겨 디자인 고르기 (Photo · Vote · Verdict)
 *   카드를 탭하면 스티커가 다시 붙음 / 마우스로 문지르면 3D로 기울어짐
 * - 가운데: 디자인 탭 + 색 고르기 (브랜드 색 5) → 아래에서 차오르듯 바뀜
 * - 아래: 이미지 저장 · 스토리 · 링크 복사 · 메시지 · WhatsApp · X · 더보기
 * TODO: 서버 연결 후 링크가 실제 글 주소로 열리게 / 카카오톡은 Kakao SDK 앱 키 받으면 추가
 */
const GAP = 14; // 카드 사이 간격
const STEP = CARD_W + GAP;

// 카드 색 — 브랜드 색만 (사진에서 뽑은 색은 칙칙해서 뺌)
const THEMES: CardTheme[] = [
  { bg: "var(--color-primary)", fg: "var(--color-on-light)" },
  { bg: "var(--color-content)", fg: "var(--color-on-light)" },
  { bg: "var(--color-secondary)", fg: "var(--color-on-light)" },
  { bg: "var(--color-lilac)", fg: "var(--color-on-light)" },
  { bg: "var(--color-surface)", fg: "var(--color-on-dark)" },
];

export function ShareSheet({
  open,
  onClose,
  postId,
  post,
  origin,
  from,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  post: ShareCardPost;
  /** 시트가 열릴 때 카드가 출발할 자리 (완료 화면의 카드) */
  origin?: RefObject<HTMLElement | null>;
  /** 분석용: 어디서 열었는지 */
  from: "posted" | "detail_menu";
}) {
  // 시트는 버튼을 누른 뒤(브라우저에서만) 열리므로 여기서 주소를 읽어도 됩니다
  const url = open ? `${window.location.origin}/posts/${postId}` : "";
  const text = `Is this real K-food? 🇰🇷 Koreans, judge my "${post.title}"`;

  const [themeIndex, setThemeIndex] = useState(0);
  const theme = THEMES[themeIndex];
  const [prevBg, setPrevBg] = useState<string | null>(null);

  const [active, setActive] = useState(0); // 가운데 카드
  const [scroll, setScroll] = useState(0); // 넘기는 중 위치 (0 ~ 2, 소수)
  const [seed, setSeed] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState("");
  const style = CARD_STYLES[active].id;

  // 다시 열 때는 항상 첫 카드(Photo)부터 — 지난번 고른 카드 번호가 남아 있으면
  // 새로 그린 줄은 맨 앞인데 두 번째 카드가 가운데처럼 커 보이는 문제가 있었음
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setActive(0);
      setScroll(0);
      setTilt({ x: 0, y: 0 });
    }
  }

  const rail = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const programmatic = useRef(false);

  const shared = (channel: string) => track("post_shared", { channel, from, style, color: themeIndex });
  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  };

  // 시트가 열릴 때: 완료 화면의 카드가 그대로 아래로 내려오며 작아지고, 내려오는 동안 공유 카드로 바뀜 (Eimi 레퍼런스)
  // - 시트와 카드를 같은 시간·같은 곡선으로 움직여서, 시트가 올라오는 만큼 카드 위치를 빼 줌 → 카드는 곧게 내려가 보임
  // - 완료 화면 카드의 복사본(ghost)을 공유 카드 위에 겹쳐 두고, 날아오는 중간부터 복사본은 사라지고 공유 카드가 나타남
  const controls = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const card = rail.current?.children[0] as HTMLElement | undefined;
    const sheet = rail.current?.closest<HTMLElement>("[role=dialog]");
    const from = origin?.current?.getBoundingClientRect();
    if (!card || !sheet) return;
    // 너무 빠르면 뭐가 지나갔는지 모름 → 1.1초 동안 천천히
    const timing = { duration: 1100, easing: "cubic-bezier(0.4, 0, 0.15, 1)" };
    // 공용 시트의 기본 올라오기 효과는 끄고 여기서 직접 움직임
    for (const a of sheet.getAnimations()) a.finish();
    const lift = sheet.offsetHeight;
    const to = card.getBoundingClientRect(); // 도착 자리 — 시트를 내리기 전에 잼
    sheet.animate([{ transform: `translateY(${lift}px)` }, { transform: "none" }], timing);
    if (from) {
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const k = from.width / to.width;
      // 가로 넘김 줄은 바깥을 잘라내므로, 카드가 들어오는 동안만 바깥도 보이게
      const railEl = rail.current!;
      railEl.style.overflow = "visible";
      card
        .animate(
          [{ transform: `translate(${dx}px, ${dy - lift}px) scale(${k})`, zIndex: 1 }, { transform: "none", zIndex: 1 }],
          timing,
        )
        .finished.finally(() => (railEl.style.overflow = ""));

      // 완료 화면 카드 복사본 — 움직이는 효과는 다 끄고, "Posted!" 도장은 빼고
      const ghost = origin!.current!.cloneNode(true) as HTMLElement;
      for (const el of [ghost, ...Array.from(ghost.querySelectorAll<HTMLElement>("*"))]) el.style.animation = "none";
      ghost.querySelectorAll('[class*="animate-stamp"]').forEach((el) => el.remove());
      Object.assign(ghost.style, {
        position: "absolute",
        left: `${(to.width - from.width) / 2}px`,
        top: `${(to.height - from.height) / 2}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        transform: `scale(${1 / k})`, // 카드가 k배로 커져 있으니 되돌려서 처음엔 원래 크기 그대로
        opacity: "1",
        pointerEvents: "none",
        zIndex: "2",
      });
      card.appendChild(ghost);
      const face = card.firstElementChild as HTMLElement;
      // 처음 40%는 완료 카드 그대로 내려오고, 그 뒤 40% 동안 공유 카드로 바뀜
      const swap = [{ opacity: 1 }, { opacity: 1, offset: 0.4 }, { opacity: 0, offset: 0.8 }, { opacity: 0 }];
      ghost.animate(swap, timing).finished.finally(() => ghost.remove());
      face.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1, offset: 0.8 }, { opacity: 1 }], timing);
    }
    // 나머지(옆 카드 · 탭 · 색 · 채널)는 카드가 거의 도착할 즈음 차례로
    const rest = [...Array.from(rail.current?.children ?? []).slice(1), ...Array.from(controls.current?.children ?? [])];
    rest.forEach((el, i) =>
      (el as HTMLElement).animate([{ opacity: 0, translate: "0 12px" }, { opacity: 1, translate: "0 0" }], {
        duration: 420,
        delay: 750 + i * 80,
        easing: "ease-out",
        fill: "backwards",
      }),
    );
  }, [open, origin]);

  // ── 디자인 넘기기
  const onScroll = () => {
    const el = rail.current;
    if (!el) return;
    const pos = el.scrollLeft / STEP;
    setScroll(pos);
    const i = Math.max(0, Math.min(CARD_STYLES.length - 1, Math.round(pos)));
    if (i !== active) {
      setActive(i);
      if (!programmatic.current) track("share_card_style_changed", { style: CARD_STYLES[i].id, method: "swipe" });
    }
  };
  const goTo = (i: number) => {
    if (i === active) return;
    track("share_card_style_changed", { style: CARD_STYLES[i].id, method: "tab" });
    programmatic.current = true;
    rail.current?.scrollTo({ left: i * STEP, behavior: "smooth" });
    window.setTimeout(() => (programmatic.current = false), 600);
  };

  // ── 색 바꾸기: 새 색이 아래에서 차오름 (이전 색은 뒤에 깔아 둠)
  const pickTheme = (i: number) => {
    if (i === themeIndex) return;
    track("share_card_color_changed", { color: i, style });
    setPrevBg(theme.bg);
    setThemeIndex(i);
    for (const el of cards.current) {
      el?.animate(
        [{ clipPath: "circle(0% at 50% 110%)" }, { clipPath: "circle(150% at 50% 110%)" }],
        { duration: 650, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
      );
    }
  };

  // ── 이미지로 만들기 (1080×1920)
  const makeImage = async () => {
    const node = cards.current[active];
    const card = node?.firstElementChild as HTMLElement | null;
    if (!node || !card) return null;
    // 찰칵 — 카드가 번쩍 (찍히는 카드 바깥 층에만 걸어서 저장 이미지엔 안 들어감)
    node.parentElement?.animate([{ filter: "brightness(2.4)" }, { filter: "brightness(1)" }], {
      duration: 450,
      easing: "ease-out",
    });
    try {
      // 스토리는 화면을 꽉 채우므로 둥근 모서리 없이 찍음
      const blob = await toBlob(card, {
        pixelRatio: 1080 / CARD_W,
        cacheBust: true,
        style: { borderRadius: "0" },
        fontEmbedCSS: await ownFontCSS(),
      });
      return blob ? new File([blob], `k-food-${style}.png`, { type: "image/png" }) : null;
    } catch {
      return null;
    }
  };

  const saveImage = async () => {
    const file = await makeImage();
    if (!file) return say("Couldn't make the image");
    shared("save_image");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say("Saved! 📸");
  };

  // 스토리: 휴대폰 공유창에 이미지를 넘김 (인스타 스토리 선택 가능). 안 되면 저장
  const toStory = async () => {
    const file = await makeImage();
    if (!file) return say("Couldn't make the image");
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: `${text} ${url}` });
        shared("story");
      } catch {
        // 사용자가 공유창을 닫음
      }
      return;
    }
    await saveImage();
    say("Saved! Add it to your story 📸");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return say("Couldn't copy the link");
    }
    shared("copy_link");
    say("Link copied!");
  };

  const more = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text, url });
        shared("native");
      } catch {
        // 사용자가 공유창을 닫음
      }
    } else await copy();
  };

  const encoded = encodeURIComponent(`${text} ${url}`);

  return (
    <BottomSheet open={open} onClose={onClose} label="Share with friends">
      {/* 카드 넘기기 */}
      <div className="relative w-full">
        <div
          ref={rail}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ gap: GAP, paddingInline: `calc(50% - ${CARD_W / 2}px)` }}
        >
          {CARD_STYLES.map((s, i) => {
            const d = i - scroll;
            const isActive = i === active;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={isActive ? `${s.label} card — tap to shuffle stickers` : `${s.label} card`}
                onClick={() => {
                  if (!isActive) return goTo(i);
                  track("share_card_shuffled", { style: s.id, taps: seed + 1 });
                  setSeed((n) => n + 1);
                }}
                onPointerMove={(e) => {
                  if (!isActive || e.pointerType !== "mouse") return;
                  const r = e.currentTarget.getBoundingClientRect();
                  setTilt({ x: -((e.clientY - r.top) / r.height - 0.5) * 14, y: ((e.clientX - r.left) / r.width - 0.5) * 18 });
                }}
                onPointerLeave={() => setTilt({ x: 0, y: 0 })}
                className="relative shrink-0 snap-center [perspective:800px] transition-transform active:scale-[0.97]"
                style={{ width: CARD_W, height: CARD_H }}
              >
                <div
                  className="relative size-full"
                  style={{
                    transform: `rotateY(${isActive ? tilt.y : 0}deg) rotateX(${isActive ? tilt.x : 0}deg) scale(${
                      1 - Math.min(Math.abs(d), 1) * 0.1
                    }) rotate(${Math.max(-1, Math.min(1, d)) * 5}deg)`,
                    transition: "transform 160ms ease-out",
                    opacity: 1 - Math.min(Math.abs(d), 1) * 0.45,
                  }}
                >
                  {/* 이전 색 (새 색이 차오르는 동안 뒤에 보임) */}
                  {prevBg && <div className="absolute inset-0 rounded-[22px]" style={{ background: prevBg }} />}
                  <div
                    ref={(el) => {
                      cards.current[i] = el;
                    }}
                    className="relative rounded-[22px] shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
                  >
                    <ShareCard style={s.id} post={post} theme={theme} seed={seed} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {toast && (
          <span
            role="status"
            className="absolute left-1/2 top-6 -translate-x-1/2 animate-pop whitespace-nowrap rounded-full bg-on-dark px-4 py-2 text-[14px] font-bold text-on-light shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
          >
            {toast}
          </span>
        )}
      </div>

      {/* 꾸미기(탭 · 색)는 붙여서, 공유 채널은 선으로 떼어서 */}
      <div ref={controls} className="flex w-full flex-col items-center gap-3">
        <div role="tablist" aria-label="Card style" className="flex rounded-full bg-surface-2 p-1">
          {CARD_STYLES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => goTo(i)}
              className={`h-9 rounded-full px-4 text-[14px] font-bold transition ${
                i === active ? "bg-on-dark text-on-light" : "text-neutral-400"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Card color" className="flex items-center gap-3">
          {THEMES.map((t, i) => (
            <button
              key={`${t.bg}-${i}`}
              type="button"
              role="radio"
              aria-checked={i === themeIndex}
              aria-label={`Color ${i + 1}`}
              onClick={() => pickTheme(i)}
              className={`size-9 rounded-full transition active:scale-90 ${
                // 다크 색은 시트 배경과 같아서 얇은 테두리로 보이게
                i === themeIndex ? "scale-110 ring-2 ring-on-dark ring-offset-2 ring-offset-surface" : "ring-1 ring-white/20"
              }`}
              style={{ background: t.bg }}
            />
          ))}
        </div>

        {/* 공유 채널 — 옆으로 넘김 */}
        <div className="mt-4 flex w-full gap-4 overflow-x-auto border-t border-white/10 px-4 pt-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Channel label="Save" icon="download" onClick={saveImage} className="bg-on-dark text-on-light" />
          <Channel label="Stories" onClick={toStory} className="bg-[linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)] text-white">
            <InstagramLogo />
          </Channel>
          <Channel label="Copy link" icon="link" onClick={copy} className="bg-surface-2 text-on-dark" />
          <Channel label="Messages" icon="message" href={`sms:?&body=${encoded}`} onClick={() => shared("sms")} className="bg-[#34c759] text-white" />
          <Channel label="WhatsApp" href={`https://wa.me/?text=${encoded}`} onClick={() => shared("whatsapp")} className="bg-[#25d366] text-white">
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
          <Channel label="More" icon="share" onClick={more} className="bg-surface-2 text-on-dark" />
        </div>
      </div>
    </BottomSheet>
  );
}

/**
 * 이미지에 넣을 글꼴 — 우리 사이트에서 내려주는 글꼴(@font-face)만 골라 data URL로 묶음
 * html-to-image에 맡기면 외부 CSS(Pretendard CDN)까지 읽으려다 보안 오류를 콘솔에 남김.
 * (Pretendard는 외부라 이미지에선 기기 기본 글꼴로 대체됨)
 */
let fontCSS: Promise<string> | null = null;
function ownFontCSS() {
  fontCSS ??= (async () => {
    const rules: { css: string; base: string }[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      if (sheet.href && new URL(sheet.href).origin !== location.origin) continue; // 외부 CSS는 건너뜀
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(list)) {
        if (rule instanceof CSSFontFaceRule) rules.push({ css: rule.cssText, base: sheet.href ?? location.href });
      }
    }
    const inlined = await Promise.all(
      rules.map(async ({ css, base }) => {
        const urls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);
        for (const u of urls) {
          if (u.startsWith("data:")) continue;
          try {
            const blob = await (await fetch(new URL(u, base))).blob();
            const data = await new Promise<string>((done) => {
              const r = new FileReader();
              r.onload = () => done(String(r.result));
              r.readAsDataURL(blob);
            });
            css = css.replace(u, data);
          } catch {
            // 못 받은 글꼴은 그냥 둠
          }
        }
        return css;
      }),
    );
    return inlined.join("\n");
  })();
  return fontCSS;
}

function Channel({
  label,
  icon,
  href,
  onClick,
  className,
  children,
}: {
  label: string;
  icon?: IconName;
  href?: string;
  onClick: () => void;
  className: string;
  children?: ReactNode;
}) {
  const inner = (
    <>
      <span className={`flex size-[56px] items-center justify-center rounded-full ${className}`}>
        {icon ? <Icon name={icon} size={24} /> : children}
      </span>
      <span className="whitespace-nowrap text-[12px] font-semibold text-neutral-400">{label}</span>
    </>
  );
  const cls = "flex w-[60px] shrink-0 flex-col items-center gap-2 transition active:scale-90";
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
function InstagramLogo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
