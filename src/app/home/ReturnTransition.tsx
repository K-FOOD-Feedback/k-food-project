"use client";

import { useLayoutEffect, useRef } from "react";
import { CARD_PHOTO_IN_MASK, cardMaskBox } from "./CardStack";
import type { CardShape } from "./cardShapes";
import { clearReturnTransition, measureCard, type Box, type ReturnTransition } from "./cardTransition";

const RETURN_MS = 600;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
/*
  두 단계로 이어집니다.
  ① 합치기 (0 ~ MERGE): 본문 카드가 위로 늘어나 사진 밑까지 받치고, 사진 아래 모서리가 펴지며 둘이 한 장의 카드가 됨
  ② 줄어들기 (MERGE ~ 1): 한 장이 된 카드가 그대로 메인 맨 앞 카드로 줄어들고, 사진은 카드 속 모양 사진 자리로 들어감
*/
const MERGE = 0.38;
const MERGE_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const SHRINK_EASE = "cubic-bezier(0.25, 0.8, 0.25, 1)";
/** 카드 스티커 크기 (CardStack의 size-[68px]) — 회전된 요소의 바깥 상자 대신 이 크기로 가운데를 맞춥니다 */
const STICKER = 68;

const place = (b: Box, radius: string) => ({
  left: `${b.left}px`,
  top: `${b.top}px`,
  width: `${b.width}px`,
  height: `${b.height}px`,
  borderRadius: radius,
});
const boxOnly = (b: Box) => ({ left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
const boxStyle = (b: Box) => ({ left: b.left, top: b.top, width: b.width, height: b.height });
const toBox = (r: DOMRect): Box => ({ left: r.left, top: r.top, width: r.width, height: r.height });
const pct = (v: number) => `${v * 100}%`;

/**
  상세 → 메인(뒤로 가기) 전환. 상세 화면 진입 전환의 반대입니다.
  상세의 사진 영역은 맨 앞 카드의 물결 사진으로, 본문 카드는 카드 전체로, "00명 참여 중!" 칩은 카드 스티커로 이어집니다.
  유령 요소가 움직이는 동안 진짜 맨 앞 카드는 숨겨 두었다가 끝날 무렵 드러냅니다.
*/
export function ReturnGhosts({
  transition: t,
  cardPhoto,
  shape,
  onDone,
}: {
  transition: ReturnTransition;
  cardPhoto?: string;
  /** 맨 앞 카드의 사진 모양 (cardShapes) */
  shape: CardShape;
  onDone: () => void;
}) {
  const cardGhost = useRef<HTMLDivElement>(null);
  const photoGhost = useRef<HTMLDivElement>(null);
  const detailPhoto = useRef<HTMLDivElement>(null);
  const wavePhoto = useRef<HTMLDivElement>(null);
  const chipFrom = useRef<HTMLSpanElement>(null);
  const chipTo = useRef<HTMLSpanElement>(null);
  const ctaGhost = useRef<HTMLDivElement>(null);
  const ctaFrom = useRef<HTMLSpanElement>(null);
  const ctaTo = useRef<HTMLSpanElement>(null);
  const chipGhost = useRef<HTMLDivElement>(null);
  const ghosts = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    clearReturnTransition();
    const front = document.querySelector("[data-front-card]");
    if (!front || !cardGhost.current || !photoGhost.current) {
      onDone();
      return;
    }
    const to = measureCard(front, cardMaskBox(shape.scale));

    // 카드 유령 안에 맨 앞 카드의 글(질문·제목·작성자)을 복사해 넣어, 처음부터 글이 같이 움직이게 합니다.
    // 글은 카드 아래쪽에 붙어 있어서, 유령의 아래 가운데에 진짜 카드 크기로 붙여 둡니다. 사진·스티커는 따로 움직이는 유령이 맡습니다.
    const clone = front.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-card-photo], [data-card-sticker]").forEach((el) => el.remove());
    clone.removeAttribute("data-front-card");
    clone.removeAttribute("aria-label");
    clone.setAttribute("tabindex", "-1");
    Object.assign(clone.style, {
      left: "50%",
      top: "auto",
      bottom: "0px",
      width: `${to.card.width}px`,
      height: `${to.card.height}px`,
      transform: "translateX(-50%)",
      transition: "none",
      background: "transparent",
    });
    cardGhost.current.replaceChildren(clone);

    const timing = { duration: RETURN_MS, easing: EASING, fill: "forwards" as const };
    // 단계별 easing은 각 키프레임에 두고 전체는 고르게 흘러가게 함
    const staged = { duration: RETURN_MS, easing: "linear", fill: "forwards" as const };
    // 유령이 글까지 들고 움직이므로, 위치가 거의 맞았을 때 진짜 카드로 넘겨 줍니다.
    // 둘이 같이 반투명해지면 뒤 카드가 비쳐 보이므로, 진짜 카드를 유령 밑에서 먼저 다 보이게 한 뒤 유령을 걷어 냅니다.
    const reveal = [{ opacity: 0 }, { opacity: 0, offset: 0.84 }, { opacity: 1, offset: 0.86 }, { opacity: 1 }];
    const vanish = [{ opacity: 1 }, { opacity: 1, offset: 0.87 }, { opacity: 0, offset: 0.97 }, { opacity: 0 }];

    // ① 합쳐진 한 장: 사진과 본문 카드를 감싸는 상자
    const top = Math.min(t.photo.top, t.card.top);
    const left = Math.min(t.photo.left, t.card.left);
    const merged = {
      left,
      top,
      width: Math.max(t.photo.left + t.photo.width, t.card.left + t.card.width) - left,
      height: Math.max(t.photo.top + t.photo.height, t.card.top + t.card.height) - top,
    };
    const mergedPhoto = { left: merged.left, top: t.photo.top, width: merged.width, height: t.photo.height };

    const fade = (el: HTMLElement | null, frames: Keyframe[]) =>
      el ? [el.animate(frames, { duration: RETURN_MS, easing: "linear", fill: "forwards" as const })] : [];

    const animations = [
      // 본문 카드: 위로 늘어나 사진까지 받쳐 한 장이 됨 → 그 한 장이 메인 카드로 줄어듦
      cardGhost.current.animate(
        [
          { ...place(t.card, "32px"), easing: MERGE_EASE },
          { ...place(merged, "32px"), offset: MERGE, easing: SHRINK_EASE },
          place(to.card, "34.8px"),
        ],
        staged,
      ),
      // 사진: 합치는 동안은 제자리에서 카드 폭에 맞추고, 그다음 카드 속 사진 자리로
      photoGhost.current.animate(
        [
          { ...boxOnly(t.photo), easing: MERGE_EASE },
          { ...boxOnly(mergedPhoto), offset: MERGE, easing: SHRINK_EASE },
          boxOnly(to.photo),
        ],
        staged,
      ),
      // 사진 아래 모서리가 펴져 본문과 이어짐 → 줄어들며 카드 속 모양으로
      ...(detailPhoto.current
        ? [
            detailPhoto.current.animate(
              [
                { borderRadius: "32px", easing: MERGE_EASE },
                { borderRadius: "32px 32px 0px 0px", offset: MERGE, easing: SHRINK_EASE },
                { borderRadius: "45%" },
              ],
              staged,
            ),
          ]
        : []),
      // 줄어드는 동안 카드와 똑같은 모양·구도의 사진이 겹쳐 나타남
      ...fade(wavePhoto.current, [{ opacity: 0 }, { opacity: 0, offset: MERGE }, { opacity: 1, offset: 0.72 }, { opacity: 1 }]),
      ...fade(detailPhoto.current, [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.82 }, { opacity: 0 }]),
      // 카드 글은 합쳐지는 동안 떠오름
      ...fade(clone, [{ opacity: 0 }, { opacity: 0, offset: 0.12 }, { opacity: 1, offset: MERGE }, { opacity: 1 }]),
      front.animate(reveal, { duration: RETURN_MS, easing: "linear" }),
      ...(ghosts.current ? [ghosts.current.animate(vanish, { duration: RETURN_MS, easing: "linear", fill: "forwards" as const })] : []),
    ];

    // 검은 알약 칩 → 12° 기운 원형 스티커
    if (t.chip && to.sticker && chipGhost.current) {
      const cx = to.sticker.left + to.sticker.width / 2;
      const cy = to.sticker.top + to.sticker.height / 2;
      const sticker = { left: cx - STICKER / 2, top: cy - STICKER / 2, width: STICKER, height: STICKER };
      // 글자도 "00명 참여 중!" → 스티커의 "00 / 명 참여"로 바뀜 (스티커 내용을 복사, 기울기는 유령이 맡음)
      const stickerEl = front.querySelector("[data-card-sticker]");
      if (stickerEl && chipFrom.current && chipTo.current) {
        const copy = stickerEl.cloneNode(true) as HTMLElement;
        chipFrom.current.textContent = `${copy.firstElementChild?.textContent ?? ""}명 참여 중!`;
        chipTo.current.replaceChildren(...copy.childNodes);
        animations.push(
          ...fade(chipFrom.current, [{ opacity: 1 }, { opacity: 1, offset: MERGE }, { opacity: 0, offset: 0.6 }, { opacity: 0 }]),
          ...fade(chipTo.current, [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1, offset: 0.75 }, { opacity: 1 }]),
        );
      }
      animations.push(
        chipGhost.current.animate(
          [
            // 사진에 붙어 있다가, 한 장이 된 뒤 스티커 자리로
            { ...place(t.chip, `${t.chip.height / 2}px`), rotate: "0deg" },
            { ...place(t.chip, `${t.chip.height / 2}px`), rotate: "0deg", offset: MERGE, easing: SHRINK_EASE },
            { ...place(sticker, `${STICKER / 2}px`), rotate: "12deg" },
          ],
          staged,
        ),
      );
    }

    // 플로팅 "투표하기" → 하단 "투표하러 가기" (글자도 바뀜)
    const mainCta = document.querySelector<HTMLElement>("[data-main-cta]");
    if (t.cta && mainCta && ctaGhost.current) {
      const cs = getComputedStyle(mainCta);
      if (ctaTo.current) ctaTo.current.textContent = mainCta.textContent;
      animations.push(
        ctaGhost.current.animate(
          [
            { ...place(t.cta, "999px"), backgroundColor: getComputedStyle(ctaGhost.current).backgroundColor },
            { ...place(toBox(mainCta.getBoundingClientRect()), "999px"), backgroundColor: cs.backgroundColor, color: cs.color },
          ],
          timing,
        ),
        ...fade(ctaFrom.current, [{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }]),
        ...fade(ctaTo.current, [{ opacity: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1, offset: 0.55 }, { opacity: 1 }]),
        mainCta.animate(reveal, { duration: RETURN_MS, easing: "linear" }),
      );
    }

    // 끝나면 유령을 치웁니다. 화면이 가려져 애니메이션 끝 알림이 늦어져도 정해진 시간 뒤에는 치웁니다.
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onDone();
    };
    animations[0].onfinish = finish;
    const timer = window.setTimeout(finish, RETURN_MS + 100);
    return () => {
      window.clearTimeout(timer);
      animations.forEach((a) => a.cancel());
    };
    // 처음 한 번만 실행합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ghosts} aria-hidden className="pointer-events-none relative z-30">
      <div ref={cardGhost} className="fixed z-30 overflow-hidden" style={{ ...boxStyle(t.card), borderRadius: 32, background: t.color }} />
      <div ref={photoGhost} className="fixed z-30" style={boxStyle(t.photo)}>
        <div ref={detailPhoto} className="absolute inset-0 overflow-hidden" style={{ borderRadius: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 전환용 사진 */}
          <img src={t.photoSrc} alt="" className="absolute inset-0 size-full object-cover" />
        </div>
        {cardPhoto && (
          // 카드 속 사진과 똑같은 모양·구도 (사진 영역 크기에 맞춰 함께 늘었다 줄었다 함)
          <div
            ref={wavePhoto}
            className="absolute inset-0 opacity-0"
            style={{ maskImage: shape.mask, WebkitMaskImage: shape.mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 전환용 사진 */}
            <img
              src={cardPhoto}
              alt=""
              className="absolute max-w-none object-cover"
              style={{
                left: pct(CARD_PHOTO_IN_MASK.left),
                top: pct(CARD_PHOTO_IN_MASK.top),
                width: pct(CARD_PHOTO_IN_MASK.width),
                height: pct(CARD_PHOTO_IN_MASK.height),
              }}
            />
          </div>
        )}
      </div>
      {t.chip && (
        <div
          ref={chipGhost}
          className="fixed z-30 overflow-hidden bg-background text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
          style={{ ...boxStyle(t.chip), borderRadius: t.chip.height / 2 }}
        >
          <span
            ref={chipFrom}
            className="absolute inset-0 flex items-center justify-center text-[16px] leading-[1.5] font-semibold whitespace-nowrap"
          />
          <span ref={chipTo} className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 opacity-0" />
        </div>
      )}
      {t.cta && (
        <div
          ref={ctaGhost}
          className="fixed z-30 overflow-hidden rounded-full bg-primary text-[20px] leading-none font-extrabold tracking-[-0.4px] whitespace-nowrap text-white"
          style={boxStyle(t.cta)}
        >
          <span ref={ctaFrom} className="absolute inset-0 flex items-center justify-center">
            투표하기
          </span>
          <span ref={ctaTo} className="absolute inset-0 flex items-center justify-center opacity-0" />
        </div>
      )}
    </div>
  );
}
