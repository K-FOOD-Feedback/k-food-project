"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowCta, IconButton } from "@/components/Buttons";
import { TextField } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Chip, Screen, StepProgress, StickyBottom, Tile, TopBar } from "@/components/Layout";
import { getQuestion, VOTE_TITLE_MAX, voteBasisOf } from "@/lib/write-data";
import { useFlow } from "@/lib/write-store";
import { OptionsEditor } from "../OptionsEditor";

const MAKING_MS = 1400;

/*
  ④ Your vote
  - AI가 사진 + 주제 + 제목·본문을 보고 투표 제목과 선택지를 만듦
  - 투표 제목·선택지 모두 고칠 수 있음 (선택지 2~4개)
  - ③에서 글을 고치고 오면 "선택지도 다시 맞출까요?" 안내 (자동으로 덮어쓰지 않음)
*/
export function VoteStepScreen() {
  const router = useRouter();
  const { draft, updateDraft, makeVote, saveDraftForLater, publish } = useFlow();
  const question = getQuestion(draft.questionId);
  const [making, setMaking] = useState(draft.options.length === 0);
  const [variant, setVariant] = useState(0);
  const [posting, setPosting] = useState(false);

  // making이 켜지면 잠시 "만드는 중"을 보여 준 뒤 투표를 채움 (처음 진입 · Remake · Update 공통)
  useEffect(() => {
    if (!making) return;
    const t = window.setTimeout(() => {
      makeVote(variant);
      setMaking(false);
    }, MAKING_MS);
    return () => window.clearTimeout(t);
  }, [making, variant, makeVote]);

  const remake = (nextVariant: number) => {
    setVariant(nextVariant);
    setMaking(true);
  };

  const stale = !making && draft.options.length > 0 && draft.voteBasis !== "" && voteBasisOf(draft) !== draft.voteBasis;
  const filled = draft.options.filter((o) => o.trim());
  const canPost = !making && draft.voteQuestion.trim().length > 0 && filled.length >= 2;

  return (
    <Screen className="pb-[140px]">
      <TopBar
        left={
          <IconButton
            icon="chevron-left"
            label="Back"
            onClick={() => {
              saveDraftForLater("vote");
              router.push("/write/post");
            }}
          />
        }
        title="Your vote"
      />
      <StepProgress step={4} />

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
                onClick={() => remake(variant)}
                className="h-9 shrink-0 rounded-full bg-on-dark px-4 text-[13px] font-bold text-on-light transition active:scale-95"
              >
                Update
              </button>
            </div>
          </Tile>
        )}

        <Tile>
          <div className="flex items-center gap-1.5 px-5 pt-5 pb-2">
            <h2 className="text-[18px] font-bold leading-[1.3]">Vote</h2>
            <span title="Koreans vote on this. You'll see the results as they come in.">
              <Icon name="info" size={18} />
            </span>
          </div>
          <div className="flex items-center gap-2 px-5 pb-1">
            <Chip tone="soft">
              <Icon name={question.icon} size={14} />
              {question.label}
            </Chip>
            <Link
              href="/write/question"
              aria-label="Change topic"
              className="-m-2 flex size-8 items-center justify-center transition active:scale-90"
            >
              <Icon name="pencil" size={16} />
            </Link>
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
              />
              <div className="flex flex-col gap-2 px-5 pt-3 pb-5">
                <div className="flex items-center">
                  <p className="flex-1 text-[13px] font-semibold leading-[1.3]">Choices Koreans can pick</p>
                  <button
                    type="button"
                    onClick={() => remake(variant + 1)}
                    className="flex items-center gap-1 text-[13px] font-semibold leading-[1.3] transition active:scale-95"
                  >
                    <Icon name="refresh" size={14} />
                    Remake
                  </button>
                </div>
                <OptionsEditor options={draft.options} onChange={(options) => updateDraft({ options })} />
              </div>
            </div>
          )}
          <p className="flex items-center gap-1.5 px-5 pb-5 text-[13px] font-medium leading-[1.3] text-muted">
            <Icon name="globe" size={14} />
            Koreans will see the vote in Korean.
          </p>
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
