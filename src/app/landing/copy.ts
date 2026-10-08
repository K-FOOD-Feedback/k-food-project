/*
  랜딩 문구 (한국어 / 영어) — 6. 랜딩, 담당 송희
  가운데 게시물은 서비스 설명용 장면입니다 (실제 글 아님).
  색: 카드는 회색으로 차분하게, 한국인 반응·투표·한국인 버튼은 핑크, 외국인 버튼은 노랑
*/

export type LandingLang = "ko" | "en";

export const COPY = {
  ko: {
    brand: "오늘의 참견",
    // 스크롤 단계마다 바뀌는 제목 (두 줄씩)
    titles: [
      ["전 세계의 한식 도전에,", "한국인이 한마디."],
      ["한국인이 보고", "투표하고"],
      ["한마디씩", "보태요"],
      ["글쓴이도", "답할 수 있어요"],
      ["이제 한마디", "보태러 가볼까요?"],
    ],
    korean: { role: "한국인이에요", action: "투표하고 한마디 하기" },
    foreigner: { role: "외국인이에요", action: "둘러보고 한식 올리기" },
    login: "이미 가입했다면 로그인",
    scroll: "어떻게 하는지 볼까요?",
    author: "캐나다의 Sam",
    authorTag: "작성자",
    voteTitle: "어떻게 생각하세요?",
    story: "불닭이 너무 매워서\n치즈를 좀 넣었어요.",
    question: "한국인이 먹을지 궁금해요",
    options: ["먹을래요", "바꾸면\n먹을래요", "안\n먹을래요"],
    reply: "다음엔 치즈를 반만 넣어 볼게요!",
  },
  en: {
    brand: "오늘의 참견",
    titles: [
      ["Tried Korean food?", "See how Koreans react."],
      ["Koreans vote", "on your question"],
      ["And leave", "a comment"],
      ["You can", "reply too"],
      ["Ready to", "jump in?"],
    ],
    korean: { role: "I'm Korean", action: "Vote and comment" },
    foreigner: { role: "I'm not Korean", action: "Look around and share" },
    login: "Already have an account? Log in",
    scroll: "See how it works",
    author: "Sam from Canada",
    authorTag: "Author",
    voteTitle: "What do you think?",
    story: "Buldak was too spicy,\nso I added some cheese.",
    question: "Would Koreans eat this?",
    options: ["I'd\neat it", "With\nchanges", "I'd\npass"],
    reply: "Next time I'll use half the cheese!",
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
