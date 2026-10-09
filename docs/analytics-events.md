# Mixpanel 이벤트 목록 (임시 · 출시 전 확정)

- 담당: Mixpanel **송희** · Supabase/GA4 **지현**
- 코드: `src/lib/analytics.ts` 의 `track("이벤트", { 속성 })` — 이름은 `EventName` 목록에서만
- 토큰 없으면 아무것도 안 보내고, 개발 중엔 브라우저 콘솔에 `[analytics]` 로 찍힘
- 개인정보(이메일·이름)·글 내용은 보내지 않음 (글자 수·개수만)
- **출시 후엔 이름을 바꾸지 않습니다** (바꾸면 Mixpanel에 따로 쌓여서 이전 데이터와 끊김)

## 자동으로 붙는 것
| 이름 | 언제 | 설명 |
|---|---|---|
| `$mp_web_page_view` | 페이지 이동마다 | Mixpanel 자동 기록 |
| `user_type` (super property) | 랜딩에서 역할 고른 뒤 모든 이벤트 | `korean` / `foreigner` |

## 공통 · 진입 · 로그인
| 이벤트 | 어디서 | 속성 |
|---|---|---|
| `landing_viewed` | 랜딩 | |
| `role_selected` | 랜딩 마지막 "당신은 누구인가요?"에서 칸 고름 | `role`(korean/foreigner), `method`(drag/tap) |
| `landing_login_clicked` | 랜딩 Already joined? Log in | |
| `landing_scrolled` | 랜딩 스크롤 이야기 단계 도달 | `step`(1~4) |
| `language_clicked` | 🌐 (메인·상세) | `from`, `viewer` |
| `my_page_clicked` | 👤 (메인) | `from`, `viewer` |
| `login_sheet_opened` | 로그인 시트 열림 | `from` |
| `login_completed` | Continue with Google | `from`, `method` |
| `login_cancelled` | 시트 닫음 | `from`, `stage` |

## 메인 (지현)
| 이벤트 | 어디서 | 속성 |
|---|---|---|
| `feed_viewed` | 메인 진입 | `viewer`, `posts` |
| `card_swiped` | 카드 넘김 | `direction`(next/prev), `post_id`, `position`, `viewer` |
| `post_opened` | 카드 탭 / 하단 CTA / 상세 맨 아래 "다음 훈수 거리" | `post_id`, `from`(card/cta/next), `viewer`, `position`, `already_voted` · next일 때는 `post_id`(다음 글), `from_post_id`(보던 글)만 |
| `feed_cta_clicked` | 투표하러 가기 / 투표 결과 보기 | `post_id`, `voted` |
| `share_clicked` | Share your K-food | `logged_in` |

## 상세 · 투표 · 댓글 (지현)
| 이벤트 | 어디서 | 속성 |
|---|---|---|
| `photo_swiped` | 상세 사진 넘김 (처음 보는 사진만) | `post_id`, `index`, `total` |
| `vote_cta_clicked` | 플로팅 투표하기 / 한마디 잠금 레이어의 투표하기 | `post_id` |
| `vote_section_viewed` | 투표 카드가 보임 (스크롤, 투표하기 버튼, `#vote` 주소로 열림) | `post_id`, `via`(scroll/cta) |
| `vote_cast` | 첫 투표 | `post_id`, `choice`, `options_count`, `method`(drag/tap), `seconds_to_vote`, `total_votes_before` |
| `vote_changed` | 투표한 뒤 다른 칸을 눌러 선택을 바꿈 | 위와 같음 + `previous`(바꾸기 전 선택) |
| `vote_drag_missed` | 토큰을 칸 밖에 놓음 | `post_id` |
| `comment_section_viewed` | 댓글 영역이 보임 | `post_id`, `voted` |
| `comment_sent` | 한마디 / 이모지 | `post_id`, `type`(text/emoji), `length`, `emoji`, `lines`, `screen` |
| `comments_opened` | 댓글 전체 보기 | `post_id`, `comment_count` |
| `old_comments_scrolled` | 전체 화면에서 스크롤 | `post_id` |
| `post_closed` | 상세를 떠날 때 | `post_id`, `seconds`, `voted`, `saw_vote`, `saw_comments` |
| `post_more_clicked` | 상세 ⋯ 메뉴 열림 | `post_id` |
| `post_reported` | 상세 ⋯ → 신고하기 → 이유 고르고 신고 | `post_id`, `reason`(0~3) |

## 외국인 글쓰기 (송희)
| 이벤트 | 어디서 | 속성 |
|---|---|---|
| `photos_added` | 사진 추가 | `count`, `total`, `from`(share/photos/post) |
| `photo_removed` · `cover_changed` · `photos_reordered` | 사진 조작 | `from` 등 |
| `photo_limit_hit` | 10장 초과 | `from` |
| `photos_completed` | ① Next | `count` |
| `draft_saved` | 중간에 나감 | `step` |
| `write_exit_opened` | 작성 중 오른쪽 위 × (나가기 시트) | `step` |
| `draft_discarded` | 나가기 시트 → Delete and leave | `step`, `from` |
| `topic_changed` | 질문+투표 화면에서 질문 휠 바꿈 | `from_topic`, `to_topic`, `method`(drag/scroll/tap/keyboard), `ai_rank`(AI 추천 순위, 0=1순위) |
| `topic_selected` | ② Write with AI | `topic`, `is_ai_top_pick`, `changes` |
| `topic_reselected` | 투표에서 주제만 바꾸고 복귀 | `from_topic`, `to_topic`, `changed` |
| `ai_draft_completed` / `ai_draft_stopped` | AI 작성 화면 | `duration_ms`, `topic` / `step_done` |
| `dish_correction_opened` / `dish_corrected` | ③ Not right? / Rewrite | `ai_dish`, `user_dish` |
| `post_step_completed` | ③ Make the vote | `dish_corrected`, `title_kept`, `story_kept`, 길이, `photos` |
| `vote_generated` | ④ 투표 만들어짐 | `reason`(first/remake/update), `variant`, `topic` |
| `vote_remade` | ④ Remake | `attempt` |
| `vote_update_prompt_shown` / `vote_update_accepted` | ④ "글이 바뀌었어요" | |
| `vote_title_edited` | 투표 제목 고침 (입력칸 나갈 때) | `length`, `source` |
| `vote_option_edited` · `vote_option_added` · `vote_option_removed` | 선택지 | `position`, `options_count`, `source`(write/edit) |
| `topic_change_clicked` | ④ 주제 연필 | `topic` |
| `post_published` | ④ Post | `topic`, `photos`, `options_count`, `options_edited`, `vote_title_kept`, `title_kept`, `story_kept`, `dish_corrected`, `time_to_publish_sec` |
| `posted_card_tapped` | 완료 카드 탭 | `taps`, `tilted` |
| `posted_next_action` | 완료 화면 버튼 | `action`(share/home/my_post/close) |
| `share_sheet_opened` | 공유 시트 열림 | `from`(posted/my_post) |
| `post_shared` | 공유 채널 누름 | `channel`(copy_link/sms/whatsapp/x/native), `from` |

`*_kept` 는 AI가 쓴 글을 얼마나 그대로 썼는지 (0~1, 단어 기준).

## 내 글 관리 (송희)
| 이벤트 | 어디서 | 속성 |
|---|---|---|
| `my_post_viewed` | 내 글 | `votes`, `comments`, `views` |
| `post_menu_opened` | ⋯ | `votes`, `comments` |
| `post_edit_started` | Edit post | `locked` |
| `post_delete_sheet_opened` · `post_delete_cancelled` · `post_deleted` | 삭제 | `votes`, `comments` |
| `locked_item_tapped` | 수정에서 잠긴 투표를 누름 (투표는 올린 뒤 못 바꿈) | `item`(topic), `votes` |
| `post_edit_discarded` | X로 나감 | `had_changes`, `locked` |
| `post_edit_saved` | Save changes | 바뀐 항목들(`*_changed`), `locked`, `votes` |

## 인앱 알림 (송희)
| 이벤트 | 어디서 | 속성 |
|---|---|---|
| `notifications_clicked` | 외국인 메인 🔔 | `from` |
| `notifications_viewed` | 알림함 열림 (열면 다 읽은 것) | `count`, `viewer` |
| `notification_clicked` | 알림 누름 | `type`, `viewer` |

투표 로그인: `login_sheet_opened` / `login_cancelled` / `login_completed` 에 `from: "vote"` (한국인이 로그인 없이 투표하려 할 때).

## 아직 없음 (기능 생기면 추가)
푸시 알림 허용(`notify_prompt_shown`, `notify_enabled`), 임시 저장 이어 쓰기(`draft_resumed`), 로그인 후 사용자 연결(`identify` — Supabase 사용자 ID).
