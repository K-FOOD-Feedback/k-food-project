/*
  메인 카드 사진 모양 — 랜딩 배경 도형(src/app/landing/LandingScreen.tsx의 Shape)과 같은 모양들.
  카드마다 모양이 달라서 넘길 때마다 바뀌어 보입니다. 모두 같은 물결 영역(정사각형에 가까운 상자)을 꽉 채웁니다.
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

export const CARD_SHAPES = [
  // 물결 (기존 카드 모양)
  'url("/images/card-mask.svg")',
  // 네잎 클로버
  svg(
    '<circle cx="30" cy="30" r="27"/><circle cx="70" cy="30" r="27"/><circle cx="30" cy="70" r="27"/><circle cx="70" cy="70" r="27"/><rect x="30" y="30" width="40" height="40"/>',
  ),
  // 꽃
  svg(`<circle cx="50" cy="50" r="30"/>${flowerPetals}`),
  // 겹친 알약
  svg(
    '<rect x="0" y="0" width="100" height="36" rx="18"/><rect x="0" y="32" width="100" height="36" rx="18"/><rect x="0" y="64" width="100" height="36" rx="18"/><rect x="12" y="12" width="76" height="76"/>',
  ),
  // 동그라미
  svg('<circle cx="50" cy="50" r="50"/>'),
];

/** 덱에서 i번째 카드의 사진 모양 */
export const cardShapeAt = (i: number) => CARD_SHAPES[i % CARD_SHAPES.length];
