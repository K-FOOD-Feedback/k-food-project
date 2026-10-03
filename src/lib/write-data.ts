// 6. 콘텐츠 작성 · 5. 수정 화면에서 쓰는 질문 목록과 AI 초안 목업입니다. (담당 송희)
export const MAX_PHOTOS = 10;
/** 서버 전까지 내 글은 하나만 다루며 이 id를 씁니다. (서버 컴포넌트에서도 읽도록 여기에 둠) */
export const MY_POST_ID = "mine";
export const TITLE_MAX = 60;
export const STORY_MAX = 500;

export type Photo = { id: string; src: string };

export type QuestionId = "korean" | "eat" | "fix" | "spice" | "look";

export type Question = {
  id: QuestionId;
  label: string;
  hint: string;
  icon: "badge-check" | "heart" | "wrench" | "sparkle" | "image";
  voteQuestion: string;
  options: [string, string, string];
};

// 휠 순서 = 배열 순서 (무한 루프). 0번이 AI 추천 1순위입니다.
export const QUESTIONS: Question[] = [
  {
    id: "korean",
    label: "Is it really Korean?",
    hint: "Does it taste like the real deal?",
    icon: "badge-check",
    voteQuestion: "Does this Buldak Carbonara feel like real Korean food?",
    options: ["Totally Korean!", "Korean-ish, with a twist", "Not really Korean"],
  },
  {
    id: "eat",
    label: "Would Koreans eat this?",
    hint: "Would they order it at a restaurant?",
    icon: "heart",
    voteQuestion: "Would you order this Buldak Carbonara at a Korean restaurant?",
    options: ["Yes, I'd order it!", "Maybe, with a few changes", "No, not for me"],
  },
  {
    id: "fix",
    label: "What should I fix?",
    hint: "Get one tip to make it better.",
    icon: "wrench",
    voteQuestion: "What would make this Buldak Carbonara better?",
    options: ["Less cheese", "More spice", "It's perfect as is"],
  },
  {
    id: "spice",
    label: "Is the spice level right?",
    hint: "Too mild? Too hot?",
    icon: "sparkle",
    voteQuestion: "How's the spice level for a Korean palate?",
    options: ["Too mild", "Just right", "Too spicy"],
  },
  {
    id: "look",
    label: "Does it look like the real thing?",
    hint: "Does it look like it would in Korea?",
    icon: "image",
    voteQuestion: "Does this look like the Buldak you'd get in Korea?",
    options: ["Looks just like it!", "Close enough", "Not quite"],
  },
];

export function getQuestion(id: QuestionId): Question {
  return QUESTIONS.find((q) => q.id === id) ?? QUESTIONS[0];
}

// AI 초안 (Regenerate 시 번갈아 사용)
export const AI_DRAFTS = [
  {
    title: "My first Buldak Carbonara",
    story:
      "Hi, I'm Sam from Canada! I made cheesy Buldak Carbonara at home with sausage and green onion. Is it too cheesy for a Korean taste?",
  },
  {
    title: "Cheesy Buldak night in Toronto",
    story:
      "First time cooking Buldak! I added mozzarella, sausage and green onion to make it creamy like carbonara. Would Koreans enjoy this version?",
  },
];

export const SAMPLE_PHOTOS: Photo[] = [
  { id: "sample-1", src: "/images/buldak-skillet.jpg" },
  { id: "sample-2", src: "/images/buldak-skillet.jpg" },
  { id: "sample-3", src: "/images/buldak-bowl.png" },
];
