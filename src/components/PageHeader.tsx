import type { ReactNode } from "react";

/*
  모든 화면 공통 상단 바
  - 위치: 화면 위에 붙어 따라옴(sticky), 위 8px(+노치 안전 영역)·아래 8px·좌우 8px — 메인 화면 헤더 위치 기준
  - 버튼: 64px 원형, 어두운 유리(surface 85% + 흐림 + 옅은 흰 테두리) — 내용 위에 떠 있어도 잘 보이게 (상세 화면 기준)
  - 바탕은 없음: 버튼 사이 빈 곳은 터치가 아래 내용으로 통과
  - 버튼끼리 간격 4px
  사용:
    <PageHeader
      left={<Link href="/home" className={HEADER_BUTTON} aria-label="뒤로 가기">…</Link>}
      right={<>…버튼들…</>}
    />
  버튼은 Link·button·TrackedLink 등 무엇이든 className={HEADER_BUTTON}만 주면 됩니다.
*/

export const HEADER_BUTTON =
  "flex size-16 shrink-0 items-center justify-center rounded-full bg-surface/85 text-on-dark ring-1 ring-white/10 backdrop-blur-xl transition-transform active:scale-95";

export function PageHeader({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="pointer-events-none sticky top-0 z-30 flex items-center justify-between px-2 pt-[calc(8px+env(safe-area-inset-top))] pb-2 [&>*]:pointer-events-auto">
      <div className="flex items-center gap-1">{left}</div>
      <div className="flex items-center gap-1">{right}</div>
    </header>
  );
}
