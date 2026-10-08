# UX 라이팅 가이드 (초안 — 송희·지현 확정 전)

> 확정되면 화면 문구는 이 문서를 따릅니다. 바꾸고 싶은 건 여기부터 고치고 화면에 반영해요.

## 1. 누구에게 말하나

| | 외국인 (영어) | 한국인 (한국어) |
|---|---|---|
| 하는 일 | 내 한식 사진을 올리고 한국인 의견을 받음 | 외국인의 한식에 투표하고 한마디 남김 |
| 말투 | 응원하는 친구. 쉽고 짧은 영어 | 오지랖 넓은 친구. 장난스럽지만 무례하지 않게, 해요체 |
| 주의 | **영어가 모국어가 아닌 사람도 많음** → 관용어 금지 | 평가가 상처가 되지 않게 (비웃는 말투 X) |

## 2. 원칙

1. **쉬운 영어** — 관용어·속어 대신 그대로 읽히는 말.
   `nailed it`, `two cents`, `real deal`, `weigh in`, `cooking up` → 쓰지 않기.
2. **심판이 아니라 의견** — `judge`, `verdict` 대신 `vote`, `see what Koreans think`, `results`.
3. **버튼은 동사로, 결과가 보이게** — `OK`·`Done` 대신 `Post`, `Share`, `Save changes`.
4. **안내는 "왜 + 어떻게"** — 막을 때는 이유와 다음 행동을 같이.
   예) `To keep votes fair, you can't change the question.`
5. **진행 중은 `…`로 끝내기** — `Posting…`, `Writing your post…`
6. **대소문자** — 영어는 문장형(Sentence case). 첫 글자만 대문자.
7. **숫자는 숫자로** — `3 new votes`, `댓글 3개`.
8. **재미는 연출에서, 설명은 담백하게** — 스티커·도장·말풍선은 장난스러워도 되지만, 버튼·안내문은 바로 이해돼야 함.

## 3. 용어 (하나로 통일)

| 개념 | 영어 | 한국어 | 지금 섞여 있는 말 |
|---|---|---|---|
| 올린 글 | post | 글 | — |
| 글쓴이가 묻는 것 | **question** | **질문** | topic, question type |
| 한국인이 고르는 것 | vote / choice | 투표 / 선택지 | option |
| 남기는 말 | comment | **한마디** (버튼) · 댓글 (목록) | — |
| 글쓴이가 다는 답 | reply | 답글 | 리댓 |
| 모인 투표 | results | 결과 | verdict |
| 대표 사진 | cover photo | 대표 사진 | cover |

## 4. 지금 문구 점검 (제안)

### 랜딩
| 지금 | 문제 | 제안 |
|---|---|---|
| See what Koreans think. | 뭘 하는 곳인지 안 보임 | **Made K-food? Ask real Koreans.** |
| How will you join? | 선택 이유가 안 보임 | 역할 카드 안에 "이걸 할 수 있어요"를 같이 (아래 5번) |
| Already joined? Log in | OK | 그대로 |

### 외국인 · 로그인 / 작성
| 지금 | 문제 | 제안 |
|---|---|---|
| One quick step and Koreans can start judging your dish. | judge = 심판 | **Log in to post your dish and see what Koreans think.** |
| Pick a question / Change topic / Question type | 용어 3개 | 모두 **question** |
| Cooking up your post… | 관용어 | **Writing your post…** |
| Write with AI | OK | 그대로 |
| Make the vote | 어색 | **Next: make the vote** 또는 **Make a vote** |
| Choices Koreans can pick | OK | 그대로 |

### 외국인 · 완료 / 공유
| 지금 | 문제 | 제안 |
|---|---|---|
| You're live! | 관용 표현 | **Your post is up!** |
| Koreans are on their way. We'll let you know when the first votes come in. | OK | **We'll let you know when Koreans start voting.** |
| Get your friends to judge it | judge | **Ask friends to vote** |
| Know any Koreans? The more votes, the sooner your verdict. | verdict, 관용 | **Have Korean friends? More votes = clearer results.** |
| Koreans, vote! 🇰🇷 (스티커) | OK | 그대로 |

### 한국인 · 상세 / 투표 (지현 님 화면 — 같이 확인)
| 지금 | 문제 | 제안 |
|---|---|---|
| 나의 생각을 투표해주세요! | 번역투 | **어떻게 생각하세요?** (또는 글쓴이의 질문을 그대로) |
| 투표 완료! | OK | 그대로 |
| N명 중 46%가 같은 생각이에요 | 좋음 | 그대로 |
| 떠오른 한마디를 남겨보세요 | 좋음 | 그대로 |
| 다시 투표하기 | OK | 그대로 |

### 알림
- 외국인: `민지 voted` / `3 new votes` / `10 Koreans have voted 🎉`
- 한국인: `내 댓글에 답글이 달렸어요` / `글쓴이 Sam 🇨🇦님의 답글` / `투표 결과가 나왔어요`

## 5. 랜딩 메시지 구조 (제안)

3초 안에 답해야 하는 것: **무슨 곳? → 나는 뭘 할 수 있지? → 어디를 누르지?**

```
Made K-food?
Ask real Koreans.                       ← 무슨 곳 (한 줄)
한국인이라면, 세계의 한식에 한마디.        ← 한국인에게 한 줄

┌ I'm not Korean ───────────────┐      ← 역할 = 할 수 있는 일 + 버튼
│ 📸 Post a photo of your dish   │
│ 🗳 Koreans vote on your question│
│ 💬 Get comments and tips        │
│ [ 실제 피드 카드 미리보기 ]        │
│            Start posting →     │
└───────────────────────────────┘
┌ 한국인이에요 ───────────────────┐
│ 🍜 외국인이 만든 한식 구경         │
│ 🇰🇷 투표하고 한마디 남기기          │
│ [ 실제 투표 칸 미리보기 ]          │
│            구경하러 가기 →        │
└───────────────────────────────┘
        Already joined? Log in
```
