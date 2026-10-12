/*
  메인 카드 → 상세 화면 전환
  카드를 누르는 순간 카드와 사진의 화면 위치를 적어 두고, 상세 화면이 열리면서 그 자리에서부터
  사진은 위쪽 사진 영역으로, 카드는 아래쪽 본문 카드로 이어지게 움직입니다.
  (페이지를 옮겨도 같은 탭 안에서는 이 모듈이 그대로 남아 있어서 값을 넘길 수 있습니다)

  반대로 상세 → 메인(뒤로 가기)일 때는 상세 화면이 사진·본문 카드·참여 칩 위치를 적어 두고(setReturnTransition),
  메인 화면이 그 자리에서 맨 앞 카드로 이어지게 움직입니다(peekReturnTransition).
*/

export type Box = { left: number; top: number; width: number; height: number };

export type CardTransition = {
  postId: string;
  /** 카드 전체 (색 배경 + 글) */
  card: Box;
  /** 카드 안 물결 사진이 보이는 영역 */
  photo: Box;
  cardPhoto: string;
  color: string;
  /** 카드의 "00명 참여" 스티커 (메인 CardStack에 data-card-sticker가 있으면) → 상세 "00명 참여 중!" 칩으로 이어짐 */
  sticker?: Box;
  /** 하단 "투표하러 가기" 버튼 (메인 HomeScreen에 data-main-cta가 있으면) → 상세 플로팅 "투표하기"로 이어짐 */
  cta?: Box;
  at: number;
};

let pending: CardTransition | null = null;

export function setCardTransition(t: Omit<CardTransition, "at">) {
  pending = { ...t, at: Date.now() };
}

/** 방금(3초 안) 이 게시글로 넘어오면서 남긴 전환 정보 */
export function peekCardTransition(postId: string) {
  return pending && pending.postId === postId && Date.now() - pending.at < 3000 ? pending : null;
}

export function clearCardTransition() {
  pending = null;
}

const toBox = (r: DOMRect): Box => ({ left: r.left, top: r.top, width: r.width, height: r.height });

/**
  맨 앞 카드 요소에서 카드·사진·스티커 위치와, 화면의 "투표하러 가기" 버튼 위치를 잽니다.
  maskBox: 사진 요소 안에서 물결 모양이 보이는 영역
*/
export function measureCard(cardEl: Element, maskBox: Box) {
  const card = toBox(cardEl.getBoundingClientRect());
  const stickerEl = cardEl.querySelector("[data-card-sticker]");
  const ctaEl = document.querySelector("[data-main-cta]");
  const extra = {
    ...(stickerEl && { sticker: toBox(stickerEl.getBoundingClientRect()) }),
    ...(ctaEl && { cta: toBox(ctaEl.getBoundingClientRect()) }),
  };
  const photoEl = cardEl.querySelector("[data-card-photo]");
  if (!photoEl) return { card, photo: card, ...extra };
  const r = photoEl.getBoundingClientRect();
  return {
    card,
    photo: { left: r.left + maskBox.left, top: r.top + maskBox.top, width: maskBox.width, height: maskBox.height },
    ...extra,
  };
}

/* ── 상세 → 메인 (뒤로 가기) ── */

export type ReturnTransition = {
  postId: string;
  /** 상세 위쪽 사진 영역 → 메인 카드 물결 사진으로 */
  photo: Box;
  photoSrc: string;
  /** 상세 본문 카드(색 배경) → 메인 카드 전체로 */
  card: Box;
  color: string;
  /** 상세 "00명 참여 중!" 칩 → 메인 카드 스티커로 */
  chip?: Box;
  /** 상세 플로팅 "투표하기"(보일 때만) → 메인 "투표하러 가기"로 */
  cta?: Box;
  at: number;
};

let returning: ReturnTransition | null = null;

export function setReturnTransition(t: Omit<ReturnTransition, "at">) {
  returning = { ...t, at: Date.now() };
}

/** 방금(3초 안) 상세에서 메인으로 돌아오면서 남긴 전환 정보 */
export function peekReturnTransition() {
  return returning && Date.now() - returning.at < 3000 ? returning : null;
}

export function clearReturnTransition() {
  returning = null;
}
