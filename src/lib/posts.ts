/*
  게시글 데이터 모양 (초안 — 송희·지현 같이 확정)
  서버가 붙기 전까지 화면은 아래 목업 데이터로 만듭니다.
  항목을 추가·변경할 땐 상대에게 먼저 알려 주세요. 두 사람 화면이 모두 이 타입을 씁니다.
*/

/** 작성자가 받고 싶은 평가 (작성 화면의 "받고 싶은 평가" 선택지) */
export type Ask = "authentic" | "appeal" | "improve";

export const ASK_LABELS: Record<Ask, string> = {
  authentic: "한국식인지 궁금해요",
  appeal: "한국인이 먹고 싶어 할지 궁금해요",
  improve: "고칠 점이 있는지 궁금해요",
};

export type Post = {
  id: string;
  title: string;
  body: string;
  photos: string[]; // 첫 장이 대표 사진
  color: string; // 메인 카드 배경색
  ask: Ask;
  author: { name: string; country: string; flag: string };
  createdAt: string; // ISO 날짜
  question: {
    text: string; // 투표 질문
    options: string[]; // 선택지
  };
  votes: number[]; // 선택지별 투표 수 (options와 같은 순서)
  commentCount: number;
};

/** 투표 참여 인원 */
export const participantsOf = (post: Post) => post.votes.reduce((sum, n) => sum + n, 0);

export const MOCK_POSTS: Post[] = [
  {
    id: "1",
    title: "제가 만든 불닭 레시피 어떤가요?",
    body: "안녕하세요, 저는 캐나다에서 온 샘이에요 :) 불닭을 처음 만들어봤어요. 위에 치즈랑 소시지를 올려봤어요. 한국에서 먹는 불닭이랑 비슷한가요?",
    photos: ["/images/card-buldak.png"],
    color: "#fae276",
    ask: "authentic",
    author: { name: "Sam", country: "캐나다", flag: "🇨🇦" },
    createdAt: "2026-09-28T09:00:00Z",
    question: {
      text: "한국에서 먹는 불닭이랑 비슷한가요?",
      options: ["완전 한국식이에요", "비슷해요", "한국식은 아니에요"],
    },
    votes: [120, 98, 44],
    commentCount: 18,
  },
  {
    id: "2",
    title: "치즈 듬뿍 소시지 불닭, 먹고 싶나요?",
    body: "안녕하세요, 프랑스에서 온 엠마예요! 치즈를 듬뿍 넣고 소시지에 칼집을 내서 넣었어요. 한국 분들도 이렇게 먹나요?",
    photos: ["/images/detail-buldak.png"],
    color: "#ffc6ff",
    ask: "appeal",
    author: { name: "Emma", country: "프랑스", flag: "🇫🇷" },
    createdAt: "2026-09-27T12:00:00Z",
    question: {
      text: "이 불닭, 먹고 싶나요?",
      options: ["먹고 싶어요!", "한 번쯤은?", "별로예요"],
    },
    votes: [80, 45, 23],
    commentCount: 9,
  },
  {
    id: "3",
    title: "까르보 불닭, 뭘 고치면 될까요?",
    body: "브라질에서 온 루카스예요. 우유랑 달걀 노른자를 넣어서 까르보 스타일로 만들었어요.",
    photos: ["/images/card-buldak.png"],
    color: "#c8b5ff",
    ask: "improve",
    author: { name: "Lucas", country: "브라질", flag: "🇧🇷" },
    createdAt: "2026-09-26T08:00:00Z",
    question: {
      text: "뭘 고치면 될까요?",
      options: ["이대로 완벽해요", "조금만 고치면 돼요", "많이 고쳐야 해요"],
    },
    votes: [20, 55, 22],
    commentCount: 6,
  },
  {
    id: "4",
    title: "아침으로 불닭, 한국에서도 먹나요?",
    body: "독일에서 온 미아예요. 저는 아침마다 불닭을 먹어요. 한국에서도 그런가요?",
    photos: ["/images/detail-buldak.png"],
    color: "#ccf54b",
    ask: "authentic",
    author: { name: "Mia", country: "독일", flag: "🇩🇪" },
    createdAt: "2026-09-25T07:00:00Z",
    question: {
      text: "한국에서도 아침으로 불닭을 먹나요?",
      options: ["완전 한국식이에요", "비슷해요", "한국식은 아니에요"],
    },
    votes: [5, 11, 38],
    commentCount: 4,
  },
  {
    id: "5",
    title: "떡 넣은 불닭 어때요?",
    body: "일본에서 온 켄지예요. 떡볶이 떡을 넣어서 쫄깃하게 만들었어요.",
    photos: ["/images/card-buldak.png"],
    color: "#9fe7ff",
    ask: "appeal",
    author: { name: "Kenji", country: "일본", flag: "🇯🇵" },
    createdAt: "2026-09-24T10:00:00Z",
    question: {
      text: "떡 넣은 불닭, 먹고 싶나요?",
      options: ["먹고 싶어요!", "한 번쯤은?", "별로예요"],
    },
    votes: [17, 10, 4],
    commentCount: 2,
  },
];

export function getPost(id: string) {
  return MOCK_POSTS.find((p) => p.id === id);
}
