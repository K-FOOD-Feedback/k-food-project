/*
  메인 카드 사진 모양 — 랜딩 배경 도형(src/app/landing/LandingScreen.tsx의 Shape)과 같은 모양들.
  카드마다 모양이 달라서 넘길 때마다 바뀌어 보입니다.
  시각 보정: 상자를 채우는 비율이 모양마다 달라서(겹친 알약 94% ~ 꽃 68%), 같은 상자에 넣으면 크기가 달라 보입니다.
  그래서 모양마다 상자 크기(scale)를 조절해 실제 면적이 물결(75%)과 같아지게 했습니다. scale = √(0.753 / 채우는 비율)
  (캡슐은 너무 납작해 사진이 작아 보여서 뺐습니다)
*/

const svg = (body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" fill="black">${body}</svg>`,
  )}")`;

const flowerPetals = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return `<circle cx="${(50 + Math.cos(a) * 32).toFixed(2)}" cy="${(50 + Math.sin(a) * 32).toFixed(2)}" r="17"/>`;
}).join("");

export type CardShape = { mask: string; scale: number };

export const CARD_SHAPES: CardShape[] = [
  // 물결 (기존 카드 모양, 기준) — 채우는 비율 75.3%
  { mask: 'url("/images/card-mask.svg")', scale: 1 },
  // 네잎 클로버 — 77.8%
  {
    mask: svg(
      '<circle cx="30" cy="30" r="27"/><circle cx="70" cy="30" r="27"/><circle cx="30" cy="70" r="27"/><circle cx="70" cy="70" r="27"/><rect x="30" y="30" width="40" height="40"/>',
    ),
    scale: 0.984,
  },
  // 꽃 — 68.2%
  {
    mask: svg(`<circle cx="50" cy="50" r="30"/>${flowerPetals}`),
    scale: 1.051,
  },
  // 겹친 알약 — 93.7%
  {
    mask: svg(
      '<rect x="0" y="0" width="100" height="36" rx="18"/><rect x="0" y="32" width="100" height="36" rx="18"/><rect x="0" y="64" width="100" height="36" rx="18"/><rect x="12" y="12" width="76" height="76"/>',
    ),
    scale: 0.896,
  },
  // 동그라미 — 78.5%
  { mask: svg('<circle cx="50" cy="50" r="50"/>'), scale: 0.979 },
];

/** 덱에서 i번째 카드의 사진 모양 */
export const cardShapeAt = (i: number) => CARD_SHAPES[i % CARD_SHAPES.length];
