import { ImageResponse } from "next/og";

/*
  홈 화면에 추가했을 때 아이콘 (아이폰) — 임시 아이콘 icon.svg 와 같은 그림 (진짜 로고 받으면 둘 다 바꿈)
  아이폰이 모서리를 알아서 둥글게 자르므로 여기선 꽉 찬 네모
*/
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#111111" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path
            d="M22 13h20c6.6 0 12 5.4 12 12v4c0 6.6-5.4 12-12 12H27l-9 8v-8.6C13.3 39.2 10 34.6 10 29v-4c0-6.6 5.4-12 12-12z"
            fill="#ff87c5"
          />
          <circle cx="22.5" cy="27" r="3.4" fill="#111111" />
          <circle cx="32" cy="27" r="3.4" fill="#111111" />
          <circle cx="41.5" cy="27" r="3.4" fill="#111111" />
        </svg>
      </div>
    ),
    size,
  );
}
