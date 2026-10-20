import type { HomePost } from "@/app/home/mockPosts";
import type { UiLang } from "./viewerLang";

/*
  상세 글 본문(스토리)·투표 칸의 중국어·일본어 (목업 — 서버가 붙으면 번역 결과로 바뀜)
  한국어는 post.body·post.question.options, 영어는 post.en. 여기 없는 글은 영어로 보여 줌.
  제목·닉네임 번역은 메인과 같은 src/app/home/titles.ts (titleIn·nameIn)
*/
const BODIES: Record<string, { zh: string; ja: string }> = {
  "1": {
    zh: "你好，我来自加拿大 :)\n第一次做火鸡面。\n上面放了芝士和香肠。\n和在韩国吃的火鸡面像吗？",
    ja: "こんにちは、カナダから来ました :)\n初めてブルダックを作ってみました。\nチーズとソーセージをのせてみました。\n韓国で食べるブルダックと似ていますか？",
  },
  "2": {
    zh: "你好，我来自法国！\n加了满满的芝士，香肠还切了花刀。\n韩国人也这样吃吗？",
    ja: "こんにちは、フランスから来ました！\nチーズをたっぷり入れて、ソーセージに切り込みを入れました。\n韓国の人もこうやって食べますか？",
  },
  "3": {
    zh: "我来自巴西。\n加了牛奶和蛋黄，做成了奶油风味。",
    ja: "ブラジルから来ました。\n牛乳と卵黄を入れて、カルボナーラ風にしました。",
  },
  "4": {
    zh: "我来自德国。\n我每天早上都吃火鸡面。\n在韩国也这样吗？",
    ja: "ドイツから来ました。\n毎朝ブルダックを食べています。\n韓国でもそうですか？",
  },
  "5": {
    zh: "我来自日本。\n加了炒年糕的年糕，做得很有嚼劲。",
    ja: "日本から来ました。\nトッポッキの餅を入れて、もちもちにしました。",
  },
};

// 투표 칸은 질문 종류(question.id)마다 같아서 종류별로
const OPTIONS: Record<string, { zh: string[]; ja: string[] }> = {
  korean: { zh: ["完全\n韩式", "挺像的", "不是\n韩式"], ja: ["完全に\n韓国風", "わりと\n近い", "韓国風\nじゃない"] },
  eat: { zh: ["我会\n点", "改一改\n再吃", "我不\n吃"], ja: ["注文\nしたい", "少し変えたら\n食べる", "パス"] },
  fix: { zh: ["少放\n芝士", "再辣\n一点", "这样就\n很完美"], ja: ["チーズ\n控えめに", "もっと\n辛く", "このままで\n完璧"] },
};

/** 투표 질문 영·중·일 (목업 — 한국어는 post.question.text). 공유 카드의 투표 질문에 씀 (송희) */
const QUESTIONS: Record<string, { en: string; zh: string; ja: string }> = {
  "1": { en: "Is it like the Buldak you eat in Korea?", zh: "和在韩国吃的火鸡面像吗？", ja: "韓国で食べるブルダックと似ていますか？" },
  "2": { en: "Would you eat this Buldak?", zh: "这碗火鸡面，你想吃吗？", ja: "このブルダック、食べたいですか？" },
  "3": { en: "What should I fix?", zh: "我该改进哪里？", ja: "どこを直せばいいですか？" },
  "4": { en: "Do Koreans eat Buldak for breakfast too?", zh: "在韩国也会早餐吃火鸡面吗？", ja: "韓国でも朝ごはんにブルダックを食べますか？" },
  "5": { en: "Would you eat Buldak with rice cakes?", zh: "加了年糕的火鸡面，你想吃吗？", ja: "トッポッキ入りブルダック、食べたいですか？" },
};

/** 투표 질문을 고른 언어로 (번역이 없으면 원문 — 내 글은 쓴 언어 그대로) */
export function questionIn(post: HomePost, lang: UiLang): string {
  if (lang === "ko") return post.question.text;
  return QUESTIONS[post.id]?.[lang] ?? post.question.text;
}

/** 글 본문을 고른 언어로 (한국어가 아니면 번역, 없으면 영어) */
export function bodyIn(post: HomePost, lang: UiLang): string {
  if (lang === "ko") return post.body;
  if (lang === "en") return post.en.body || post.body;
  return BODIES[post.id]?.[lang] ?? post.en.body ?? post.body;
}

/** 투표 칸 이름을 고른 언어로 (줄바꿈 \n 포함) */
export function optionsIn(post: HomePost, lang: UiLang): string[] {
  if (lang === "ko") return post.question.options;
  if (lang === "en") return post.en.options ?? post.question.options;
  return OPTIONS[post.question.id]?.[lang] ?? post.en.options ?? post.question.options;
}
