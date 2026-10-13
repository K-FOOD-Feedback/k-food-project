"use client";

import { useLayoutEffect, useRef } from "react";
import { CARD_PHOTO_IN_MASK, cardMaskBox, cardPhotoOf } from "./CardStack";
import type { CardShape } from "./cardShapes";
import type { HomePost } from "./mockPosts";
import {
  clearReturnTransition,
  measureCard,
  type Box,
  type ReturnTransition,
} from "./cardTransition";

const RETURN_MS = 620;
const EASING = "cubic-bezier(0.3, 0.7, 0.2, 1)";
/*
  ① 하나로 (0 ~ MERGE, 약 0.09초): 상세 화면 크기 그대로, 본문 카드 색이 사진 뒤까지 바로 올라오고
     사진이 살짝 안쪽으로 들어가 사진+본문이 한 장의 카드가 됨
  ② 줄이기 (MERGE ~ 1): 그 한 장이 통째로 메인 카드로 줄어듦 — 사진은 카드 모양으로 오므라들며 카드 사진 자리로,
     상세 글은 카드 글로, 참여 칩은 스티커로, 뒤 카드들이 나타남 (모두 같은 시간·같은 곡선)
*/
const MERGE = 0.15;
const MERGE_EASE = "cubic-bezier(0.2, 0.8, 0.3, 1)";
/** 하나로 합칠 때 사진 둘레로 보이는 카드 색 여백 */
const INSET = 12;
/** 상세에서 첫 사진이 아닌 사진을 보고 있었으면, 먼저 첫 사진으로 넘기는 시간 */
const SWIPE_MS = 220;
const SWIPE_EASE = "cubic-bezier(0.3, 0, 0.2, 1)";
/** 상세를 내려 본 상태(사진이 절반 넘게 화면 위로 지나감)에서 돌아오면, 위에서 날아오는 대신 진짜 카드가 제자리에 내려앉음 */
const SETTLE_MS = 420;
/** 모양 마스크를 이만큼 크게 씌우면 사진 칸 전체가 보여 네모처럼 보임 (랜딩 photo-frame과 같은 값) */
const MASK_OPEN = "340% 340%";
/** 카드 스티커 크기 (CardStack의 size-[68px]) — 회전된 요소의 바깥 상자 대신 이 크기로 가운데를 맞춥니다 */
const STICKER = 68;

const place = (b: Box, radius: string) => ({
  left: `${b.left}px`,
  top: `${b.top}px`,
  width: `${b.width}px`,
  height: `${b.height}px`,
  borderRadius: radius,
});
const boxOnly = (b: Box) => ({
  left: `${b.left}px`,
  top: `${b.top}px`,
  width: `${b.width}px`,
  height: `${b.height}px`,
});
const boxStyle = (b: Box) => ({
  left: b.left,
  top: b.top,
  width: b.width,
  height: b.height,
});
const toBox = (r: DOMRect): Box => ({
  left: r.left,
  top: r.top,
  width: r.width,
  height: r.height,
});
const pct = (v: number) => `${v * 100}%`;

/**
  상세 → 메인(뒤로 가기) 전환. 상세 화면 진입 전환의 반대입니다.
  상세의 사진 영역은 맨 앞 카드의 물결 사진으로, 본문 카드는 카드 전체로, "00명 참여 중!" 칩은 카드 스티커로 이어집니다.
  유령 요소가 움직이는 동안 진짜 맨 앞 카드는 숨겨 두었다가 끝날 무렵 드러냅니다.
*/
export function ReturnGhosts({
  transition: t,
  post,
  shape,
  fit,
  detailLang,
  onDone,
}: {
  transition: ReturnTransition;
  /** 상세 본문 글·첫 사진을 전환 중에 그대로 보여 주려고 씀 */
  post: HomePost;
  /** 맨 앞 카드의 사진 모양 (cardShapes) */
  shape: CardShape;
  /** 화면이 낮아 카드 더미를 줄인 비율 (1 = 원래 크기) */
  fit: number;
  /** 떠나기 직전 상세 화면의 글 언어 (외국인이 상세에서 한국어를 골랐을 수도 있음) */
  detailLang: "ko" | "en";
  onDone: () => void;
}) {
  const cardGhost = useRef<HTMLDivElement>(null);
  const cardText = useRef<HTMLDivElement>(null);
  const detailText = useRef<HTMLDivElement>(null);
  const photoGhost = useRef<HTMLDivElement>(null);
  const rectLayer = useRef<HTMLDivElement>(null);
  const rectFrame = useRef<HTMLDivElement>(null);
  const firstImg = useRef<HTMLImageElement>(null);
  const shownImg = useRef<HTMLImageElement>(null);
  const chipFrom = useRef<HTMLSpanElement>(null);
  const chipTo = useRef<HTMLSpanElement>(null);
  const ctaGhost = useRef<HTMLDivElement>(null);
  const ctaFrom = useRef<HTMLSpanElement>(null);
  const ctaTo = useRef<HTMLSpanElement>(null);
  const chipGhost = useRef<HTMLDivElement>(null);
  const ghosts = useRef<HTMLDivElement>(null);
  // 메인 카드 사진 = 상세 첫 사진 (같은 사진이라 전환 중에 그림이 바뀌지 않음)
  const firstPhoto = cardPhotoOf(post);
  const swipe = !!t.photoSrc && t.photoSrc !== firstPhoto;
  // 사진이 절반 넘게 화면 위로 지나간 상태면, 사진·본문이 위에서 내려오는 대신 카드가 제자리에 내려앉게 함
  const scrolled = t.photo.top + t.photo.height < t.photo.height / 2;

  useLayoutEffect(() => {
    clearReturnTransition();
    const front = document.querySelector("[data-front-card]");
    const card = cardGhost.current;
    const photo = photoGhost.current;
    if (!front || (!scrolled && (!card || !photo))) {
      onDone();
      return;
    }
    const to = measureCard(front, cardMaskBox(shape.scale * fit));

    // 카드 유령 안에 맨 앞 카드의 글(질문·제목·작성자)을 복사해 넣어, 처음부터 글이 같이 움직이게 합니다.
    // 글은 카드 아래쪽에 붙어 있어서, 유령의 아래 가운데에 진짜 카드 크기로 붙여 둡니다. 사진·스티커는 따로 움직이는 유령이 맡습니다.
    const clone = front.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll("[data-card-photo], [data-card-sticker]")
      .forEach((el) => el.remove());
    clone.removeAttribute("data-front-card");
    clone.removeAttribute("aria-label");
    clone.setAttribute("tabindex", "-1");
    Object.assign(clone.style, {
      left: "50%",
      top: "auto",
      bottom: "0px",
      // 카드 더미가 줄어 있으면 글도 원래 크기로 놓고 같은 비율로 줄임 (줄바꿈이 진짜 카드와 같게)
      width: `${to.card.width / fit}px`,
      height: `${to.card.height / fit}px`,
      transform: `translateX(-50%) scale(${fit})`,
      transformOrigin: "bottom center",
      transition: "none",
      background: "transparent",
    });
    cardText.current?.replaceChildren(clone);

    // 첫 사진이 아닌 사진을 보고 있었으면 먼저 첫 사진으로 넘긴 뒤(SWIPE_MS) 합치기 시작
    const delay = swipe && !scrolled ? SWIPE_MS : 0;
    const run = { duration: RETURN_MS, delay, fill: "both" as const };
    const timing = { ...run, easing: EASING };
    // 단계별 easing은 각 키프레임에 두고 전체는 고르게 흘러가게 함
    const staged = { ...run, easing: "linear" };
    // 유령이 글까지 들고 움직이므로, 위치가 거의 맞았을 때 진짜 카드로 넘겨 줍니다.
    // 둘이 같이 반투명해지면 뒤 카드가 비쳐 보이므로, 진짜 카드를 유령 밑에서 먼저 다 보이게 한 뒤 유령을 걷어 냅니다.
    const reveal = [
      { opacity: 0 },
      { opacity: 0, offset: 0.84 },
      { opacity: 1, offset: 0.86 },
      { opacity: 1 },
    ];
    const vanish = [
      { opacity: 1 },
      { opacity: 1, offset: 0.87 },
      { opacity: 0, offset: 0.97 },
      { opacity: 0 },
    ];

    const fade = (el: HTMLElement | null, frames: Keyframe[]) =>
      el ? [el.animate(frames, staged)] : [];

    // 사진 안의 그림 자리: 상세 사진 칸을 꽉 채우던 그림이, 카드 속 사진과 똑같은 구도(더 넓은 그림을 모양으로 잘라 냄)로
    const fullFrame = { left: "0%", top: "0%", width: "100%", height: "100%" };
    const cardFrame = {
      left: pct(CARD_PHOTO_IN_MASK.left),
      top: pct(CARD_PHOTO_IN_MASK.top),
      width: pct(CARD_PHOTO_IN_MASK.width),
      height: pct(CARD_PHOTO_IN_MASK.height),
    };
    // ① 한 장: 본문 카드가 사진 자리 위끝까지 올라오고, 사진은 그 안에서 여백만큼 안쪽으로
    const merged = {
      left: t.card.left,
      top: t.photo.top,
      width: t.card.width,
      height: t.card.top + t.card.height - t.photo.top,
    };
    const mergedPhoto = {
      left: t.photo.left + INSET,
      top: t.photo.top + INSET,
      width: t.photo.width - INSET * 2,
      height: t.photo.height - INSET * 2,
    };
    // 모양 오므라들기는 줄이는 동안 조금 일찍 끝내 끝 무렵엔 이미 카드 모양
    const SHAPED = MERGE + (1 - MERGE) * 0.7;
    const frameKeys: Keyframe[] = [
      { ...fullFrame },
      { ...fullFrame, offset: MERGE, easing: EASING },
      { ...cardFrame, offset: SHAPED },
      cardFrame,
    ];

    const animations: Animation[] = scrolled
      ? [
          // 진짜 맨 앞 카드가 살짝 큰 데서 제자리로 내려앉으며 나타남 (그림이 하나뿐이라 깜빡임도 없음)
          front.animate(
            [
              // 반투명하면 뒤 카드가 비쳐 보이므로 불투명한 채로 크기·자리만
              { scale: "1.08", translate: "0 20px" },
              { scale: "1", translate: "0 0" },
            ],
            { duration: SETTLE_MS, easing: EASING, fill: "both" },
          ),
          ...(ghosts.current ? [ghosts.current.animate(vanish, staged)] : []),
        ]
      : [
          // 본문 카드: 사진 뒤까지 바로 올라와 한 장이 됨 → 통째로 메인 카드로
          card!.animate(
            [
              { ...place(t.card, "32px"), easing: MERGE_EASE },
              { ...place(merged, "32px"), offset: MERGE, easing: EASING },
              place(to.card, "34.8px"),
            ],
            staged,
          ),
          // 사진: 한 장 안쪽으로 살짝 들어감 → 카드 모양으로 오므라들며 메인 카드 사진 자리로
          photo!.animate(
            [
              { ...boxOnly(t.photo), easing: MERGE_EASE },
              { ...boxOnly(mergedPhoto), offset: MERGE, easing: EASING },
              boxOnly(to.photo),
            ],
            staged,
          ),
          // 깜빡임 없이: 그림은 처음부터 끝까지 같은 사진(첫 사진) 한 장이고, 자리·구도만 이어서 바뀜.
          // 모양은 랜딩과 같은 방식 — 아주 크게 씌워 둔 카드 모양 마스크가 오므라들며 네모 사진이 카드 모양이 됨
          ...(rectFrame.current
            ? [rectFrame.current.animate(frameKeys, staged)]
            : []),
          ...(rectLayer.current
            ? [
                rectLayer.current.animate(
                  [
                    { maskSize: MASK_OPEN, webkitMaskSize: MASK_OPEN },
                    {
                      maskSize: MASK_OPEN,
                      webkitMaskSize: MASK_OPEN,
                      offset: MERGE,
                      easing: EASING,
                    },
                    {
                      maskSize: "100% 100%",
                      webkitMaskSize: "100% 100%",
                      offset: SHAPED,
                    },
                    { maskSize: "100% 100%", webkitMaskSize: "100% 100%" },
                  ],
                  staged,
                ),
              ]
            : []),
          // 글: 줄어드는 동안 상세 글이 사라지고 카드 글이 떠오름 (겹쳐 보이지 않게 살짝 엇갈림)
          ...fade(detailText.current, [
            { opacity: 1 },
            { opacity: 1, offset: MERGE },
            { opacity: 0, offset: MERGE + 0.16 },
            { opacity: 0 },
          ]),
          ...fade(cardText.current, [
            { opacity: 0 },
            { opacity: 0, offset: MERGE + 0.14 },
            { opacity: 1, offset: MERGE + 0.4 },
            { opacity: 1 },
          ]),
          front.animate(reveal, staged),
          // 뒤에 깔린 카드들: 처음엔 감춰 두었다가(모양 사진 둘레로 비치지 않게) 움직이며 나타남
          ...[
            ...document.querySelectorAll<HTMLElement>(
              "[aria-roledescription='carousel'] > button:not([data-front-card])",
            ),
          ].map((el) =>
            el.animate(
              [
                { opacity: 0 },
                { opacity: 0, offset: MERGE + 0.1 },
                { opacity: 1 },
              ],
              staged,
            ),
          ),
          ...(ghosts.current ? [ghosts.current.animate(vanish, staged)] : []),
        ];

    // 보고 있던 사진이 오른쪽으로 빠지고 첫 사진이 왼쪽에서 들어옴 (상세에서 이전 사진으로 넘기는 것과 같은 방향)
    if (!scrolled && swipe && firstImg.current && shownImg.current) {
      const slide = {
        duration: SWIPE_MS,
        easing: SWIPE_EASE,
        fill: "both" as const,
      };
      animations.push(
        firstImg.current.animate(
          [{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }],
          slide,
        ),
        shownImg.current.animate(
          [{ transform: "translateX(0)" }, { transform: "translateX(100%)" }],
          slide,
        ),
      );
    }

    // 검은 알약 칩 → 12° 기운 원형 스티커
    if (t.chip && to.sticker && chipGhost.current) {
      const cx = to.sticker.left + to.sticker.width / 2;
      const cy = to.sticker.top + to.sticker.height / 2;
      const size = STICKER * fit;
      const sticker = {
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
      };
      // 글자도 "00명 참여 중!" → 스티커의 "00 / 명 참여"로 바뀜 (스티커 내용을 복사, 기울기는 유령이 맡음)
      const stickerEl = front.querySelector("[data-card-sticker]");
      if (stickerEl && chipFrom.current && chipTo.current) {
        const copy = stickerEl.cloneNode(true) as HTMLElement;
        chipFrom.current.textContent = `${copy.firstElementChild?.textContent ?? ""}명 참여 중!`;
        chipTo.current.replaceChildren(...copy.childNodes);
        animations.push(
          ...fade(chipFrom.current, [
            { opacity: 1 },
            { opacity: 1, offset: MERGE },
            { opacity: 0, offset: MERGE + 0.16 },
            { opacity: 0 },
          ]),
          ...fade(chipTo.current, [
            { opacity: 0 },
            { opacity: 0, offset: MERGE + 0.1 },
            { opacity: 1, offset: MERGE + 0.36 },
            { opacity: 1 },
          ]),
        );
      }
      animations.push(
        chipGhost.current.animate(
          [
            // 사진과 함께 안쪽으로 들어갔다가, 같이 줄어들며 스티커가 됨
            {
              ...place(t.chip, `${t.chip.height / 2}px`),
              rotate: "0deg",
              easing: MERGE_EASE,
            },
            {
              ...place(
                {
                  ...t.chip,
                  left: t.chip.left + INSET,
                  top: t.chip.top + INSET,
                },
                `${t.chip.height / 2}px`,
              ),
              rotate: "0deg",
              offset: MERGE,
              easing: EASING,
            },
            { ...place(sticker, `${size / 2}px`), rotate: "12deg" },
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
            {
              ...place(t.cta, "999px"),
              backgroundColor: getComputedStyle(ctaGhost.current)
                .backgroundColor,
            },
            {
              ...place(toBox(mainCta.getBoundingClientRect()), "999px"),
              backgroundColor: cs.backgroundColor,
              color: cs.color,
            },
          ],
          timing,
        ),
        ...fade(ctaFrom.current, [
          { opacity: 1 },
          { opacity: 0, offset: 0.4 },
          { opacity: 0 },
        ]),
        ...fade(ctaTo.current, [
          { opacity: 0 },
          { opacity: 0, offset: 0.2 },
          { opacity: 1, offset: 0.55 },
          { opacity: 1 },
        ]),
        mainCta.animate(reveal, staged),
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
    const timer = window.setTimeout(finish, delay + RETURN_MS + 100);
    return () => {
      window.clearTimeout(timer);
      animations.forEach((a) => a.cancel());
    };
    // 처음 한 번만 실행합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ghosts} aria-hidden className="pointer-events-none relative z-30">
      {/* 사진이 화면 위로 지나간 상태면 본문·사진·칩 유령 없이 진짜 카드만 내려앉음 */}
      {!scrolled && (
        <>
          <div
            ref={cardGhost}
            className="fixed z-30 overflow-hidden"
            style={{
              ...boxStyle(t.card),
              borderRadius: 32,
              background: t.color,
            }}
          >
            {/* 상세 본문 글 — 본문 카드 원래 자리(아래쪽 기준)에 그대로 두어, 카드가 위로 늘어나도 움직이지 않음 */}
            <div
              ref={detailText}
              className="absolute bottom-0 left-0 flex flex-col gap-5 px-7 py-[30px] text-on-light"
              style={{ width: t.card.width, height: t.card.height }}
            >
              <DetailArticleBody post={post} lang={detailLang} />
            </div>
            {/* 메인 카드 글 (맨 앞 카드를 복사해 넣음) */}
            <div ref={cardText} className="absolute inset-0 opacity-0" />
          </div>
          <div
            ref={photoGhost}
            className="fixed z-30"
            style={boxStyle(t.photo)}
          >
            {/* 사진 한 장 — 처음엔 상세 사진 칸 모양(마스크를 아주 크게 씌워 네모로 보임), 줄어들며 카드 모양으로 오므라듦 */}
            <div
              ref={rectLayer}
              className="absolute inset-0 overflow-hidden"
              style={{
                borderRadius: 32,
                maskImage: shape.mask,
                WebkitMaskImage: shape.mask,
                maskSize: MASK_OPEN,
                WebkitMaskSize: MASK_OPEN,
                maskPosition: "center",
                WebkitMaskPosition: "center",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
              }}
            >
              <div ref={rectFrame} className="absolute inset-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- 전환용 사진 */}
                <img
                  ref={firstImg}
                  src={firstPhoto}
                  alt=""
                  decoding="sync"
                  className="absolute inset-0 size-full object-cover"
                />
                {swipe && (
                  // eslint-disable-next-line @next/next/no-img-element -- 전환용 사진
                  <img
                    ref={shownImg}
                    src={t.photoSrc}
                    alt=""
                    decoding="sync"
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
              </div>
            </div>
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
              <span
                ref={chipTo}
                className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 opacity-0"
              />
            </div>
          )}
        </>
      )}
      {t.cta && (
        <div
          ref={ctaGhost}
          className="fixed z-30 overflow-hidden rounded-full bg-primary text-[20px] leading-none font-extrabold tracking-[-0.4px] whitespace-nowrap text-white"
          style={boxStyle(t.cta)}
        >
          <span
            ref={ctaFrom}
            className="absolute inset-0 flex items-center justify-center"
          >
            투표하기
          </span>
          <span
            ref={ctaTo}
            className="absolute inset-0 flex items-center justify-center opacity-0"
          />
        </div>
      )}
    </div>
  );
}

/** 상세 본문 카드 안 글 — 상세 화면(src/app/posts/[id]/DetailScreen.tsx의 ArticleBody)과 같은 모양
    영어면 영어 글 + 제목 Gilroy, 한국어면 한국어 글 + 제목 Paperlogy */
function DetailArticleBody({
  post,
  lang,
}: {
  post: HomePost;
  lang: "ko" | "en";
}) {
  const en = lang === "en";
  return (
    <>
      <p className="text-[14px] leading-none font-medium tracking-[-0.28px] text-[#696969]">
        from. {en ? post.en.country : post.author.country}
      </p>
      <h1
        className={`max-w-[204px] text-[31px] leading-[1.2] tracking-[-0.62px] break-keep ${
          en ? "font-display" : "font-(family-name:--font-paperlogy)"
        }`}
      >
        {en ? post.en.title : post.title}
      </h1>
      <p className="text-[16px] leading-[1.55] font-medium tracking-[-0.32px] whitespace-pre-line text-[#444]">
        {en ? (post.en.body ?? post.body) : post.body}
      </p>
    </>
  );
}
