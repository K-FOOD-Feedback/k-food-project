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
| 1. 랜딩 + 메인 카드 | `/`, `/home` | 지현 |
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

## 작업 방식
- main에서 직접 작업하지 않습니다. `feat/파트-이름` 브랜치 → PR → 상대 리뷰 → 합치기.
- 화면 하나가 끝날 때마다 작게 PR을 올립니다.
- 커밋 전 `npm run lint`, `npm run typecheck`, `npm run build`를 모두 통과시킵니다.
- 비밀번호·API 키는 코드에 쓰지 않고 `.env.local`에 둡니다.
