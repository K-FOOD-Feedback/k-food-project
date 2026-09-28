import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "화면 목록 · 오늘의 참견" };

// Figma Section 3 (276:12537) 화면을 한곳에서 열어 보는 리뷰용 목록
const SCREENS = [
  { group: "시작", items: [
    { href: "/", name: "L · M01 Landing", note: "랜딩페이지" },
    { href: "/home", name: "01-A Home", note: "메인 · Share your K-food → 02 로그인 시트 → 03 사진 선택" },
  ] },
  { group: "한국인 · 글 상세", items: [
    { href: "/posts/buldak-carbonara", name: "E1-GL 글 상세", note: "하단 질문 CTA → V2a 투표 시트" },
  ] },
  { group: "업로드", items: [
    { href: "/upload", name: "04 Photos", note: "사진 없으면 빈 상태 · 10장 초과 시 04-T 토스트" },
    { href: "/upload/question", name: "05-W Pick a question", note: "휠 · 스크롤/탭/방향키" },
    { href: "/upload/writing", name: "06 AI writing", note: "약 4초 뒤 07로 자동 이동" },
    { href: "/upload/review", name: "07 Review draft", note: "" },
    { href: "/upload/done", name: "08 Posted", note: "" },
  ] },
  { group: "내 글 · 수정/삭제", items: [
    { href: "/my-post", name: "09 My post · menu", note: "더보기 → 수정 / 12 삭제 확인" },
    { href: "/my-post/edit", name: "10 Edit · before votes", note: "" },
    { href: "/my-post?votes=12", name: "11 Edit · after votes", note: "이 링크로 연 뒤 더보기 → Edit post" },
  ] },
];

export default function Page() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[430px] bg-canvas px-2 pt-[calc(24px+env(safe-area-inset-top))] pb-10">
      <h1 className="px-6 pb-2 font-display text-[28px] leading-[1.1]">Screens</h1>
      <p className="px-6 pb-6 text-[13px] leading-[1.4] text-muted">
        Figma Section 3 · 14 Home draft banner는 업로드 중 뒤로가기/닫기를 하면 홈에 나타나요.
      </p>
      <div className="flex flex-col gap-1">
        {SCREENS.map((s) => (
          <section key={s.group} className="rounded-[32px] bg-white p-1">
            <h2 className="px-5 pt-5 pb-2 text-[13px] font-semibold text-muted">{s.group}</h2>
            <ul>
              {s.items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className="flex flex-col gap-0.5 rounded-[24px] px-5 py-3 hover:bg-canvas-soft">
                    <span className="text-[15px] font-bold leading-[1.3]">{it.name}</span>
                    {it.note && <span className="text-[13px] leading-[1.4] text-muted">{it.note}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
