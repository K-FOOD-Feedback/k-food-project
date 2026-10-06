// 6. 콘텐츠 작성 · 5. 수정 화면에서 쓰는 질문 목록과 AI 초안 목업입니다. (담당 송희)
export const MAX_PHOTOS = 10;
/** 서버 전까지 내 글은 하나만 다루며 이 id를 씁니다. (서버 컴포넌트에서도 읽도록 여기에 둠) */
export const MY_POST_ID = "mine";
export const TITLE_MAX = 60;
export const STORY_MAX = 500;
export const VOTE_TITLE_MAX = 80;
/** 상세 화면 투표 칸에 들어가야 해서 짧게 (대략 2줄) */
export const OPTION_MAX = 28;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 4;

export type Photo = { id: string; src: string };

export type QuestionId = "korean" | "eat" | "fix" | "spice" | "look";

export type Question = {
  id: QuestionId;
  label: string;
  hint: string;
  icon: "badge-check" | "heart" | "wrench" | "sparkle" | "image";
};

// 휠 순서 = 배열 순서 (무한 루프). 0번이 AI 추천 1순위입니다.
export const QUESTIONS: Question[] = [
  {
    id: "korean",
    label: "Is it really Korean?",
    hint: "Does it taste like the real deal?",
    icon: "badge-check",
  },
  {
    id: "eat",
    label: "Would Koreans eat this?",
    hint: "Would they order it at a restaurant?",
    icon: "heart",
  },
  {
    id: "fix",
    label: "What should I fix?",
    hint: "Get one tip to make it better.",
    icon: "wrench",
  },
  {
    id: "spice",
    label: "Is the spice level right?",
    hint: "Too mild? Too hot?",
    icon: "sparkle",
  },
  {
    id: "look",
    label: "Does it look like the real thing?",
    hint: "Does it look like it would in Korea?",
    icon: "image",
  },
];

export function getQuestion(id: QuestionId): Question {
  return QUESTIONS.find((q) => q.id === id) ?? QUESTIONS[0];
}

/*
  ── AI 목업 ──────────────────────────────────────────────
  실제 AI가 붙기 전까지 쓰는 가짜 결과입니다. 만드는 순서와 재료:
    ① 음식 인식   : 사진
    ② 제목·본문   : 사진 + 주제 (+ ①)
    ③ 투표       : 사진 + 주제 + 제목·본문  ← 사용자가 고친 글이 가장 정확한 정보
*/

/** ① 사진에서 알아본 음식 이름 */
export const AI_DISH = "Buldak Carbonara";

/** ② 제목·본문 */
export function aiPostFor(dish: string, variant = 0) {
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
  if (/chees|mozzarella/.test(t)) found.push("cheese");
  if (/sausage/.test(t)) found.push("sausage");
  if (/spic|hot|gochu/.test(t)) found.push("spice");
  if (/green onion|scallion/.test(t)) found.push("green onion");
  return found;
}

/** ③ 투표 제목 + 선택지 */
export function aiVoteFor(
  questionId: QuestionId,
  dish: string,
  post: { title: string; story: string },
  variant = 0,
) {
  const c = concernsIn(`${post.title} ${post.story}`);
  const main = c[0] ?? "sauce";
  const second = c[1] ?? "toppings";
  const sets: Record<QuestionId, { voteQuestion: string; options: string[] }[]> = {
    korean: [
      {
        voteQuestion: `What would make this ${dish} more Korean?`,
        options: [`Less ${main}, more gochujang`, `Add kimchi on the side`, `It's already Korean!`],
      },
      {
        voteQuestion: `Does this ${dish} feel Korean to you?`,
        options: [`Totally Korean`, `Korean-ish, too much ${main}`, `Rice cake instead of ${second}`],
      },
    ],
    eat: [
      {
        voteQuestion: `Would you order this ${dish} in Korea?`,
        options: [`Yes, as it is!`, `Yes, with less ${main}`, `Only as a late-night snack`, `Not for me`],
      },
      {
        voteQuestion: `Would you eat this ${dish}?`,
        options: [`I'd eat it today`, `Maybe, without the ${second}`, `Not really`],
      },
    ],
    fix: [
      {
        voteQuestion: `What should I fix in my ${dish}?`,
        options: [`Use half the ${main}`, `Make it spicier`, `Add a fried egg`, `Nothing, it's perfect`],
      },
      {
        voteQuestion: `One tip to make this ${dish} better?`,
        options: [`Cut the ${second} smaller`, `More green onion`, `Less ${main}`],
      },
    ],
    spice: [
      {
        voteQuestion: `How's the spice level of this ${dish}?`,
        options: [`Too mild — add gochugaru`, `Just right`, `Too hot for most people`],
      },
      {
        voteQuestion: `Is this ${dish} spicy enough for Koreans?`,
        options: [`Needs more heat`, `Perfect balance`, `${main} kills the spice`],
      },
    ],
    look: [
      {
        voteQuestion: `Does this ${dish} look like the real thing?`,
        options: [`Looks just like it!`, `Close, but more sauce`, `Plate it in a pan`],
      },
      {
        voteQuestion: `Would this ${dish} pass in a Korean restaurant?`,
        options: [`Yes, totally`, `Needs a garnish`, `Too much ${main} on top`],
      },
    ],
  };
  const list = sets[questionId];
  return list[variant % list.length];
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
