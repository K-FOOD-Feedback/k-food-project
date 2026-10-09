// 6. 콘텐츠 작성 · 5. 수정 화면에서 쓰는 질문 목록과 AI 초안 목업입니다. (담당 송희)
import type { IconName } from "@/components/Icon";
export const MAX_PHOTOS = 10;
/** 서버 전까지 내 글은 하나만 다루며 이 id를 씁니다. (서버 컴포넌트에서도 읽도록 여기에 둠) */
export const MY_POST_ID = "mine";
export const TITLE_MAX = 60;
export const STORY_MAX = 500;
/** 질문 휠 한 줄(가운데는 두 줄까지)에 들어가게 */
export const VOTE_TITLE_MAX = 50;
/** 상세 화면 투표 칸에 들어가야 해서 짧게 (대략 2줄) */
export const OPTION_MAX = 28;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 4;

export type Photo = { id: string; src: string };

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
  | "better";

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
  { id: "toomuch", label: "Too much?", hint: "Cheese, sauce, toppings… too much?", icon: "layers" }, // 너무 많이 넣었어요?
  { id: "nailed", label: "Did I nail it?", hint: "Tell me I got it right.", icon: "star" }, // 저 해냈어요?
  { id: "better", label: "Better than a Korean made it?", hint: "Bold question. Let them judge.", icon: "chef-hat" }, // 한국인이 만든 것보다 나아요?
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

/*
  ③ 투표 질문 + 선택지
  - 질문 문장은 이 글에 맞춘 구체적인 한 문장 ("Too much?" → "Too much cheese?")
    질문 휠에 그대로 보이고, 고른 문장이 상세 화면 투표 제목이 됨 (휠에서 ✎로 고칠 수 있음)
  - 휠 한 줄에 들어가게 짧게 (대략 30자 안쪽)
  - Remake는 선택지만 바꿈 (질문 문장은 그대로)
*/
export function aiVoteFor(
  questionId: QuestionId,
  dish: string,
  post: { title: string; story: string },
  variant = 0,
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
        [`Lock it up 🚨`, `Let it go with a warning`, `Free to go 😇`],
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
    laugh: { q: `Would a Korean friend laugh?`, options: [[`LOL yes 😂`, `A little 🤭`, `No, they'd be impressed`]] },
    still: { q: `Is this still Korean food?`, options: [[`100% Korean`, `Korean-ish`, `Something new now`]] },
    name: { q: `What should I call this?`, options: [[`Keep the name`, `"${main} bomb" 💣`, `Name it after yourself 😂`]] },
    toomuch: { q: `Too much ${main}?`, options: [[`Way too much 🙈`, `Just right 👌`, `Need more!`]] },
    nailed: { q: `Did I nail this ${dish}?`, options: [[`Nailed it 🎯`, `Almost 🤏`, `Not yet 😅`]] },
    better: { q: `Better than a Korean made it?`, options: [[`Yes, honestly 🏆`, `Same level`, `Nice try 😂`]] },
  };
  const set = sets[questionId] ?? sets.line; // 예전 질문 id로 저장된 글도 깨지지 않게
  return { voteQuestion: set.q, options: set.options[variant % set.options.length] };
}

/**
 * 글 내용을 보고 질문 순서를 매김 (AI 목업) — 맨 앞이 추천 1순위, 처음에 미리 선택됨
 * 실제 AI가 붙으면 사진 + 제목·본문을 보고 이 목록 안에서 순서만 다시 매깁니다.
 */
export function rankQuestions(post: { title: string; story: string }): QuestionId[] {
  const t = `${post.title} ${post.story}`.toLowerCase();
  const first: QuestionId[] = [];
  if (/too |a lot|extra|lots of|chees|mozzarella/.test(t)) first.push("toomuch");
  if (/first time|my first|tried/.test(t)) first.push("nailed");
  if (/added|instead|mix|with /.test(t)) first.push("line");
  const rest = QUESTIONS.map((q) => q.id).filter((id) => !first.includes(id));
  return [...first, ...rest];
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
