/*
  서비스 로고 "ToppyTippy" — public/images/toppytippy-logo.webp (흰 글자 · 투명 배경, 2000×454)
  그림을 그대로 넣지 않고 모양(마스크)으로만 써서 글자 색(currentColor)으로 칠함 →
  어두운 화면에선 흰색, 밝은 공유 카드에선 그 카드의 글자색. 크기는 height(px)만 주면 폭은 비율대로
*/
const RATIO = 2000 / 454;

export function Logo({ height = 20, className = "" }: { height?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Toppy Tippy"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{
        height,
        width: Math.round(height * RATIO),
        maskImage: "url(/images/toppytippy-logo.webp)",
        WebkitMaskImage: "url(/images/toppytippy-logo.webp)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "left center",
        WebkitMaskPosition: "left center",
      }}
    />
  );
}
