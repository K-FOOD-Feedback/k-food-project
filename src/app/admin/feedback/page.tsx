import type { Metadata } from "next";
import Link from "next/link";
import { Screen } from "@/components/Layout";
import { logout } from "./actions";
import { isAdmin } from "./auth";
import { listFeedback, type FeedbackLang, type FeedbackRow, type FeedbackViewer } from "./db";
import { LoginForm } from "./LoginForm";

/*
  의견 관리 /admin/feedback (송희·지현만) — 마이 "전하고 싶은 의견이 있나요?"로 들어온 의견을 최신 순으로
  - 비밀번호(ADMIN_PASSWORD)를 한 번 맞히면 60일 동안 바로 열림
  - 위 칩으로 버전(한국인·외국인)·화면 언어 골라 보기 (?viewer=korean&lang=zh)
  - 검색 엔진에 나오지 않게 noindex
  데이터는 Supabase K-food 프로젝트 public.feedback (db.ts)
*/
export const metadata: Metadata = {
  title: "의견 · 오늘의 참견",
  robots: { index: false, follow: false },
};

const VIEWERS: [FeedbackViewer, string][] = [
  ["korean", "🇰🇷 한국인"],
  ["foreigner", "🌍 외국인"],
];
const LANGS: [FeedbackLang, string][] = [
  ["ko", "한국어"],
  ["en", "영어"],
  ["zh", "중국어"],
  ["ja", "일본어"],
];

export default async function Page(props: PageProps<"/admin/feedback">) {
  if (!(await isAdmin())) {
    return (
      <Screen className="items-center justify-center gap-8 px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-[26px] leading-[1.2]">의견 보기</h1>
          <p className="text-[15px] text-muted">송희·지현 전용이에요</p>
        </div>
        <LoginForm />
      </Screen>
    );
  }

  const q = await props.searchParams;
  const viewer = VIEWERS.find(([v]) => v === q.viewer)?.[0];
  const lang = LANGS.find(([l]) => l === q.lang)?.[0];

  let rows: FeedbackRow[] = [];
  let error = false;
  try {
    rows = await listFeedback();
  } catch (err) {
    console.error("[admin/feedback]", err);
    error = true;
  }
  const shown = rows.filter((r) => (!viewer || r.viewer === viewer) && (!lang || r.lang === lang));

  const href = (next: { viewer?: string; lang?: string }) => {
    const p = new URLSearchParams();
    const v = "viewer" in next ? next.viewer : viewer;
    const l = "lang" in next ? next.lang : lang;
    if (v) p.set("viewer", v);
    if (l) p.set("lang", l);
    const s = p.toString();
    return s ? `/admin/feedback?${s}` : "/admin/feedback";
  };

  return (
    <Screen className="gap-5 px-4 pt-[calc(24px+env(safe-area-inset-top))] pb-16">
      <header className="flex items-end justify-between gap-3 px-2">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] leading-[1.2]">의견 {rows.length}개</h1>
          <p className="text-[13px] text-muted">최신 순 · 최대 500개</p>
        </div>
        <form action={logout}>
          <button type="submit" className="text-[13px] text-muted underline underline-offset-2">
            잠그기
          </button>
        </form>
      </header>

      {/* 골라 보기 — 같은 칩을 다시 누르면 풀림 */}
      <nav className="flex flex-wrap gap-2 px-2" aria-label="골라 보기">
        {VIEWERS.map(([v, label]) => (
          <Chip key={v} on={viewer === v} href={href({ viewer: viewer === v ? undefined : v })}>
            {label}
          </Chip>
        ))}
        {LANGS.map(([l, label]) => (
          <Chip key={l} on={lang === l} href={href({ lang: lang === l ? undefined : l })}>
            {label}
          </Chip>
        ))}
      </nav>

      {error ? (
        <p className="px-2 pt-10 text-center text-[15px] text-error">의견을 불러오지 못했어요. 잠시 후 새로고침해 주세요.</p>
      ) : shown.length === 0 ? (
        <p className="px-2 pt-10 text-center text-[15px] text-muted">{rows.length ? "고른 조건의 의견이 없어요" : "아직 들어온 의견이 없어요"}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 rounded-[24px] bg-surface p-5">
              <p className="text-[15px] leading-[1.55] font-medium break-keep whitespace-pre-line [overflow-wrap:anywhere]">{r.text}</p>
              <p className="text-[12px] text-muted">
                {r.viewer === "korean" ? "🇰🇷 한국인" : "🌍 외국인"} · {LANGS.find(([l]) => l === r.lang)?.[1] ?? r.lang} ·{" "}
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

function Chip({ on, href, children }: { on: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.97] ${
        on ? "bg-on-dark text-on-light" : "bg-surface-2 text-neutral-300"
      }`}
    >
      {children}
    </Link>
  );
}
