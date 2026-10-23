import type { Metadata } from "next";
import Link from "next/link";
import { Screen } from "@/components/Layout";
import { requireAdmin } from "../auth";
import { listFeedback, type FeedbackRow, type FeedbackViewer } from "./db";

/*
  의견 관리 /admin/feedback (송희·지현 작업용) — 마이 "전하고 싶은 의견이 있나요?"로 들어온 의견을 최신 순으로
  - 들어오는 길: 맨 위 작업용 토글의 "🛠 어드민" (src/components/ViewerToggle.tsx)
  - 한국인 / 외국인 탭 (?viewer=foreigner, 기본 한국인) — 탭 옆 숫자는 그쪽 의견 수
  - 의견 카드: 왼쪽 국기 동그라미(한마디 말풍선과 같은 모양) · 위에 "실제 이름 · 닉네임"(굵게, 내용보다 살짝 크게) · 내용 · 화면 언어·시간
  - 외국인 탭: 탭 아래 왼쪽 "자동 번역" 토글 (기본 켜짐, ?tr=0 이면 원문) — 켜면 한국어 번역(text_ko)을 보여 주고,
    번역이 아직 없으면 원문 + "번역 없음"
  - 비밀번호(숫자 4자리)를 맞혀야 들어옴 — 아니면 /admin/login 으로 (auth.ts). 검색 엔진에 나오지 않게 noindex
  데이터는 Supabase K-food 프로젝트 public.feedback (db.ts)
*/
export const metadata: Metadata = {
  title: "의견",
  robots: { index: false, follow: false },
};

const TABS: [FeedbackViewer, string][] = [
  ["korean", "🇰🇷 한국인"],
  ["foreigner", "🌍 외국인"],
];
const LANG_NAME: Record<string, string> = {
  ko: "한국어",
  en: "영어",
  zh: "중국어 간체",
  zht: "중국어 번체",
  ja: "일본어",
};

/** 나라 ISO 코드 → 국기 이모지 (없으면 지구) */
const flagOf = (code: string | null) =>
  code && /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)))
    : "🌍";

export default async function Page(props: PageProps<"/admin/feedback">) {
  const q = await props.searchParams;
  const qs = new URLSearchParams(
    Object.entries(q).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  ).toString();
  await requireAdmin(`/admin/feedback${qs ? `?${qs}` : ""}`);
  const tab: FeedbackViewer = q.viewer === "foreigner" ? "foreigner" : "korean";
  const translate = tab === "foreigner" && q.tr !== "0";

  let rows: FeedbackRow[] = [];
  let error = false;
  try {
    rows = await listFeedback();
  } catch (err) {
    console.error("[admin/feedback]", err);
    error = true;
  }
  const count = (v: FeedbackViewer) =>
    rows.filter((r) => r.viewer === v).length;
  const shown = rows.filter((r) => r.viewer === tab);

  return (
    // 맨 위 작업용 토글 밑으로 (토글 높이만큼 더 내림)
    <Screen className="gap-6 px-4 pt-[calc(56px+env(safe-area-inset-top))] pb-16">
      <header className="flex flex-col gap-1 px-2">
        <h1 className="font-display text-[24px] leading-[1.2]">의견</h1>
        <p className="text-[14px] text-muted">최신 순 · 최대 500개</p>
      </header>

      {/* 한국인 / 외국인 탭 (마이 탭과 같은 모양) */}
      <nav aria-label="버전" className="flex rounded-full bg-surface-2 p-1">
        {TABS.map(([v, label]) => (
          <Link
            key={v}
            href={
              v === "korean"
                ? "/admin/feedback"
                : "/admin/feedback?viewer=foreigner"
            }
            aria-current={tab === v ? "page" : undefined}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[16px] font-semibold transition ${
              tab === v ? "bg-on-dark text-on-light" : "text-neutral-400"
            }`}
          >
            {label}
            <span className={`tabular-nums ${tab === v ? "opacity-60" : ""}`}>
              {count(v)}
            </span>
          </Link>
        ))}
      </nav>

      {/* 외국인 탭: 자동 번역 토글 (탭 아래 왼쪽) — 마이·언어 설정의 자동 번역 스위치와 같은 모양 */}
      {tab === "foreigner" && (
        <Link
          href={
            translate
              ? "/admin/feedback?viewer=foreigner&tr=0"
              : "/admin/feedback?viewer=foreigner"
          }
          role="switch"
          aria-checked={translate}
          replace
          scroll={false}
          className="flex items-center gap-3 self-start px-2 text-[14px] font-semibold text-neutral-300"
        >
          <span
            aria-hidden
            className={`relative h-8 w-12 shrink-0 rounded-full transition-colors duration-200 ${translate ? "bg-secondary" : "bg-surface-2"}`}
          >
            <span
              className={`absolute top-[3px] left-[3px] size-6 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
                translate ? "translate-x-[18px]" : ""
              }`}
            />
          </span>
          자동 번역
        </Link>
      )}

      {error ? (
        <p className="px-2 pt-8 text-center text-[16px] text-error">
          의견을 불러오지 못했어요. 잠시 후 새로고침해 주세요.
        </p>
      ) : shown.length === 0 ? (
        <p className="px-2 pt-8 text-center text-[16px] text-muted">
          아직 들어온 의견이 없어요
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <li
              key={r.id}
              className="flex items-start gap-3 rounded-[20px] bg-surface p-5"
            >
              {/* 국기 — 한마디 말풍선의 국기 동그라미와 같은 모양 */}
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[20px] leading-none"
                aria-hidden
              >
                {flagOf(r.country ?? (r.viewer === "korean" ? "KR" : null))}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {/* 보낸 사람: 실제 이름 · 닉네임 (내용보다 살짝 크게, 굵게) */}
                <p className="truncate text-[16px] leading-[1.4] font-bold">
                  {[r.author_name, r.nickname].filter(Boolean).join(" · ") ||
                    "이름 없음"}
                </p>
                <p className="text-[16px] leading-[1.5] font-medium break-keep whitespace-pre-line text-neutral-200 [overflow-wrap:anywhere]">
                  {translate && r.text_ko ? r.text_ko : r.text}
                </p>
                <p className="text-[12px] text-muted">
                  {/* 번역해서 보이면 "영어에서 번역", 아니면 쓴 화면 언어 (번역을 켰는데 번역이 없으면 "번역 없음"도) */}
                  {translate && r.text_ko
                    ? `${LANG_NAME[r.lang] ?? r.lang}에서 번역`
                    : `${translate && r.lang !== "ko" ? "번역 없음 · " : ""}${LANG_NAME[r.lang] ?? r.lang} 화면`}
                  {" · "}
                  {new Date(r.created_at).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
