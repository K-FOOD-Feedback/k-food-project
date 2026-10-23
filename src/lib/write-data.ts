// 6. 콘텐츠 작성 · 5. 수정 화면에서 쓰는 질문 목록과 AI 초안 목업입니다. (담당 송희)
import type { IconName } from "@/components/Icon";
import { clampText, textLength } from "./text-length";
export const MAX_PHOTOS = 10;
/** 서버 전까지 내 글은 하나만 다루며 이 id를 씁니다. (서버 컴포넌트에서도 읽도록 여기에 둠) */
export const MY_POST_ID = "mine";
/**
 * 제목 글자 수 — 50칸 (송희). 한도는 모두 "칸" 단위: 영어 1칸, 한·중·일 글자 2칸 (src/lib/text-length.ts)
 *   → 영어 50자, 한·중·일 25자
 * 메인 카드는 2줄까지 보이고 넘치면 …, 상세는 제목 전부 (번역돼서 길어져도 상세에서 다 보임)
 */
export const TITLE_MAX = 50;
export const STORY_MAX = 500;
/** 투표 제목 — 상세 화면 투표 카드에서 두 줄 안쪽 */
export const VOTE_TITLE_MAX = 50;
/**
 * 선택지 글자 수 — 상세 투표 칸에서 잘리지 않고 전부 보여야 해서 짧게 (송희·점검 화면 /dev/edge-cases 기준)
 * 가장 좁은 경우(선택지 4개, 칸 폭 약 60px)에 영어 20자 ≈ 3줄, 한국어 번역 ≈ 8~10자 ≈ 3줄
 * AI가 만드는 선택지도 이 안으로 (aiVoteFor)
 */
export const OPTION_MAX = 20;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 4;

/**
 * 사진 검사 결과 (AI) — 올리기 전에 사진마다 확인
 * - checking: 검사 중 · ok: 음식 사진
 * - not_food: 음식이 아님(셀카·풍경·동물·장난 사진) → 빼야 다음으로
 * - unsafe: 혐오·선정·폭력·공포 사진 → 바로 빼고 안내만 (사진을 다시 보여 주지 않음)
 * - unsure: 너무 어둡거나 흐림 → 막지 않고 알려 주기만
 */
export type PhotoCheck = "checking" | "ok" | "not_food" | "unsafe" | "unsure";

export type Photo = { id: string; src: string; check?: PhotoCheck };

/**
 * 사진 검사 목업 — 실제 AI가 붙기 전까지 파일 이름으로 결과를 정함 (리뷰용)
 * 실제로는 음식 인식(①)과 같은 호출에서 상태값을 받고, 혐오·선정 사진은 전문 검사 서비스를 한 번 더 거침
 */
export function mockCheckPhoto(fileName: string): Exclude<PhotoCheck, "checking"> {
  const n = fileName.toLowerCase();
  if (/ghost|horror|gore|nsfw|unsafe|귀신/.test(n)) return "unsafe";
  if (/cat|dog|selfie|poop|nofood|landscape|screenshot|똥/.test(n)) return "not_food";
  if (/dark|blur|흐림/.test(n)) return "unsure";
  return "ok";
}

export type QuestionId =
  | "line"
  | "crime"
  | "messup"
  | "eating"
  | "laugh"
  | "still"
  | "name"
  | "toomuch"
  | "nailed"
  | "better"
  | "custom"; // 직접 쓰기 (휠 맨 끝)

export type Question = {
  id: QuestionId;
  label: string;
  hint: string;
  icon: IconName;
};

/*
  질문 목록 10개 — "참견하고 싶게" 만드는 질문 (외국인 한식 영상에 한국인이 크게 반응하는 지점에서 뽑음)
  - 이건 아니지!: 조합·기본기·먹는 법·과함·정체성
  - 이걸 해냈어?: 의외로 잘함 (글쓴이가 상처받지 않게 칭찬형도 꼭 섞음)
  휠 순서 = 배열 순서 (무한 루프). 0번이 AI 추천 1순위입니다.
  실제 AI가 붙으면: 이 목록 안에서 사진에 맞는 순서로 다시 정렬하고, 1순위를 미리 선택합니다.
  (괄호는 한국인에게 보일 뜻)
*/
export const QUESTIONS: Question[] = [
  { id: "line", label: "Did I cross the line?", hint: "Be honest. Koreans will tell you.", icon: "alert" }, // 이거 선 넘었어요?
  { id: "crime", label: "Is this a crime against K-food?", hint: "Or a happy accident?", icon: "flame" }, // 한식에 대한 범죄인가요?
  { id: "messup", label: "What did I mess up?", hint: "Find the one thing that went wrong.", icon: "wrench" }, // 어디서 망했어요?
  { id: "eating", label: "Am I eating it right?", hint: "Is this how Koreans eat it?", icon: "utensils" }, // 이렇게 먹는 거 맞아요?
  { id: "laugh", label: "Would my Korean friend laugh?", hint: "Funny, cute, or shocking?", icon: "sparkle" }, // 한국 친구가 보면 웃을까요?
  { id: "still", label: "Is this still Korean food?", hint: "Or did it become something new?", icon: "badge-check" }, // 이거 아직 한식이에요?
  { id: "name", label: "What do I call this?", hint: "Every dish deserves a name.", icon: "tag" }, // 이걸 뭐라고 불러야 해요?
  { id: "toomuch", label: "Did I add too much?", hint: "Cheese, sauce, toppings… too much?", icon: "layers" }, // 너무 많이 넣었어요?
  { id: "nailed", label: "Did I nail it?", hint: "Tell me I got it right.", icon: "star" }, // 저 해냈어요?
  { id: "better", label: "Better than a Korean made it?", hint: "Bold question. Let them judge.", icon: "chef-hat" }, // 한국인이 만든 것보다 나아요?
  // 직접 쓰기 — 항상 휠 맨 끝. 고르면 질문을 직접 씀 (투표 질문 = 쓴 문장)
  { id: "custom", label: "Write my own", hint: "Ask anything, in your own words.", icon: "pencil" },
];

export function getQuestion(id: QuestionId): Question {
  return QUESTIONS.find((q) => q.id === id) ?? QUESTIONS[0];
}

/*
  글쓰기 언어 — 외국인이 🌐에서 고른 언어 (한국어를 골랐으면 영어). 글은 이 언어로 쓰이고 원문 언어로 저장됨
  AI 초안(음식 이름 · 제목 · 본문 · 투표)도 이 언어로 만듦
*/
export type WriteLang = "en" | "zh" | "zht" | "ja";

/** 지금 글쓰기 언어 (훅을 못 쓰는 곳 — 글 저장 · AI 초안 만들 때) */
export function currentWriteLang(): WriteLang {
  try {
    const v = localStorage.getItem("kfood:viewer-lang");
    return v === "zh" || v === "zht" || v === "ja" ? v : "en";
  } catch {
    return "en";
  }
}

/** 질문 문구 중국어·일본어 (영어는 QUESTIONS.label) */
const QUESTION_LABELS: Record<"zh" | "zht" | "ja", Record<QuestionId, string>> = {
  zh: {
    line: "我是不是越界了？",
    crime: "这算是对韩食的犯罪吗？",
    messup: "我哪里搞砸了？",
    eating: "我这样吃对吗？",
    laugh: "韩国朋友看了会笑吗？",
    still: "这还算韩国菜吗？",
    name: "这个该叫什么？",
    toomuch: "我是不是放太多了？",
    nailed: "我做成功了吗？",
    better: "比韩国人做得还好吗？",
    custom: "自己写问题",
  },
  zht: {
    line: "我是不是越界了？",
    crime: "這算是對韓食的犯罪嗎？",
    messup: "我哪裡搞砸了？",
    eating: "我這樣吃對嗎？",
    laugh: "韓國朋友看了會笑嗎？",
    still: "這還算韓國菜嗎？",
    name: "這個該叫什麼？",
    toomuch: "我是不是放太多了？",
    nailed: "我做成功了嗎？",
    better: "比韓國人做得還好嗎？",
    custom: "自己寫問題",
  },
  ja: {
    line: "これ、一線越えましたか？",
    crime: "これって韓国料理への冒涜ですか？",
    messup: "どこで失敗しましたか？",
    eating: "この食べ方で合っていますか？",
    laugh: "韓国の友達が見たら笑いますか？",
    still: "これ、まだ韓国料理ですか？",
    name: "これ、何と呼べばいいですか？",
    toomuch: "入れすぎましたか？",
    nailed: "うまくできましたか？",
    better: "韓国人が作るより美味しいですか？",
    custom: "自分で質問を書く",
  },
};

/** 질문 문구 (글쓰기 언어로) */
export function questionLabel(id: QuestionId, lang: WriteLang = "en") {
  return lang === "en" ? getQuestion(id).label : (QUESTION_LABELS[lang][id] ?? getQuestion(id).label);
}

/*
  ── AI 목업 ──────────────────────────────────────────────
  실제 AI가 붙기 전까지 쓰는 가짜 결과입니다. 작성 순서(사진 → AI 글쓰기 → 글 → 질문+투표)에 따른 재료:
    ① 음식 인식          : 사진 (+ 사진 검사 상태값)      → ① 사진 화면 "Is this right?" (틀리면 고침)
    ② 제목 · 본문        : 사진 + ①                       → ①에서 음식을 알아본 순간 뒤에서 미리 씀
                                                            음식을 고치면 미리 쓴 글은 버리고 다시
    ③-a 투표 주제 추천    : 사진 + ②(사용자가 고친 글)      → 휠 1순위로 미리 선택
    ③-b 선택지           : 사진 + 고른 주제 + ②             → 투표 질문은 주제 문구 그대로
  ③-b를 만든 뒤 ①·②·주제가 바뀌면 "투표도 다시 맞출까요?" (voteBasisOf)
*/

/** ① 사진에서 알아본 음식 이름 (영어 — 예시 글 등) */
export const AI_DISH = "Buldak Carbonara";

/** ① 음식 이름을 글쓰기 언어로 */
export function aiDishFor(lang: WriteLang = "en") {
  return { en: AI_DISH, zh: "奶油火鸡面", zht: "奶油火雞麵", ja: "カルボブルダック" }[lang];
}

/** ② 제목·본문 (글쓰기 언어로) */
export function aiPostFor(dish: string, variant = 0, lang: WriteLang = "en") {
  const byLang: Record<WriteLang, { title: string; story: string }[]> = {
    en: [],
    zh: [
      {
        title: `我的第一碗${dish}`,
        story: `大家好，我是来自上海的小林！我在家做了芝士${dish}，加了香肠和葱。对韩国人来说芝士会不会太多了？`,
      },
      {
        title: `${dish}之夜`,
        story: `第一次做${dish}！我加了马苏里拉芝士、香肠和葱，让它更浓郁。韩国人会喜欢这个版本吗？`,
      },
    ],
    zht: [
      {
        title: `我的第一碗${dish}`,
        story: `大家好，我是來自上海的小林！我在家做了芝士${dish}，加了香腸和蔥。對韓國人來說芝士會不會太多了？`,
      },
      {
        title: `${dish}之夜`,
        story: `第一次做${dish}！我加了馬蘇裡拉芝士、香腸和蔥，讓它更濃郁。韓國人會喜歡這個版本嗎？`,
      },
    ],
    ja: [
      {
        title: `はじめての${dish}`,
        story: `こんにちは、大阪のユイです！家でチーズたっぷりの${dish}を作りました。ソーセージとねぎ入り。韓国の人にはチーズが多すぎでしょうか？`,
      },
      {
        title: `${dish}の夜`,
        story: `${dish}を初めて作りました！モッツァレラ、ソーセージ、ねぎを入れてクリーミーにしました。韓国の人はこのアレンジ、好きでしょうか？`,
      },
    ],
  };
  if (lang !== "en") return byLang[lang][variant % byLang[lang].length];
  const drafts = [
    {
      title: `My first ${dish}`,
      story: `Hi, I'm Sam from Canada! I made cheesy ${dish} at home with sausage and green onion. Is it too cheesy for a Korean taste?`,
    },
    {
      title: `${dish} night in Toronto`,
      story: `First time cooking ${dish}! I added mozzarella, sausage and green onion to make it creamy. Would Koreans enjoy this version?`,
    },
  ];
  return drafts[variant % drafts.length];
}

/** 본문에서 사용자가 고민하는 재료·포인트를 찾아 선택지에 반영 */
function concernsIn(text: string) {
  const t = text.toLowerCase();
  const found: string[] = [];
  if (/chees|mozzarella|芝士|奶酪|马苏里拉|チーズ|モッツァレラ/.test(t)) found.push("cheese");
  if (/sausage|香肠|ソーセージ/.test(t)) found.push("sausage");
  if (/spic|hot|gochu|辣|辛/.test(t)) found.push("spice");
  if (/green onion|scallion|葱|ねぎ|ネギ/.test(t)) found.push("green onion");
  return found;
}

/** 재료 이름을 글쓰기 언어로 (선택지에 들어감) */
const CONCERN_NAMES: Record<"zh" | "zht" | "ja", Record<string, string>> = {
  zh: { cheese: "芝士", sausage: "香肠", spice: "辣度", "green onion": "葱", sauce: "酱汁", toppings: "配料" },
  zht: { cheese: "芝士", sausage: "香腸", spice: "辣度", "green onion": "蔥", sauce: "醬汁", toppings: "配料" },
  ja: { cheese: "チーズ", sausage: "ソーセージ", spice: "辛さ", "green onion": "ねぎ", sauce: "ソース", toppings: "トッピング" },
};

/** 중국어·일본어 선택지 (영어는 aiVoteFor 안의 sets) — 선택지 한도 20칸 = 한·중·일 10자 안팎 */
function cjkOptions(lang: "zh" | "zht" | "ja", main: string, second: string): Record<QuestionId, string[][]> {
  if (lang === "zh")
    return {
      line: [
        [`越界了 🚫`, `差一点 😬`, `尊重 👍`],
        [`越界太多 🚫`, `刚好压线 😬`, `没越界 👍`],
      ],
      crime: [
        [`有罪 🚨`, `可疑 🤨`, `无罪 😇`],
        [`抓起来 🚨`, `警告一次`, `无罪释放 😇`],
      ],
      messup: [
        [`${main}太多`, `做法`, `摆盘`, `没问题，很好`],
        [`少放${main}`, `再辣点 🌶️`, `去掉${second}`, `都没问题！`],
      ],
      eating: [[`对，就这样`, `再拌一拌！`, `工具不对 🥢`, `加米饭 🍚`]],
      laugh: [[`会笑 😂`, `有一点 🤭`, `不会，会惊艳`]],
      still: [[`100%韩国菜`, `有点像韩国菜`, `已经是新菜了`]],
      name: [[`保留原名`, `${main}炸弹 💣`, `用你的名字 😂`]],
      toomuch: [[`太多了 🙈`, `刚刚好 👌`, `还要更多！`]],
      nailed: [[`成功了 🎯`, `差一点 🤏`, `还不行 😅`]],
      better: [[`说实话，是 🏆`, `差不多`, `不错的尝试 😂`]],
      custom: [[`是 👍`, `有点 🤔`, `不是 👎`]],
    };
  if (lang === "zht")
    return {
      line: [
        [`越界了 🚫`, `差一點 😬`, `尊重 👍`],
        [`越界太多 🚫`, `剛好壓線 😬`, `沒越界 👍`],
      ],
      crime: [
        [`有罪 🚨`, `可疑 🤨`, `無罪 😇`],
        [`抓起來 🚨`, `警告一次`, `無罪釋放 😇`],
      ],
      messup: [
        [`${main}太多`, `做法`, `擺盤`, `沒問題，很好`],
        [`少放${main}`, `再辣點 🌶️`, `去掉${second}`, `都沒問題！`],
      ],
      eating: [[`對，就這樣`, `再拌一拌！`, `工具不對 🥢`, `加米飯 🍚`]],
      laugh: [[`會笑 😂`, `有一點 🤭`, `不會，會驚豔`]],
      still: [[`100%韓國菜`, `有點像韓國菜`, `已經是新菜了`]],
      name: [[`保留原名`, `${main}炸彈 💣`, `用你的名字 😂`]],
      toomuch: [[`太多了 🙈`, `剛剛好 👌`, `還要更多！`]],
      nailed: [[`成功了 🎯`, `差一點 🤏`, `還不行 😅`]],
      better: [[`說實話，是 🏆`, `差不多`, `不錯的嘗試 😂`]],
      custom: [[`是 👍`, `有點 🤔`, `不是 👎`]],
    };
  return {
    line: [
      [`越えてる 🚫`, `ギリギリ 😬`, `リスペクト 👍`],
      [`完全アウト 🚫`, `ギリセーフ 😬`, `越えてない 👍`],
    ],
    crime: [
      [`有罪 🚨`, `怪しい 🤨`, `無罪 😇`],
      [`逮捕 🚨`, `今回は警告`, `無罪放免 😇`],
    ],
    messup: [
      [`${main}多すぎ`, `作り方`, `盛り付け`, `どこも大丈夫`],
      [`${main}少なめに`, `もっと辛く 🌶️`, `${second}なし`, `完璧！`],
    ],
    eating: [[`合ってる`, `もっと混ぜて！`, `道具が違う 🥢`, `ご飯を足して 🍚`]],
    laugh: [[`笑う 😂`, `ちょっと 🤭`, `いや、感心する`]],
    still: [[`100%韓国料理`, `韓国料理っぽい`, `もう別の料理`]],
    name: [[`そのままで`, `${main}爆弾 💣`, `あなたの名前で 😂`]],
    toomuch: [[`多すぎ 🙈`, `ちょうどいい 👌`, `もっと！`]],
    nailed: [[`完璧 🎯`, `あと少し 🤏`, `まだまだ 😅`]],
    better: [[`正直、うまい 🏆`, `同じくらい`, `惜しい 😂`]],
    custom: [[`はい 👍`, `まあまあ 🤔`, `いいえ 👎`]],
  };
}

/*
  ③ 투표 질문 + 선택지
  - 투표 제목 = 주제를 이 글에 맞춘 구체적인 한 문장 ("Did I add too much?" → "Too much cheese?")
    상세 화면 투표 카드 맨 위에 보임. 작성자가 고칠 수 있음
  - Remake는 선택지만 바꿈 (질문 문장은 그대로)
*/
export function aiVoteFor(
  questionId: QuestionId,
  dish: string,
  post: { title: string; story: string },
  variant = 0,
  lang: WriteLang = "en",
) {
  const c = concernsIn(`${post.title} ${post.story}`);
  const main = c[0] ?? "sauce";
  const second = c[1] ?? "toppings";
  const sets: Record<QuestionId, { q: string; options: string[][] }> = {
    line: {
      q: `Did the ${main} cross the line?`,
      options: [
        [`Crossed it 🚫`, `Close call 😬`, `Respect 👍`],
        [`Way over 🚫`, `Just on it 😬`, `No line crossed 👍`],
      ],
    },
    crime: {
      q: `Is this a crime against K-food?`,
      options: [
        [`Guilty 🚨`, `Suspicious 🤨`, `Innocent 😇`],
        [`Lock it up 🚨`, `Off with a warning`, `Free to go 😇`],
      ],
    },
    messup: {
      q: `Where did this go wrong?`,
      options: [
        [`Too much ${main}`, `The cooking`, `The plating`, `Nowhere, it's good`],
        [`Less ${main}`, `More heat 🌶️`, `Cut the ${second}`, `Nothing!`],
      ],
    },
    eating: { q: `Am I eating this right?`, options: [[`Yes, exactly`, `Mix it more!`, `Wrong tools 🥢`, `Add rice 🍚`]] },
    laugh: { q: `Would a Korean friend laugh?`, options: [[`LOL yes 😂`, `A little 🤭`, `No, they'd be wowed`]] },
    still: { q: `Is this still Korean food?`, options: [[`100% Korean`, `Korean-ish`, `Something new now`]] },
    name: { q: `What should I call this?`, options: [[`Keep the name`, `${main} bomb 💣`, `Name it after you 😂`]] },
    toomuch: { q: `Too much ${main}?`, options: [[`Way too much 🙈`, `Just right 👌`, `Need more!`]] },
    nailed: { q: `Did I nail this ${dish}?`, options: [[`Nailed it 🎯`, `Almost 🤏`, `Not yet 😅`]] },
    better: { q: `Better than a Korean made it?`, options: [[`Yes, honestly 🏆`, `Same level`, `Nice try 😂`]] },
    // 직접 쓴 질문 — 실제 AI는 쓴 문장을 보고 선택지를 만듦. 목업은 무난한 3개
    custom: { q: "", options: [[`Yes 👍`, `Kind of 🤔`, `No 👎`]] },
  };
  const set = sets[questionId] ?? sets.line; // 예전 질문 id로 저장된 글도 깨지지 않게
  // 투표 질문은 고른 주제 문구 그대로 (예: "Did I add too much?") — 구체적인 문장(set.q)은 선택지 만들 때 참고만
  // 직접 쓰기면 질문은 비워 두고 사용자가 씀
  const voteQuestion = questionId === "custom" ? "" : questionLabel(questionId, lang);
  let picked = set.options[variant % set.options.length];
  if (lang !== "en") {
    const names = CONCERN_NAMES[lang];
    const all = cjkOptions(lang, names[main] ?? main, names[second] ?? second);
    const cjk = all[questionId] ?? all.line;
    picked = cjk[variant % cjk.length];
  }
  // 선택지는 글자 수 한도 안으로 (재료 이름이 길면 넘칠 수 있어서)
  const options = picked.map((o) =>
    textLength(o) > OPTION_MAX ? `${clampText(o, OPTION_MAX - 1).trimEnd()}…` : o,
  );
  return { voteQuestion, options };
}

/**
 * 글 내용을 보고 질문 순서를 매김 (AI 목업) — 맨 앞이 추천 1순위, 처음에 미리 선택됨
 * 실제 AI가 붙으면 사진 + 제목·본문을 보고 이 목록 안에서 순서만 다시 매깁니다.
 */
export function rankQuestions(post: { title: string; story: string }): QuestionId[] {
  const t = `${post.title} ${post.story}`.toLowerCase();
  const first: QuestionId[] = [];
  if (/too |a lot|extra|lots of|chees|mozzarella|太多|芝士|多すぎ|たっぷり|チーズ/.test(t)) first.push("toomuch");
  if (/first time|my first|tried|第一次|我的第一|初めて|はじめて/.test(t)) first.push("nailed");
  if (/added|instead|mix|with |加了|入れ/.test(t)) first.push("line");
  const rest = QUESTIONS.map((q) => q.id).filter((id) => !first.includes(id) && id !== "custom");
  return [...first, ...rest, "custom"]; // 직접 쓰기는 항상 맨 끝
}

/** 투표가 만들어질 때 쓴 재료 — 이게 바뀌면 "선택지 다시 맞출까요?" */
export function voteBasisOf(d: { questionId: QuestionId; dish: string; title: string; story: string }) {
  return [d.questionId, d.dish, d.title, d.story].join("|");
}

export const SAMPLE_PHOTOS: Photo[] = [
  { id: "sample-1", src: "/images/buldak-skillet.jpg" },
  { id: "sample-2", src: "/images/buldak-skillet.jpg" },
  { id: "sample-3", src: "/images/buldak-bowl.png" },
];
