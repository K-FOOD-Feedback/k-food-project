"use client";

import mixpanel from "mixpanel-browser";
import { useEffect, useRef } from "react";

/*
  Mixpanel 연결 (담당 송희)

  - 토큰: .env.local 의 NEXT_PUBLIC_MIXPANEL_TOKEN
    · 없으면 아무것도 보내지 않습니다. (개발 중에는 브라우저 콘솔에 [analytics] 로 대신 찍힘)
    · 개발 중엔 테스트용 Mixpanel 프로젝트 토큰을 쓰고, 출시 직전 실서비스 토큰으로 바꿉니다.
  - 화면에서는 track("이벤트이름", { 속성 }) 만 쓰면 됩니다.
  - 이벤트 이름은 아래 EventName 에서만 고를 수 있습니다 (오타·중복 방지).
    새 이벤트는 여기와 docs/analytics-events.md 에 같이 추가하세요.
  - 개인정보(이메일·이름)와 글 내용은 보내지 않습니다. 글자 수·개수 같은 숫자만.
  - 지금 이름은 임시입니다. 출시 전에 확정하고, 출시 후엔 이름을 바꾸지 않습니다.
*/

export type EventName =
  // ── 공통 · 진입 · 로그인
  | "landing_viewed"
  | "role_selected"
  | "landing_login_clicked"
  | "landing_scrolled"
  | "language_clicked"
  | "my_page_clicked"
  | "login_sheet_opened"
  | "login_completed"
  | "login_cancelled"
  // ── 메인 (지현)
  | "feed_viewed"
  | "card_swiped"
  | "post_opened"
  | "feed_cta_clicked"
  | "share_clicked"
  // ── 상세 · 투표 · 댓글 (지현)
  | "photo_swiped"
  | "vote_cta_clicked"
  | "vote_section_viewed"
  | "vote_cast"
  | "vote_drag_missed"
  | "vote_changed"
  | "comment_section_viewed"
  | "comment_sent"
  | "comments_opened"
  | "old_comments_scrolled"
  | "post_closed"
  | "post_more_clicked"
  | "post_reported"
  // ── 외국인 글쓰기 (송희)
  | "photos_added"
  | "photo_removed"
  | "cover_changed"
  | "photos_reordered"
  | "photo_limit_hit"
  | "photos_completed"
  | "draft_saved"
  | "draft_discarded"
  | "write_exit_opened"
  | "topic_changed"
  | "topic_selected"
  | "topic_reselected"
  | "ai_draft_completed"
  | "ai_draft_stopped"
  | "dish_correction_opened"
  | "dish_corrected"
  | "post_step_completed"
  | "vote_generated"
  | "vote_remade"
  | "vote_update_prompt_shown"
  | "vote_update_accepted"
  | "vote_title_edited"
  | "vote_option_edited"
  | "vote_option_added"
  | "vote_option_removed"
  | "topic_change_clicked"
  | "post_published"
  | "posted_card_tapped"
  | "posted_next_action"
  // ── 공유 · 알림 (송희)
  | "share_sheet_opened"
  | "post_shared"
  | "notifications_clicked"
  | "notifications_viewed"
  | "notification_clicked"
  // ── 내 글 관리 (송희)
  | "my_post_viewed"
  | "post_menu_opened"
  | "post_edit_started"
  | "post_delete_sheet_opened"
  | "post_delete_cancelled"
  | "post_deleted"
  | "locked_item_tapped"
  | "post_edit_discarded"
  | "post_edit_saved";

export type EventProps = Record<string, string | number | boolean | null | undefined>;

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const DEV = process.env.NODE_ENV === "development";
let ready = false;

/** 앱이 열릴 때 한 번 (src/app/Analytics.tsx) */
export function initAnalytics() {
  if (ready || !TOKEN || typeof window === "undefined") return;
  mixpanel.init(TOKEN, {
    persistence: "localStorage",
    track_pageview: "url-with-path", // 페이지 이동마다 자동 기록
    debug: DEV,
  });
  // 개발 중 테스트 기록은 app_env=development 로 구분 (Mixpanel에서 필터해서 제외 가능)
  mixpanel.register({ app_env: DEV ? "development" : "production" });
  ready = true;
}

/** 행동 기록 */
export function track(event: EventName, props?: EventProps) {
  // 자식 화면의 effect가 layout보다 먼저 돌 수 있어서, 첫 기록 때 시작도 같이 합니다
  initAnalytics();
  if (ready) mixpanel.track(event, props);
  else if (DEV) console.debug("[analytics]", event, props ?? {});
}

/** 이후 모든 이벤트에 자동으로 붙는 속성 (예: user_type) */
export function setSuperProps(props: EventProps) {
  initAnalytics();
  if (ready) mixpanel.register(props);
  else if (DEV) console.debug("[analytics] super props", props);
}

/** 로그인한 사용자 연결 — Supabase 사용자 ID가 생기면 여기에 넣기 */
export function identify(userId: string, profile?: EventProps) {
  if (!ready) return;
  mixpanel.identify(userId);
  if (profile) mixpanel.people.set(profile);
}

/** 로그아웃 */
export function resetAnalytics() {
  if (ready) mixpanel.reset();
}

/** 화면이 처음 보일 때 한 번만 기록 (개발 모드에서 두 번 찍히지 않게) */
export function useTrackOnce(event: EventName, props?: EventProps) {
  const done = useRef(false);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    track(event, latest.current);
  }, [event]);
}

/** AI가 쓴 글을 얼마나 그대로 썼는지 (0~1, 단어 기준) */
export function keptRatio(original: string, edited: string) {
  if (!original) return edited ? 0 : 1;
  if (original === edited) return 1;
  const words = original.split(/\s+/).filter(Boolean);
  const after = new Set(edited.split(/\s+/));
  const kept = words.filter((w) => after.has(w)).length;
  return Math.round((kept / Math.max(1, words.length)) * 100) / 100;
}
