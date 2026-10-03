import type { Post } from "@/lib/posts";

/*
  메인 화면 전용 목업 데이터 (임시)
  카드에 필요한 color·question.id(질문 종류)·author.flag가 아직 공통 Post 타입에 없어서 여기서 확장해 씁니다.
  공통 posts.ts에 이 필드를 추가하는 PR이 합쳐지면 이 파일을 지우고 @/lib/posts를 씁니다.
*/

/**
  받고 싶은 평가 = 송희님 작성 화면의 질문 종류 (feat/write-flow의 src/lib/write-data.ts QuestionId와 같은 값)
  작성 화면이 main에 합쳐지면 이 타입 대신 그쪽 QuestionId를 가져다 씁니다.
*/
export type QuestionId = "korean" | "eat" | "fix" | "spice" | "look";

/** 메인 카드 칩에 보이는 한국어 문구 */
export const QUESTION_LABELS: Record<QuestionId, string> = {
  korean: "한국식인지 궁금해요",
  eat: "한국인이 먹고 싶어 할지 궁금해요",
  fix: "고칠 점이 있는지 궁금해요",
  spice: "맵기가 적당한지 궁금해요",
  look: "진짜처럼 보이는지 궁금해요",
};

export type HomePost = Omit<Post, "author" | "question"> & {
  color: string; // 메인 카드 배경색
  cardPhoto: string; // 메인 카드에 쓰는 사진 (상세는 photos 전체)
  question: Post["question"] & { id: QuestionId };
  author: Post["author"] & { flag: string };
};

/** 투표 참여 인원 */
export const participantsOf = (post: HomePost) => post.votes.reduce((sum, n) => sum + n, 0);

export function getHomePost(id: string) {
  return HOME_POSTS.find((p) => p.id === id);
}

export const HOME_POSTS: HomePost[] = [
  {
    id: "1",
    title: "제가 만든 불닭 레시피 어떤가요?",
    body: "안녕하세요, 저는 캐나다에서 온 샘이에요 :)\n불닭을 처음 만들어봤어요.\n위에 치즈랑 소시지를 올려봤어요.\n한국에서 먹는 불닭이랑 비슷한가요?",
    photos: ["/images/detail-buldak.png", "/images/card-buldak.png", "/images/detail-buldak.png"],
    cardPhoto: "/images/card-buldak.png",
    color: "#fae276",
    author: { name: "Sam", country: "캐나다", flag: "🇨🇦" },
    createdAt: "2026-09-28T09:00:00Z",
    question: {
      id: "korean",
      text: "한국에서 먹는 불닭이랑 비슷한가요?",
      options: ["완전\n한국식", "비슷해요", "한국식\n아님"],
    },
    votes: [120, 98, 44],
    commentCount: 18,
  },
  {
    id: "2",
    title: "치즈 듬뿍 소시지 불닭, 먹고 싶나요?",
    body: "안녕하세요, 프랑스에서 온 엠마예요!\n치즈를 듬뿍 넣고 소시지에 칼집을 내서 넣었어요.\n한국 분들도 이렇게 먹나요?",
    photos: ["/images/detail-buldak.png", "/images/card-buldak.png"],
    cardPhoto: "/images/detail-buldak.png",
    color: "#ffc6ff",
    author: { name: "Emma", country: "프랑스", flag: "🇫🇷" },
    createdAt: "2026-09-27T12:00:00Z",
    question: {
      id: "eat",
      text: "이 불닭, 먹고 싶나요?",
      options: ["주문할래요", "바꾸면\n먹을래요", "안\n먹을래요"],
    },
    votes: [80, 45, 23],
    commentCount: 9,
  },
  {
    id: "3",
    title: "까르보 불닭, 뭘 고치면 될까요?",
    body: "브라질에서 온 루카스예요.\n우유랑 달걀 노른자를 넣어서 까르보 스타일로 만들었어요.",
    photos: ["/images/card-buldak.png"],
    cardPhoto: "/images/card-buldak.png",
    color: "#c8b5ff",
    author: { name: "Lucas", country: "브라질", flag: "🇧🇷" },
    createdAt: "2026-09-26T08:00:00Z",
    question: {
      id: "fix",
      text: "뭘 고치면 될까요?",
      options: ["치즈\n줄이기", "더\n맵게", "이대로\n완벽"],
    },
    votes: [20, 55, 22],
    commentCount: 6,
  },
  {
    id: "4",
    title: "아침으로 불닭, 한국에서도 먹나요?",
    body: "독일에서 온 미아예요.\n저는 아침마다 불닭을 먹어요.\n한국에서도 그런가요?",
    photos: ["/images/detail-buldak.png"],
    cardPhoto: "/images/detail-buldak.png",
    color: "#ccf54b",
    author: { name: "Mia", country: "독일", flag: "🇩🇪" },
    createdAt: "2026-09-25T07:00:00Z",
    question: {
      id: "korean",
      text: "한국에서도 아침으로 불닭을 먹나요?",
      options: ["완전\n한국식", "비슷해요", "한국식\n아님"],
    },
    votes: [5, 11, 38],
    commentCount: 4,
  },
  {
    id: "5",
    title: "떡 넣은 불닭 어때요?",
    body: "일본에서 온 켄지예요.\n떡볶이 떡을 넣어서 쫄깃하게 만들었어요.",
    photos: ["/images/card-buldak.png", "/images/detail-buldak.png"],
    cardPhoto: "/images/card-buldak.png",
    color: "#9fe7ff",
    author: { name: "Kenji", country: "일본", flag: "🇯🇵" },
    createdAt: "2026-09-24T10:00:00Z",
    question: {
      id: "eat",
      text: "떡 넣은 불닭, 먹고 싶나요?",
      options: ["주문할래요", "바꾸면\n먹을래요", "안\n먹을래요"],
    },
    votes: [17, 10, 4],
    commentCount: 2,
  },
];
