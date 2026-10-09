"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Screen, StepProgress, StickyBottom, Tile, TopBar } from "@/components/Layout";
import { getQuestion, rankQuestions, VOTE_TITLE_MAX, voteBasisOf, type QuestionId } from "@/lib/write-data";
import { keptRatio, track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { OptionsEditor } from "../OptionsEditor";
import { WriteExit } from "../WriteExit";

const MAKING_MS = 1400;

/*
  ③ 질문 + 투표 (마지막 단계)
  - 위: 한국인에게 물어볼 질문 고르기 — AI가 글을 보고 순서를 매기고 1순위를 미리 골라 둠
  - 질문을 바꾸면 아래 투표가 그 질문에 맞게 바로 다시 만들어짐
  - AI가 사진 + 질문 + 제목·본문을 보고 투표 제목과 선택지를 만듦
  - 투표 제목·선택지 모두 고칠 수 있음 (선택지 2~4개)
  - ③에서 글을 고치고 오면 "선택지도 다시 맞출까요?" 안내 (자동으로 덮어쓰지 않음)
*/
export function VoteStepScreen() {
  const router = useRouter();
  const { draft, updateDraft, makeVote, saveDraftForLater, publish } = useFlow();
  const question = getQuestion(draft.questionId);
  // 처음 들어오면(아직 투표 없음) AI 추천 1순위 질문을 골라 둠
  const ranked = useMemo(() => rankQuestions(draft), [draft]);
  const [making, setMaking] = useState(draft.options.length === 0);
  const picked = useRef(draft.options.length > 0);
  useEffect(() => {
    if (picked.current) return;
    picked.current = true;
    updateDraft({ questionId: ranked[0] });
  }, [ranked, updateDraft]);
  const [variant, setVariant] = useState(0);
  const [posting, setPosting] = useState(false);

  // 분석용: 왜 투표를 (다시) 만들었는지
  const reason = useRef<"first" | "remake" | "update" | "question">("first");

  // making이 켜지면 잠시 "만드는 중"을 보여 준 뒤 투표를 채움 (처음 진입 · Remake · Update 공통)
  useEffect(() => {
    if (!making) return;
    const t = window.setTimeout(() => {
      makeVote(variant);
      setMaking(false);
      track("vote_generated", { reason: reason.current, variant, topic: draft.questionId });
    }, MAKING_MS);
    return () => window.clearTimeout(t);
  }, [making, variant, makeVote, draft.questionId]);

  const chooseQuestion = (id: QuestionId) => {
    if (id === draft.questionId || making) return;
    track("topic_changed", { from_topic: draft.questionId, to_topic: id, method: "chip", ai_rank: ranked.indexOf(id) });
    updateDraft({ questionId: id });
    reason.current = "question";
    setVariant(0);
    setMaking(true);
  };

  const remake = (nextVariant: number, why: "remake" | "update") => {
    reason.current = why;
    setVariant(nextVariant);
    setMaking(true);
  };

  const stale = !making && draft.options.length > 0 && draft.voteBasis !== "" && voteBasisOf(draft) !== draft.voteBasis;
  const filled = draft.options.filter((o) => o.trim());
  const canPost = !making && draft.voteQuestion.trim().length > 0 && filled.length >= 2;

  // "글이 바뀌었어요" 안내가 뜰 때마다 한 번 기록
  const staleShown = useRef(false);
  useEffect(() => {
    if (stale && !staleShown.current) track("vote_update_prompt_shown");
    staleShown.current = stale;
  }, [stale]);

  return (
    <Screen className="pb-[140px]">
      <TopBar
        left={
          <IconButton
            icon="chevron-left"
            label="Back"
            onClick={() => {
              saveDraftForLater("vote");
              track("draft_saved", { step: "vote" });
              router.push("/write/post");
            }}
          />
        }
        title="Ask Koreans"
        right={<WriteExit step="vote" />}
      />
      <StepProgress step={3} />

      <div className="stagger flex flex-col gap-1 px-2">
        {stale && (
          <Tile>
            <div className="flex items-center gap-3 px-5 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-content text-on-light">
                <Icon name="refresh" size={18} />
              </span>
              <p className="flex-1 text-[14px] font-semibold leading-[1.4]">
                Your post changed. Update the vote to match?
              </p>
              <button
                type="button"
                onClick={() => {
                  track("vote_update_accepted");
                  remake(variant, "update");
                }}
                className="h-9 shrink-0 rounded-full bg-on-dark px-4 text-[13px] font-bold text-on-light transition active:scale-95"
              >
                Update
              </button>
            </div>
          </Tile>
        )}

        <Tile>
          {/* 한국인에게 물어볼 질문 — 가로로 넘겨 고르기. 맨 앞이 AI 추천 */}
          <div className="flex flex-col gap-2 pt-5 pb-1">
            <p className="px-5 text-[13px] font-semibold leading-[1.3]">What do you want to ask?</p>
            <div
              role="radiogroup"
              aria-label="Question"
              className="flex snap-x gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {ranked.map((id, i) => {
                const q = getQuestion(id);
                const on = id === draft.questionId;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => chooseQuestion(id)}
                    className={`relative flex h-11 shrink-0 snap-start items-center gap-2 rounded-full pl-3.5 pr-4 text-[14px] font-semibold transition active:scale-95 ${
                      on ? "bg-on-dark text-on-light" : "bg-surface-2 text-on-dark"
                    }`}
                  >
                    <Icon name={q.icon} size={16} />
                    {q.label}
                    {i === 0 && (
                      <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${on ? "bg-content text-on-light" : "bg-content/20 text-content"}`}>
                        <Icon name="sparkle" size={10} />
                        AI
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="px-5 text-[13px] leading-[1.4] text-muted">{question.hint}</p>
          </div>

          {making ? (
            <MakingVote />
          ) : (
            <div key={`vote-${variant}-${draft.voteBasis}`} className="animate-fade-in">
              <TextField
                label="Vote title"
                value={draft.voteQuestion}
                maxLength={VOTE_TITLE_MAX}
                rows={2}
                onChange={(voteQuestion) => updateDraft({ voteQuestion })}
                onBlur={(v) => {
                  if (v !== draft.ai.voteQuestion) track("vote_title_edited", { length: v.length, source: "write" });
                }}
              />
              <div className="flex flex-col gap-2 px-5 pt-3 pb-5">
                <div className="flex items-center">
                  <p className="flex-1 text-[13px] font-semibold leading-[1.3]">Choices Koreans can pick</p>
                  <button
                    type="button"
                    onClick={() => {
                      track("vote_remade", { attempt: variant + 1 });
                      remake(variant + 1, "remake");
                    }}
                    className="flex items-center gap-1 text-[13px] font-semibold leading-[1.3] transition active:scale-95"
                  >
                    <Icon name="refresh" size={14} />
                    Remake
                  </button>
                </div>
                <OptionsEditor source="write" options={draft.options} onChange={(options) => updateDraft({ options })} />
              </div>
            </div>
          )}
        </Tile>

        <p className="flex items-center gap-1.5 px-6 pt-3 text-[13px] font-medium leading-[1.3] text-muted">
          <Icon name="info" size={14} />
          You can&apos;t change the vote after people start voting.
        </p>
      </div>

      <StickyBottom>
        <ArrowCta
          caption={posting ? "Translating into Korean…" : "Koreans will see it in Korean"}
          title={posting ? "Posting…" : "Post"}
          disabled={!canPost || posting}
          className={posting ? "animate-pulse" : ""}
          onClick={() => {
            setPosting(true);
            const opts = draft.options.filter((o) => o.trim());
            track("post_published", {
              topic: draft.questionId,
              photos: draft.photos.length,
              options_count: opts.length,
              options_edited: opts.filter((o) => !draft.ai.options.includes(o)).length,
              vote_title_kept: keptRatio(draft.ai.voteQuestion, draft.voteQuestion),
              title_kept: keptRatio(draft.ai.title, draft.title),
              story_kept: keptRatio(draft.ai.story, draft.story),
              dish_corrected: draft.dish !== (draft.ai.dish || draft.dish),
              time_to_publish_sec: draft.startedAt ? Math.round((Date.now() - draft.startedAt) / 1000) : null,
            });
            window.setTimeout(() => {
              publish();
              router.push("/write/done");
            }, 900);
          }}
        />
      </StickyBottom>
    </Screen>
  );
}

/** AI가 투표를 만드는 중 — 선택지 자리가 반짝이며 채워짐 */
function MakingVote() {
  return (
    <div className="flex flex-col gap-3 px-5 pt-4 pb-5" aria-live="polite">
      <p className="flex items-center gap-2 text-[14px] font-semibold">
        <Icon name="sparkle" size={16} className="animate-spin [animation-duration:2s]" />
        Making your vote from your post…
      </p>
      <div className="h-[78px] animate-pulse rounded-[20px] bg-surface-2" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-full bg-surface-2"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
