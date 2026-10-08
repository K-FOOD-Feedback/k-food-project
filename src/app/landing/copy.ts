/*
  랜딩 문구 (한국어 / 영어) — 6. 랜딩, 담당 송희
  가운데 게시물은 "예시"입니다. 실제 글·실사용 숫자처럼 꾸미지 않습니다.
*/

export type LandingLang = "ko" | "en";

export const COPY = {
  ko: {
    brand: "오늘의 참견",
    headline: ["전 세계의 한식 도전에,", "한국인이 한마디."],
    sub: "외국인이 한식 사진을 올리면, 한국인이 투표하고 한마디씩 남겨요.",
    korean: { role: "한국인이에요", action: "투표하고 한마디 하기" },
    foreigner: { role: "외국인이에요", action: "둘러보고 한식 올리기" },
    login: "이미 가입했다면 로그인",
    scroll: "어떻게 하는지 볼까요?",
    sample: "예시",
    steps: [
      { title: "외국인이 한식을 올리면", sub: "사진과 사연을 함께 올려요" },
      { title: "한국인이 투표하고", sub: "글쓴이가 고른 질문에 답해요" },
      { title: "한마디씩 보태요", sub: "칭찬도, 훈수도, 장난도" },
      { title: "글쓴이도 답해요", sub: "다음 한식이 조금 더 맛있어져요" },
    ],
    author: "Sam · 캐나다",
    story: "불닭이 너무 매워서 치즈를 좀 넣었어요.",
    question: "한국인이 먹을까요?",
    options: ["먹을래요", "바꾸면 먹을래요", "안 먹을래요"],
    reply: "다음엔 치즈를 반만 넣어 볼게요!",
    endTitle: ["이제 한마디", "보태러 가볼까요?"],
  },
  en: {
    brand: "오늘의 참견",
    headline: ["Tried Korean food?", "See how Koreans react."],
    sub: "Post a photo of your Korean food. Koreans vote and leave comments.",
    korean: { role: "I'm Korean", action: "Vote and comment" },
    foreigner: { role: "I'm not Korean", action: "Look around and share" },
    login: "Already have an account? Log in",
    scroll: "See how it works",
    sample: "Example",
    steps: [
      { title: "You post your dish", sub: "Add a photo and a short story" },
      { title: "Koreans vote", sub: "They answer the question you picked" },
      { title: "And leave comments", sub: "Compliments, tips, and jokes" },
      { title: "You can reply", sub: "Your next dish gets even better" },
    ],
    author: "Sam · Canada",
    story: "Buldak was too spicy, so I added some cheese.",
    question: "Would Koreans eat this?",
    options: ["I'd eat it", "With changes", "I'd pass"],
    reply: "Next time I'll use half the cheese!",
    endTitle: ["Ready to", "jump in?"],
  },
} as const;

/** 예시 투표 비율 */
export const SAMPLE_PCTS = [58, 31, 11];

/** 한국인 반응 — 영어 화면에서는 번역을 작게 같이 */
export const REACTIONS = [
  { ko: "면이 어디 있는데요", en: "Where are the noodles?" },
  { ko: "이 정도면 치즈가 불닭을 먹는 중", en: "The cheese is eating the buldak" },
  { ko: "일단 한입만 줘봐요", en: "Just give me one bite" },
] as const;
