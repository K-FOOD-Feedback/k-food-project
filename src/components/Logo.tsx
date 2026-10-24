/*
  서비스 로고 "ToppyTippy" — public/images/toppytippy-logo.webp (흰 글자 · 투명 배경, 2000×454)
  그림을 그대로 넣지 않고 모양(마스크)으로만 써서 글자 색(currentColor)으로 칠함 →
  어두운 화면에선 흰색, 밝은 공유 카드에선 그 카드의 글자색. 크기는 height(px)만 주면 폭은 비율대로
*/
const RATIO = 2000 / 454;

export function Logo({
  height = 20,
  fit = false,
  className = "",
}: {
  /** 높이(px). fit이면 최대 높이 */
  height?: number;
  /** 남은 폭에 맞춰 줄어듦 — 부모 폭을 꽉 채우되 height보다 커지지 않음 (좁은 화면에서 옆 버튼과 겹치지 않게) */
  fit?: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="Toppy Tippy"
      className={`block shrink-0 bg-current ${className}`}
      style={{
        ...(fit
          ? { width: "100%", maxWidth: Math.round(height * RATIO), aspectRatio: `${RATIO}` }
          : { height, width: Math.round(height * RATIO) }),
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
