/*
  메인 카드 → 상세 화면 전환
  카드를 누르는 순간 카드와 사진의 화면 위치를 적어 두고, 상세 화면이 열리면서 그 자리에서부터
  사진은 위쪽 사진 영역으로, 카드는 아래쪽 본문 카드로 이어지게 움직입니다.
  (페이지를 옮겨도 같은 탭 안에서는 이 모듈이 그대로 남아 있어서 값을 넘길 수 있습니다)
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

/** 맨 앞 카드 요소에서 카드·사진 위치를 잽니다. maskBox: 사진 요소 안에서 물결 모양이 보이는 영역 */
export function measureCard(cardEl: Element, maskBox: Box) {
  const card = toBox(cardEl.getBoundingClientRect());
  const photoEl = cardEl.querySelector("[data-card-photo]");
  if (!photoEl) return { card, photo: card };
  const r = photoEl.getBoundingClientRect();
  return {
    card,
    photo: { left: r.left + maskBox.left, top: r.top + maskBox.top, width: maskBox.width, height: maskBox.height },
  };
}
