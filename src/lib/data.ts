// 백엔드가 붙기 전까지 쓰는 샘플 데이터와 AI 초안 목업입니다.

export const SERVICE_NAME = "[Service]";
export const MAX_PHOTOS = 10;
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

// 한국인이 보는 상세 화면용 샘플 글 (E1-GL)
export type FeedPost = {
  id: string;
  cardTitle: string;
  author: string;
  country: string;
  countryKo: string;
  postedAgo: string;
  cover: string;
  photos: string[];
  title: string;
  body: string[];
  votes: number;
  commentCount: number;
  question: {
    typeLabel: string;
    typeLabelKo: string;
    short: string;
    full: string;
    options: string[];
  };
  comments: Sticker[];
};

export type Sticker =
  | {
      kind: "bubble";
      text: string;
      color: string;
      x: number;
      y: number;
      rotate: number;
    }
  | {
      kind: "emoji";
      emoji: string;
      color: string;
      x: number;
      y: number;
      rotate: number;
    };

export const FEED: FeedPost[] = [
  {
    id: "buldak-carbonara",
    cardTitle: "How to make Buldak Carbonara",
    author: "Sam",
    country: "Canada",
    countryKo: "캐나다",
    postedAgo: "2시간 전",
    cover: "/images/buldak-bowl.png",
    photos: [
      "/images/buldak-skillet.jpg",
      "/images/buldak-bowl.png",
      "/images/buldak-skillet.jpg",
    ],
    title: "제 불닭 레시피 어떤가요?",
    body: [
      "안녕하세요, 캐나다에서 온 샘이에요 :)",
      "불닭을 처음 만들어 봤어요. 모차렐라, 소시지, 대파를 넣어서 까르보나라처럼 만들었어요. 한국 사람 입맛에는 너무 느끼할까요?",
    ],
    votes: 262,
    commentCount: 85,
    question: {
      typeLabel: "Would Koreans eat this?",
      typeLabelKo: "먹어볼 의향?",
      short: "한국에서 이 메뉴 주문할래요?",
      full: "한국 식당에 이 메뉴가 있다면\n주문할 것 같나요?",
      options: ["네, 바로 주문할래요!", "조금 바꾸면 먹어볼래요", "아니요, 안 먹을래요"],
    },
    // 좌표는 375 기준 Figma 'Gravity zone'(343×286) 안의 위치입니다.
    comments: [
      { kind: "bubble", text: "치즈는 많을수록 맛있죠!", color: "#ffe056", x: 10, y: 38, rotate: -30.35 },
      { kind: "bubble", text: "소시지 칼집 미쳤다", color: "#c8b5ff", x: 166, y: 58, rotate: -10.98 },
      { kind: "bubble", text: "다 먹고나서 참치마요 삼김이랑\n같이 먹어보세요", color: "#ffc6ff", x: 92, y: 128, rotate: 10.38 },
      { kind: "emoji", emoji: "🤤", color: "#ffae8f", x: 285, y: 92, rotate: 0 },
      { kind: "emoji", emoji: "🧀", color: "#4ae9ff", x: 40, y: 164, rotate: -15 },
      { kind: "emoji", emoji: "🔥", color: "#ccf54b", x: 12, y: 213, rotate: 0 },
      { kind: "bubble", text: "보기만해도 맵네요ㅠㅠ", color: "#ffe056", x: 68, y: 213, rotate: 0 },
      { kind: "emoji", emoji: "😵", color: "#7144ff", x: 249, y: 213, rotate: 0 },
    ],
  },
];

export function getFeedPost(id: string) {
  return FEED.find((p) => p.id === id);
}
