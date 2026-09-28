import detailImage from '../assets/detail-buldak.png'
import cardImage from '../assets/card-buldak.png'

export type Lang = 'kr' | 'en'

/** Same content for everyone — Korean users read `kr`, foreign users read `en`. */
export type Localized<T = string> = Record<Lang, T>

export type Ask = 'authentic' | 'appeal' | 'improve'

// Matches the "받고 싶은 평가" options on the write screen.
export const askLabels: Record<Ask, Localized> = {
  authentic: { kr: '한국식인지 궁금해요', en: 'Is it Korean-style?' },
  appeal: { kr: '한국인이 먹고 싶어 할지 궁금해요', en: 'Would Koreans want it?' },
  improve: { kr: '고칠 점이 있는지 궁금해요', en: 'What should I fix?' },
}

// Vote options follow from what the author asked for.
export const askChoices: Record<Ask, Localized<string[]>> = {
  authentic: {
    kr: ['완전 한국식이에요', '비슷해요', '한국식은 아니에요'],
    en: ['Totally Korean-style', 'Pretty close', 'Not Korean-style'],
  },
  appeal: {
    kr: ['먹고 싶어요!', '한 번쯤은?', '별로예요'],
    en: ['I’d eat it!', 'Maybe once?', 'Not for me'],
  },
  improve: {
    kr: ['이대로 완벽해요', '조금만 고치면 돼요', '많이 고쳐야 해요'],
    en: ['Perfect as is', 'Needs a little tweak', 'Needs a lot of work'],
  },
}

export interface Author {
  name: string
  flag: string
  country: Localized
}

export interface Post {
  id: string
  color: string
  author: Author
  ask: Ask
  cardImage: string
  image: string
  participants: number
  commentCount: number
  /** Title split into display lines (detail page); joined with spaces on the card. */
  title: Localized<string[]>
  body: Localized<string[]>
  results: number[]
}

export const postTitle = (post: Post, lang: Lang) => post.title[lang].join(' ')

// Mock data — photos are placeholders until real uploads come from the API.
export const posts: Post[] = [
  {
    id: '1',
    color: '#fae276',
    author: { name: 'Sam', flag: '🇨🇦', country: { kr: '캐나다', en: 'Canada' } },
    ask: 'authentic',
    cardImage,
    image: detailImage,
    participants: 262,
    commentCount: 18,
    title: {
      kr: ['제가 만든', '불닭 레시피', '어떤가요?'],
      en: ['What do you', 'think of my', 'Buldak recipe?'],
    },
    body: {
      kr: [
        '안녕하세요, 저는 캐나다에서 온 샘이에요 :)',
        '불닭을 처음 만들어봤어요.',
        '위에 치즈랑 소시지를 올려봤어요.',
        '한국에서 먹는 불닭이랑 비슷한가요?',
      ],
      en: [
        'Hi, I’m Sam from Canada :)',
        'This is my first time making Buldak.',
        'I topped it with cheese and sausages.',
        'Is it like the Buldak you eat in Korea?',
      ],
    },
    results: [15, 62, 4],
  },
  {
    id: '2',
    color: '#ffc6ff',
    author: { name: 'Emma', flag: '🇫🇷', country: { kr: '프랑스', en: 'France' } },
    ask: 'appeal',
    cardImage: detailImage,
    image: detailImage,
    participants: 148,
    commentCount: 9,
    title: {
      kr: ['치즈 듬뿍', '소시지 불닭,', '먹고 싶나요?'],
      en: ['Would you eat', 'my cheesy', 'sausage Buldak?'],
    },
    body: {
      kr: ['안녕하세요, 프랑스에서 온 엠마예요!', '치즈를 듬뿍 넣고 소시지에 칼집을 내서 넣었어요.', '한국 분들도 이렇게 먹나요?'],
      en: ['Hi, I’m Emma from France!', 'I added lots of cheese and scored sausages.', 'Do Koreans eat it like this too?'],
    },
    results: [40, 21, 12],
  },
  {
    id: '3',
    color: '#c8b5ff',
    author: { name: 'Lucas', flag: '🇧🇷', country: { kr: '브라질', en: 'Brazil' } },
    ask: 'improve',
    cardImage,
    image: detailImage,
    participants: 97,
    commentCount: 6,
    title: {
      kr: ['까르보 불닭,', '뭘 고치면', '될까요?'],
      en: ['How can I', 'improve my', 'Carbo Buldak?'],
    },
    body: {
      kr: ['브라질에서 온 루카스예요.', '우유랑 달걀 노른자를 넣어서 까르보 스타일로 만들었어요.'],
      en: ['I’m Lucas from Brazil.', 'I made it carbonara-style with milk and egg yolk.'],
    },
    results: [8, 30, 19],
  },
  {
    id: '4',
    color: '#ccf54b',
    author: { name: 'Mia', flag: '🇩🇪', country: { kr: '독일', en: 'Germany' } },
    ask: 'authentic',
    cardImage: detailImage,
    image: detailImage,
    participants: 54,
    commentCount: 4,
    title: {
      kr: ['아침으로 불닭,', '한국에서도', '먹나요?'],
      en: ['Is Buldak', 'a breakfast', 'thing in Korea?'],
    },
    body: {
      kr: ['독일에서 온 미아예요.', '저는 아침마다 불닭을 먹어요.', '한국에서도 그런가요?'],
      en: ['I’m Mia from Germany.', 'I eat Buldak every morning.', 'Is that normal in Korea?'],
    },
    results: [5, 11, 38],
  },
  {
    id: '5',
    color: '#9fe7ff',
    author: { name: 'Kenji', flag: '🇯🇵', country: { kr: '일본', en: 'Japan' } },
    ask: 'appeal',
    cardImage,
    image: detailImage,
    participants: 31,
    commentCount: 2,
    title: {
      kr: ['떡 넣은', '불닭', '어때요?'],
      en: ['What about', 'Buldak with', 'rice cakes?'],
    },
    body: {
      kr: ['일본에서 온 켄지예요.', '떡볶이 떡을 넣어서 쫄깃하게 만들었어요.'],
      en: ['I’m Kenji from Japan.', 'I added tteokbokki rice cakes for chewiness.'],
    },
    results: [12, 9, 3],
  },
]

export function getPost(id: string | undefined): Post {
  return posts.find((p) => p.id === id) ?? posts[0]
}

const cardColors = ['#fae276', '#ffc6ff', '#c8b5ff', '#ccf54b', '#9fe7ff']

/**
 * Mock "create post": adds it to the top of the in-memory feed (lost on reload).
 * TODO: send to API, which will also return the Korean translation.
 */
export function addPost(input: { photos: string[]; ask: Ask; title: string; body: string }): string {
  const id = `local-${Date.now()}`
  const lines = input.body ? input.body.split('\n').filter(Boolean) : []
  posts.unshift({
    id,
    color: cardColors[posts.length % cardColors.length],
    author: { name: 'You', flag: '🌏', country: { kr: '해외', en: 'abroad' } },
    ask: input.ask,
    cardImage: input.photos[0],
    image: input.photos[0],
    participants: 0,
    commentCount: 0,
    title: { kr: [input.title], en: [input.title] },
    body: { kr: lines, en: lines },
    results: [0, 0, 0],
  })
  try {
    localStorage.setItem('kfood:mainIndex', '0')
  } catch {
    // ignore
  }
  return id
}

export const COMMENT_MAX = 20

/** Who wrote a comment — non-Korean comments are marked with their flag. */
export type CommentAuthor = { kind: 'korean' } | { kind: 'foreigner'; flag: string } | { kind: 'author'; flag: string }

export interface Comment {
  id: string
  kind: 'text' | 'emoji'
  text: Localized
  color: string
  author: CommentAuthor
}

const KOREAN: CommentAuthor = { kind: 'korean' }
const same = (t: string): Localized => ({ kr: t, en: t })

/** Starter comments for a post, oldest first (mock — will come from the API). */
export function seedCommentsFor(post: Post): Comment[] {
  const id = (n: number) => `${post.id}-seed-${n}`
  return [
    { id: id(1), kind: 'emoji', text: same('😵'), color: '#7144ff', author: KOREAN },
    { id: id(2), kind: 'text', text: { kr: '보기만해도 맵네요ㅠㅠ', en: 'Looks so spicy ㅠㅠ' }, color: '#ffe056', author: KOREAN },
    { id: id(3), kind: 'emoji', text: same('🔥'), color: '#ccf54b', author: KOREAN },
    { id: id(4), kind: 'text', text: { kr: '참치마요 삼김이랑 드셔보세요', en: 'Try tuna-mayo kimbap' }, color: '#ffc6ff', author: KOREAN },
    {
      id: id(5),
      kind: 'text',
      text: { kr: '저도 만들어볼래요!', en: 'I wanna try this too' },
      color: '#9fe7ff',
      author: { kind: 'foreigner', flag: '🇺🇸' },
    },
    { id: id(6), kind: 'emoji', text: same('🧀'), color: '#4ae9ff', author: KOREAN },
    { id: id(7), kind: 'text', text: { kr: '치즈는 많을수록 맛있죠!', en: 'More cheese, better!' }, color: '#ffe056', author: KOREAN },
    { id: id(8), kind: 'text', text: { kr: '소시지 칼집 미쳤다', en: 'Sausage cuts: 10/10' }, color: '#c8b5ff', author: KOREAN },
    {
      id: id(9),
      kind: 'text',
      text: { kr: '고마워요! 다음엔 떡도 넣을게요', en: 'Thanks! Tteok next!' },
      color: '#ffae8f',
      author: { kind: 'author', flag: post.author.flag },
    },
    { id: id(10), kind: 'emoji', text: same('🤤'), color: '#ffae8f', author: KOREAN },
  ]
}

const viewers = new Map<string, CommentAuthor>()
const FOREIGN_VIEWER: CommentAuthor = { kind: 'foreigner', flag: '🌏' }

/**
 * Who the current user is when commenting on `post` (stable object per post).
 * Mock: Korean users on /kr; on /en it's the author for posts written in this session, else a foreigner.
 */
export function viewerFor(post: Post, lang: Lang): CommentAuthor {
  if (lang === 'kr') return KOREAN
  if (!post.id.startsWith('local-')) return FOREIGN_VIEWER
  let viewer = viewers.get(post.id)
  if (!viewer) {
    viewer = { kind: 'author', flag: post.author.flag }
    viewers.set(post.id, viewer)
  }
  return viewer
}

export const quickEmojis = ['🔥', '👍', '💧', '🤤', '🧀', '😵‍💫']

export const bubbleColors = ['#ffe056', '#ffc6ff', '#c8b5ff', '#ccf54b', '#9fe7ff', '#ffae8f', '#7144ff', '#4ae9ff']
