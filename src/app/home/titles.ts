import type { UiLang } from "../posts/[id]/viewerLang";
import type { HomePost } from "./mockPosts";

/*
  메인 카드 제목의 중국어·일본어 (목업 — 서버가 붙으면 번역 결과로 바뀜)
  한국어는 post.title, 영어는 post.en.title. 여기 없는 글은 영어로 보여 줌.
*/
const TITLES: Record<string, { zh: string; zht: string; ja: string }> = {
  "1": { zh: "我做的火鸡面食谱怎么样？", zht: "我做的火雞麵食譜怎麼樣？", ja: "私が作ったブルダックのレシピ、どうですか？" },
  "2": { zh: "芝士香肠火鸡面，你想吃吗？", zht: "芝士香腸火雞麵，你想吃嗎？", ja: "チーズたっぷりソーセージブルダック、食べたいですか？" },
  "3": { zh: "我的奶油火鸡面该怎么改进？", zht: "我的奶油火雞麵該怎麼改進？", ja: "カルボブルダック、どう直せばいいですか？" },
  "4": { zh: "在韩国早餐也吃火鸡面吗？", zht: "在韓國早餐也吃火雞麵嗎？", ja: "韓国では朝ごはんにブルダックを食べますか？" },
  "5": { zh: "加年糕的火鸡面怎么样？", zht: "加年糕的火雞麵怎麼樣？", ja: "トッポッキ入りブルダックはどうですか？" },
};

/** 글 제목을 고른 언어로 */
export function titleIn(post: HomePost, lang: UiLang): string {
  if (lang === "ko") return post.title;
  if (lang === "en") return post.en.title;
  return post.titles?.[lang] ?? TITLES[post.id]?.[lang] ?? post.en.title;
}

/*
  글쓴이 닉네임의 중국어·일본어 (목업 — 서버가 붙으면 번역 결과로 바뀜)
  한국어·영어는 원래 닉네임(post.author.name) 그대로. 여기 없는 닉네임도 그대로 보여 줌.
*/
const NAMES: Record<string, { zh: string; zht: string; ja: string }> = {
  "Saucy Taster": { zh: "酱香品鉴师", zht: "醬香品鑑師", ja: "ソース好きテイスター" },
  "Cheesy Foodie": { zh: "芝士吃货", zht: "芝士吃貨", ja: "チーズ好きフーディー" },
  "Crispy Critic": { zh: "酥脆评论家", zht: "酥脆評論家", ja: "サクサク評論家" },
  "Sweet Noodle": { zh: "甜甜面条", zht: "甜甜麵條", ja: "あまあまヌードル" },
  "Chewy Dumpling": { zh: "Q弹饺子", zht: "Q彈餃子", ja: "もちもち餃子" },
};

/** 글쓴이 닉네임을 고른 언어로 (제목과 같은 글 언어 기준) */
export function nameIn(post: HomePost, lang: UiLang): string {
  if (lang === "zh" || lang === "zht" || lang === "ja") return NAMES[post.author.name]?.[lang] ?? post.author.name;
  return post.author.name;
}
