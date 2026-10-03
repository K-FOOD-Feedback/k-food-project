/*
  게시글 데이터 모양 (초안 — 송희·지현 같이 확정)
  서버가 붙기 전까지 화면은 아래 목업 데이터로 만듭니다.
  항목을 추가·변경할 땐 상대에게 먼저 알려 주세요. 두 사람 화면이 모두 이 타입을 씁니다.
*/

export type Post = {
  id: string;
  title: string;
  body: string;
  photos: string[]; // 첫 장이 대표 사진
  author: { name: string; country: string };
  createdAt: string; // ISO 날짜
  question: {
    text: string; // 투표 질문
    options: string[]; // 선택지
  };
  votes: number[]; // 선택지별 투표 수 (options와 같은 순서)
  commentCount: number;
};

export const MOCK_POSTS: Post[] = [
  {
    id: "1",
    title: "제 불닭 레시피 어떤가요?",
    body: "불닭을 처음 만들어 봤어요. 모차렐라, 소시지, 대파를 넣어서 까르보나라처럼 만들었어요.",
    photos: [],
    author: { name: "Sam", country: "Canada" },
    createdAt: "2026-09-28T09:00:00Z",
    question: {
      text: "한국 식당에 이 메뉴가 있다면 주문할 것 같나요?",
      options: ["네, 바로 주문할래요!", "조금 바꾸면 먹어볼래요", "아니요, 안 먹을래요"],
    },
    votes: [120, 98, 44],
    commentCount: 18,
  },
  {
    id: "2",
    title: "My first kimbap",
    body: "I rolled kimbap for the first time with tuna mayo and pickled radish.",
    photos: [],
    author: { name: "Lena", country: "Germany" },
    createdAt: "2026-09-27T12:00:00Z",
    question: {
      text: "Does this look like real Korean kimbap?",
      options: ["Totally Korean!", "Korean-ish", "Not really"],
    },
    votes: [0, 0, 0],
    commentCount: 0,
  },
];

export function getPost(id: string) {
  return MOCK_POSTS.find((p) => p.id === id);
}
