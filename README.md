# 오늘의 참견 (k-food-project)

> 전 세계의 한식 도전에 한마디를 보태는 곳

모바일 웹에서 보기 좋게 만든 프로젝트입니다.
지금은 **파트별 빈 페이지**만 있고, 송희·지현이 파트를 나눠 채워 갑니다. 파트와 담당, 공통 규칙은 [AGENTS.md](AGENTS.md)를 보세요.
로그인, 데이터베이스, AI 기능, 배포는 아직 연결하지 않았습니다.

---

## 기술 구성

| 항목 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS 4 |
| 패키지 관리 | npm |

---

## 실행 환경

두 사람이 **같은 버전**으로 작업해야 오류가 생기지 않습니다.

- **Node.js**: `24.14.1` (최소 20.9.0 이상)
- **npm**: 10 이상

### 지금 내 버전 확인하기

터미널(맥은 `터미널`, 윈도우는 `PowerShell`)에 입력하세요.

```bash
node -v
npm -v
```

`v24.x.x` 처럼 나오면 정상입니다.

### Node.js가 없거나 버전이 다르다면

- 간단한 방법: [nodejs.org](https://nodejs.org) 에서 **LTS** 버전 설치
- nvm(버전 관리 도구)을 쓴다면, 프로젝트 폴더에서 아래를 입력하면 [.nvmrc](.nvmrc) 에 적힌 버전으로 자동 맞춰집니다.

```bash
nvm install
nvm use
```

---

## 설치 방법

처음 한 번만 하면 됩니다.

```bash
# 1. 저장소 내려받기 (이미 받았다면 건너뛰세요)
git clone https://github.com/K-FOOD-Feedback/k-food-project.git
cd k-food-project

# 2. 필요한 라이브러리 설치
npm ci
```

> **`npm install` 이 아니라 `npm ci` 를 쓰는 이유**
> `package-lock.json` 에 적힌 것과 **완전히 똑같은** 버전을 설치해 줍니다.
> 두 사람의 환경이 어긋나는 것을 막아주므로, 평소에는 `npm ci` 를 쓰세요.
> 새 라이브러리를 **추가할 때만** `npm install <이름>` 을 씁니다.

---

## 실행 방법

```bash
npm run dev
```

터미널에 주소가 뜨면 브라우저에서 엽니다.

- **http://localhost:3000**

화면을 끄려면 터미널에서 `Ctrl + C` 를 누릅니다.

### 휴대폰으로 확인하기

컴퓨터와 휴대폰이 **같은 와이파이**에 연결되어 있어야 합니다.
`npm run dev` 실행 시 터미널에 함께 표시되는 `Network:` 주소(예: `http://192.168.0.5:3000`)를 휴대폰 브라우저에 입력하세요.

---

## 검사 방법

코드를 고친 뒤, **커밋하기 전에** 아래 세 가지를 순서대로 돌려보세요.
모두 통과해야 다른 사람 컴퓨터에서도 문제없이 돌아갑니다.

```bash
npm run lint       # 1. 코드 규칙 검사 (띄어쓰기, 안 쓰는 변수 등)
npm run typecheck  # 2. 타입 검사 (값의 종류가 맞는지)
npm run build      # 3. 빌드 (실제 배포용으로 만들어지는지)
```

### 결과 읽는 법

- 아무 메시지 없이 끝나거나 `✓` 표시가 나오면 **통과**입니다.
- 빨간 글씨로 파일 이름과 줄 번호가 나오면, 그 위치를 고쳐야 합니다.
- `npm run lint` 에서 자동으로 고칠 수 있는 항목은 아래 명령으로 정리됩니다.

```bash
npx eslint --fix .
```

---

## 폴더 구조

```
k-food-project/
├─ src/
│  ├─ app/                         # 주소(URL) = 폴더 이름
│  │  ├─ layout.tsx                # 모든 화면의 공통 틀 (제목, 언어, 글꼴 설정)
│  │  ├─ globals.css               # 디자인 토큰 (색·글꼴) — 여기에만 정의
│  │  ├─ page.tsx                  # /                      1. 랜딩
│  │  ├─ home/                     # /home                  1. 메인 카드
│  │  ├─ posts/[id]/               # /posts/1               2·3. 상세 + 투표
│  │  │  ├─ comments/              # /posts/1/comments      4. 댓글
│  │  │  └─ edit/                  # /posts/1/edit          5. 수정
│  │  ├─ write/                    # /write                 6. 콘텐츠 작성
│  │  └─ my/                       # /my                    7. 마이 (나중)
│  ├─ components/                  # 두 사람이 같이 쓰는 부품 (버튼, 시트 등)
│  └─ lib/posts.ts                 # 게시글 데이터 모양 + 목업 데이터
├─ public/                         # 이미지 등 그대로 올릴 파일
├─ AGENTS.md                       # 팀 규칙 (Claude Code가 자동으로 읽음)
├─ package.json                    # 라이브러리 목록과 명령어 모음
├─ package-lock.json               # 정확한 버전 기록 (직접 수정하지 마세요)
└─ .nvmrc                          # 사용할 Node.js 버전
```

**내 파트를 만들려면** 해당 주소 폴더의 `page.tsx`를 여세요. 지금은 "준비 중" 자리(`Placeholder`)가 들어 있으니, 그걸 실제 화면으로 바꾸면 됩니다.
저장하면 브라우저가 알아서 새로고침됩니다.

---

## 함께 작업하는 방법

1. 작업 전에 최신 내용을 받아옵니다.
   ```bash
   git switch main
   git pull
   ```
2. 내 작업용 브랜치를 만듭니다. (이름은 `feat/무엇을-할지`)
   ```bash
   git switch -c feat/main-screen
   ```
3. 작업하고 검사(위 3단계)를 통과시킨 뒤 저장합니다.
   ```bash
   git add .
   git commit -m "메인 화면 문구 수정"
   git push -u origin feat/main-screen
   ```
4. GitHub에서 **Pull Request** 를 만들고, 상대방이 확인한 뒤 합칩니다.

> `main` 브랜치에서 직접 작업하지 마세요. 두 사람이 같은 파일을 동시에 고치면 충돌이 납니다.

---

## 주의사항

- **비밀번호, API 키는 코드에 직접 쓰지 마세요.** 나중에 필요해지면 `.env.local` 파일에 넣습니다. 이 파일은 GitHub에 올라가지 않도록 이미 설정되어 있습니다.
- `node_modules/` 폴더와 `.next/` 폴더는 GitHub에 올라가지 않습니다. 정상입니다.
