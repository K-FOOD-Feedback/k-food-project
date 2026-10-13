/*
  랜딩 문구 (한국어 / 영어) — 6. 랜딩, 담당 송희
  가운데 게시물은 서비스 설명용 장면입니다 (실제 글 아님).
  색: 카드는 회색으로 차분하게, 한국인 반응은 댓글마다 다른 색(핑크·노랑·라일락, 앱 댓글 더미처럼), 투표·한국인 버튼은 핑크, 외국인 버튼은 노랑
*/

/** 랜딩 언어 — 처음엔 기기 언어로. 중국어·일본어는 랜딩까지만 (이후 화면은 영어 외국인 화면으로) */
export type LandingLang = "ko" | "en" | "zh" | "ja";

export const COPY = {
  ko: {
    brand: "오늘의 참견",
    skip: "건너뛰기",
    // 스크롤 단계마다 바뀌는 제목 (두 줄씩)
    titles: [
      ["전 세계의 한식 도전에,", "한국인이 한마디."],
      ["한국인이 보고", "투표하고"],
      ["한마디씩", "보태요"],
      ["글쓴이도", "답할 수 있어요"],
      ["이번엔", "당신 차례예요"],
    ],
    korean: { role: "한국인이에요", action: "투표하고 한마디 하기" },
    foreigner: { role: "외국인이에요", action: "둘러보고 한식 올리기" },
    // "로그인"만 흰색으로 (누를 수 있다는 표시)
    loginLead: "이미 가입했다면",
    loginAction: "로그인",
    loginTitle: "다시 만나서 반가워요",
    loginBody: "가입했던 구글 계정으로 바로 이어서 할 수 있어요.",
    pickTitle: "당신은 누구인가요?",
    pickHint: "토큰을 칸에 넣거나 칸을 눌러요",
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
    skip: "Skip",
    titles: [
      ["Tried Korean food?", "See how Koreans react."],
      ["Koreans vote", "on your question"],
      ["And leave", "a comment"],
      ["You can", "reply too"],
      ["Now it's", "your turn"],
    ],
    korean: { role: "I'm Korean", action: "Vote and comment" },
    foreigner: { role: "I'm not Korean", action: "Look around and share" },
    loginLead: "Already have an account?",
    loginAction: "Log in",
    loginTitle: "Welcome back",
    loginBody: "Continue with the Google account you signed up with.",
    pickTitle: "Who are you?",
    pickHint: "Drop the token in, or tap a box",
    scroll: "See how it works",
    author: "Sam from Canada",
    authorTag: "Author",
    voteTitle: "What do you think?",
    story: "Buldak was too spicy,\nso I added some cheese.",
    question: "Would Koreans eat this?",
    options: ["I'd\neat it", "With\nchanges", "I'd\npass"],
    reply: "Next time I'll use half the cheese!",
  },
  zh: {
    brand: "오늘의 참견",
    skip: "跳过",
    titles: [
      ["做过韩国料理吗？", "看看韩国人怎么说。"],
      ["韩国人来", "为你的问题投票"],
      ["还会留下", "一句评论"],
      ["你也可以", "回复他们"],
      ["现在", "轮到你了"],
    ],
    korean: { role: "我是韩国人", action: "投票和评论" },
    foreigner: { role: "我不是韩国人", action: "逛逛并分享" },
    loginLead: "已经有账号了？",
    loginAction: "登录",
    loginTitle: "欢迎回来",
    loginBody: "用注册时的 Google 账号继续。",
    pickTitle: "你是谁？",
    pickHint: "把手势拖进格子，或直接点格子",
    scroll: "看看怎么玩",
    author: "来自加拿大的 Sam",
    authorTag: "作者",
    voteTitle: "你怎么看？",
    story: "火鸡面太辣了，\n我加了点芝士。",
    question: "韩国人会吃吗？",
    options: ["会吃", "改改\n再吃", "不吃"],
    reply: "下次芝士只放一半！",
  },
  ja: {
    brand: "오늘의 참견",
    skip: "スキップ",
    titles: [
      ["韓国料理、作ってみた？", "韓国人はどう思う？"],
      ["韓国人が", "あなたの質問に投票"],
      ["ひとこと", "コメントも"],
      ["あなたも", "返信できる"],
      ["次は", "あなたの番"],
    ],
    korean: { role: "韓国人です", action: "投票してコメント" },
    foreigner: { role: "外国人です", action: "見て回って投稿" },
    loginLead: "アカウントをお持ちですか？",
    loginAction: "ログイン",
    loginTitle: "おかえりなさい",
    loginBody: "登録したGoogleアカウントで続けられます。",
    pickTitle: "あなたは誰？",
    pickHint: "トークンを枠に入れるか、枠をタップ",
    scroll: "使い方を見る",
    author: "カナダのSam",
    authorTag: "投稿者",
    voteTitle: "どう思う？",
    story: "ブルダックが辛すぎて、\nチーズを入れてみた。",
    question: "韓国人は食べるかな？",
    options: ["食べる", "変えたら\n食べる", "パス"],
    reply: "次はチーズを半分にしてみる！",
  },
} as const;

/** 예시 투표 비율 */
export const SAMPLE_PCTS = [58, 31, 11];

/** 한국인 반응 — 한국어가 아닌 화면에서는 번역을 크게, 한국어 원문을 작게 (\n은 말풍선 줄바꿈 자리) */
export const REACTIONS = [
  { ko: "면이 어디 있는데요", en: "Where are the noodles?", zh: "面在哪儿？", ja: "麺はどこ？" },
  { ko: "이 정도면 치즈가 불닭을 먹는 중", en: "The cheese is eating\nthe buldak", zh: "这芝士都快\n把火鸡面吃了", ja: "チーズが\nブルダックを食べてる" },
  { ko: "일단 한입만 줘봐요", en: "Just give me one bite", zh: "先给我尝一口", ja: "とりあえず一口ちょうだい" },
] as const;
