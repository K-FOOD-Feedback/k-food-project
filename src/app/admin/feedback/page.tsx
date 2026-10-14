import type { Metadata } from "next";
import Link from "next/link";
import { Screen } from "@/components/Layout";
import { listFeedback, type FeedbackRow, type FeedbackViewer } from "./db";

/*
  의견 관리 /admin/feedback (송희·지현 작업용) — 마이 "전하고 싶은 의견이 있나요?"로 들어온 의견을 최신 순으로
  - 들어오는 길: 맨 위 작업용 토글의 "🛠 어드민" (src/components/ViewerToggle.tsx)
  - 한국인 / 외국인 탭 (?viewer=foreigner, 기본 한국인) — 탭 옆 숫자는 그쪽 의견 수
  - 지금은 비밀번호 없음 (지현 요청). 검색 엔진에 나오지 않게 noindex
  데이터는 Supabase K-food 프로젝트 public.feedback (db.ts)
*/
export const metadata: Metadata = {
  title: "의견 · 오늘의 참견",
  robots: { index: false, follow: false },
};

const TABS: [FeedbackViewer, string][] = [
  ["korean", "🇰🇷 한국인"],
  ["foreigner", "🌍 외국인"],
];
const LANG_NAME: Record<string, string> = { ko: "한국어", en: "영어", zh: "중국어", ja: "일본어" };

export default async function Page(props: PageProps<"/admin/feedback">) {
  const q = await props.searchParams;
  const tab: FeedbackViewer = q.viewer === "foreigner" ? "foreigner" : "korean";

  let rows: FeedbackRow[] = [];
  let error = false;
  try {
    rows = await listFeedback();
  } catch (err) {
    console.error("[admin/feedback]", err);
    error = true;
  }
  const count = (v: FeedbackViewer) => rows.filter((r) => r.viewer === v).length;
  const shown = rows.filter((r) => r.viewer === tab);

  return (
    // 맨 위 작업용 토글 밑으로 (토글 높이만큼 더 내림)
    <Screen className="gap-5 px-4 pt-[calc(56px+env(safe-area-inset-top))] pb-16">
      <header className="flex flex-col gap-1 px-2">
        <h1 className="font-display text-[26px] leading-[1.2]">의견</h1>
        <p className="text-[13px] text-muted">최신 순 · 최대 500개</p>
      </header>

      {/* 한국인 / 외국인 탭 (마이 탭과 같은 모양) */}
      <nav aria-label="버전" className="flex rounded-full bg-surface-2 p-1">
        {TABS.map(([v, label]) => (
          <Link
            key={v}
            href={v === "korean" ? "/admin/feedback" : "/admin/feedback?viewer=foreigner"}
            aria-current={tab === v ? "page" : undefined}
            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold transition ${
              tab === v ? "bg-on-dark text-on-light" : "text-neutral-400"
            }`}
          >
            {label}
            <span className={`tabular-nums ${tab === v ? "opacity-50" : ""}`}>{count(v)}</span>
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="px-2 pt-10 text-center text-[15px] text-error">의견을 불러오지 못했어요. 잠시 후 새로고침해 주세요.</p>
      ) : shown.length === 0 ? (
        <p className="px-2 pt-10 text-center text-[15px] text-muted">아직 들어온 의견이 없어요</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 rounded-[24px] bg-surface p-5">
              <p className="text-[15px] leading-[1.55] font-medium break-keep whitespace-pre-line [overflow-wrap:anywhere]">{r.text}</p>
              <p className="text-[12px] text-muted">
                {LANG_NAME[r.lang] ?? r.lang} 화면 ·{" "}
                {new Date(r.created_at).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
