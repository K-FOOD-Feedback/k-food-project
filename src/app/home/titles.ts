import type { UiLang } from "../posts/[id]/viewerLang";
import type { HomePost } from "./mockPosts";

/*
  메인 카드 제목의 중국어·일본어 (목업 — 서버가 붙으면 번역 결과로 바뀜)
  한국어는 post.title, 영어는 post.en.title. 여기 없는 글은 영어로 보여 줌.
*/
const TITLES: Record<string, { zh: string; ja: string }> = {
  "1": { zh: "我做的火鸡面食谱怎么样？", ja: "私が作ったブルダックのレシピ、どう？" },
  "2": { zh: "芝士香肠火鸡面，你想吃吗？", ja: "チーズたっぷりソーセージブルダック、食べたい？" },
  "3": { zh: "我的奶油火鸡面该怎么改进？", ja: "カルボブルダック、どう直せばいい？" },
  "4": { zh: "在韩国早餐也吃火鸡面吗？", ja: "韓国では朝ごはんにブルダックを食べる？" },
  "5": { zh: "加年糕的火鸡面怎么样？", ja: "トッポッキ入りブルダックはどう？" },
};

/** 글 제목을 고른 언어로 */
export function titleIn(post: HomePost, lang: UiLang): string {
  if (lang === "ko") return post.title;
  if (lang === "en") return post.en.title;
  return TITLES[post.id]?.[lang] ?? post.en.title;
}
