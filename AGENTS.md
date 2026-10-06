<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 팀 작업 규칙 (송희 · 지현)

두 사람이 각자 Claude Code로 화면을 만들어 하나의 앱에 합칩니다. 아래 규칙을 반드시 따르세요.

## 기술 스택 — 바꾸지 않음
- Next.js (App Router) + TypeScript + Tailwind CSS 4. 다른 프레임워크(Vite, React Router 등)나 CSS Modules를 새로 들이지 않습니다.
- 새 라이브러리를 추가해야 하면 PR 설명에 이유를 적습니다.

## 파트와 담당 (URL = 폴더)
| 파트 | 주소 | 담당 |
| --- | --- | --- |
| 1. 랜딩 | `/` | 송희 |
| 1. 메인 카드 | `/home` | 지현 |
| 2·3. 상세 + 투표 | `/posts/[id]` | 지현 |
| 4. 댓글 | `/posts/[id]/comments` | 지현 |
| 5. 수정 (+ 삭제) | `/posts/[id]/edit` | 송희 |
| 6. 콘텐츠 작성 (로그인 포함) | `/write` | 송희 |
| 7. 마이 (나중) | `/my` | 송희 |

- 상대 담당 화면의 파일은 고치지 않습니다. 필요하면 상대에게 요청합니다.
- 겹치는 지점:
  - 상세 화면의 "더보기 → 수정/삭제" 메뉴는 송희가 `src/components/PostMenu.tsx`로 만들고, 지현이 상세 화면에 끼워 넣습니다.
  - 메인의 "Share your K-food" 버튼은 `/write`로 이동만 합니다. 이후 동작(로그인 → 사진 선택)은 송희 담당입니다.

## 공통으로 쓰는 것
- **디자인 토큰**: 색·글꼴·간격은 `src/app/globals.css`의 `@theme`에만 정의하고 이름으로 씁니다 (`bg-pink` O, `bg-[#ff87c5]` X).
- **공통 컴포넌트**: 버튼, 상단 바, 바텀시트, 토스트, 카드, 입력칸, 아이콘은 `src/components/`에 하나씩만 둡니다. 새로 만들기 전에 이미 있는지 확인하고, 없으면 상대에게 알린 뒤 만듭니다.
- **데이터**: 게시글 모양은 `src/lib/posts.ts`의 `Post` 타입 하나만 씁니다. 서버 전까지는 `MOCK_POSTS`로 화면을 만듭니다. 타입을 바꾸면 상대에게 알립니다.
- 한 화면에서만 쓰는 부품은 그 화면 폴더 안에 둬도 됩니다.

## CTA 규칙 (송희·지현 합의)
- **화살표 CTA** (`ArrowCta`, 알약 + 오른쪽 원 →): "다음 단계로 넘어가는" 버튼에만. 지금은 작성 플로우의 Next · Write with AI · Post.
- **일반 CTA** (`PillButton` 또는 같은 모양의 알약): 그 자리에서 끝나는 행동 — 저장, 삭제, 취소, 홈으로, 투표하러 가기, Share your K-food 등.

## 데이터 분석 (Mixpanel · 담당 송희)
- 행동 기록은 `src/lib/analytics.ts` 의 `track()` 만 씁니다. 이벤트 이름은 `EventName` 목록에서만 고르고, 새 이벤트는 목록과 `docs/analytics-events.md` 에 같이 추가합니다.
- 새 화면·버튼을 만들면 의미 있는 행동에 이벤트를 붙입니다 (타이핑은 입력칸을 나갈 때 한 번).
- 개인정보·글 내용은 보내지 않습니다. 토큰은 `.env.local` (`.env.example` 참고).

## 작업 방식
- 작업은 `feat/파트-이름` 브랜치에서 합니다.
- **내 담당 화면만 바꾼 경우**: 검사 통과 후 PR 없이 main에 바로 합쳐서 올려도 됩니다. 올린 뒤 상대에게 알립니다.
- **같이 쓰는 것을 바꾼 경우** (`src/components/`, `src/lib/`, `globals.css`, `layout.tsx`, `AGENTS.md`, `package.json`): 반드시 PR → 상대 확인 → 합치기.
- 작업 시작 전에 항상 `git pull`로 main 최신 내용을 받아 옵니다.
- 커밋 전 `npm run lint`, `npm run typecheck`, `npm run build`를 모두 통과시킵니다.
- 비밀번호·API 키는 코드에 쓰지 않고 `.env.local`에 둡니다.
