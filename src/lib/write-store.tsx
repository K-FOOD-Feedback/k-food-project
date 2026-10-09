"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AI_DISH,
  aiPostFor,
  aiVoteFor,
  MAX_PHOTOS,
  MY_POST_ID,
  QUESTIONS,
  SAMPLE_PHOTOS,
  type Photo,
  type QuestionId,
  voteBasisOf,
} from "./write-data";

/*
  업로드 → 작성 → 게시 → 수정/삭제 흐름의 화면 간 상태입니다.
  아직 서버가 없어서 메모리에만 저장합니다 (새로고침하면 초기화).
*/

export type DraftStep = "photos" | "question" | "post" | "vote";

export type PostContent = {
  photos: Photo[];
  coverId: string | null;
  questionId: QuestionId;
  dish: string; // AI가 알아본 음식 이름 (사용자가 고칠 수 있음)
  title: string;
  story: string;
  voteQuestion: string; // 투표 제목 — 상세 화면 투표 카드 맨 위에 보임
  options: string[]; // 투표 선택지 2~4개 (AI가 만들고 사용자가 고침)
  voteBasis: string; // 투표를 만들 때 쓴 재료(주제·음식·제목·본문). 바뀌면 "다시 맞출까요?"
};

export type Draft = PostContent & {
  savedStep: DraftStep | null; // 임시 저장된 경우 이어서 볼 단계
  savedAt: number | null;
  // ── 분석용 (Mixpanel): 시작 시각, AI가 처음 쓴 원본 (사용자가 얼마나 고쳤는지 비교)
  startedAt: number | null;
  ai: { dish: string; title: string; story: string; voteQuestion: string; options: string[] };
};

export { MY_POST_ID };

export type MyPost = PostContent & {
  votes: number;
  comments: number;
  views: number;
};

type FlowState = {
  loggedIn: boolean;
  draft: Draft;
  myPost: MyPost | null;
};

const emptyDraft = (): Draft => ({
  photos: [],
  coverId: null,
  questionId: QUESTIONS[0].id,
  dish: "",
  title: "",
  story: "",
  voteQuestion: "",
  options: [],
  voteBasis: "",
  savedStep: null,
  savedAt: null,
  startedAt: null,
  ai: { dish: "", title: "", story: "", voteQuestion: "", options: [] },
});

// 직접 URL로 들어왔을 때도 화면이 비지 않도록 쓰는 기본 게시글
export const SAMPLE_MY_POST: MyPost = {
  photos: SAMPLE_PHOTOS,
  coverId: SAMPLE_PHOTOS[0].id,
  questionId: "line",
  dish: AI_DISH,
  ...aiPostFor(AI_DISH),
  ...aiVoteFor("line", AI_DISH, aiPostFor(AI_DISH)),
  voteBasis: "",
  votes: 0,
  comments: 0,
  views: 12,
};

type FlowActions = {
  logIn: () => void;
  addPhotos: (
    files: FileList | File[],
    opts?: { fresh?: boolean },
  ) => { added: number; overflow: boolean };
  removePhoto: (id: string) => void;
  setCover: (id: string) => void;
  movePhoto: (from: number, to: number) => void;
  updateDraft: (patch: Partial<PostContent>) => void;
  /** ①② 음식 인식 + 제목·본문 (dish를 주면 그 이름으로 다시 씀) */
  applyAiDraft: (opts?: { variant?: number; dish?: string }) => void;
  /** ③ 투표 제목 + 선택지 (지금 주제·음식·제목·본문 기준) */
  makeVote: (variant?: number) => void;
  saveDraftForLater: (step: DraftStep) => void;
  discardDraft: () => void;
  publish: () => void;
  updateMyPost: (patch: Partial<MyPost>) => void;
  deleteMyPost: () => void;
};

const FlowContext = createContext<(FlowState & FlowActions) | null>(null);

let photoSeq = 0;

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>({
    loggedIn: false,
    draft: emptyDraft(),
    myPost: null,
  });

  const logIn = useCallback(() => {
    setState((s) => ({ ...s, loggedIn: true }));
  }, []);

  const photoCount = state.draft.photos.length;
  const addPhotos = useCallback(
    (input: FileList | File[], opts?: { fresh?: boolean }) => {
      // fresh = 홈에서 새로 시작 (이전 초안은 버림)
      const fresh = opts?.fresh ?? false;
      const files = Array.from(input).filter((f) => f.type.startsWith("image/"));
      const room = Math.max(0, MAX_PHOTOS - (fresh ? 0 : photoCount));
      const accepted = files.slice(0, room).map<Photo>((file) => ({
        id: `photo-${Date.now()}-${photoSeq++}`,
        src: URL.createObjectURL(file),
      }));
      setState((s) => {
        const base = fresh ? emptyDraft() : s.draft;
        const photos = [...base.photos, ...accepted];
        return {
          ...s,
          draft: {
            ...base,
            photos,
            coverId: base.coverId ?? photos[0]?.id ?? null,
            startedAt: base.startedAt ?? Date.now(),
          },
        };
      });
      return { added: accepted.length, overflow: files.length > room };
    },
    [photoCount],
  );

  const removePhoto = useCallback((id: string) => {
    setState((s) => {
      const photos = s.draft.photos.filter((p) => p.id !== id);
      const coverId = s.draft.coverId === id ? (photos[0]?.id ?? null) : s.draft.coverId;
      return { ...s, draft: { ...s.draft, photos, coverId } };
    });
  }, []);

  const setCover = useCallback((id: string) => {
    setState((s) => ({ ...s, draft: { ...s.draft, coverId: id } }));
  }, []);

  const movePhoto = useCallback((from: number, to: number) => {
    setState((s) => {
      const photos = [...s.draft.photos];
      const [moved] = photos.splice(from, 1);
      photos.splice(to, 0, moved);
      return { ...s, draft: { ...s.draft, photos } };
    });
  }, []);

  const updateDraft = useCallback((patch: Partial<PostContent>) => {
    setState((s) => ({ ...s, draft: { ...s.draft, ...patch } }));
  }, []);

  const applyAiDraft = useCallback((opts?: { variant?: number; dish?: string }) => {
    setState((s) => {
      const dish = opts?.dish ?? (s.draft.dish || AI_DISH);
      const post = aiPostFor(dish, opts?.variant ?? 0);
      // ai.dish는 AI가 처음 알아본 이름 그대로 둠 (사용자가 고쳤는지 비교용)
      const ai = { ...s.draft.ai, dish: s.draft.ai.dish || AI_DISH, ...post };
      return { ...s, draft: { ...s.draft, dish, ...post, ai } };
    });
  }, []);

  const makeVote = useCallback((variant = 0) => {
    setState((s) => {
      const d = s.draft;
      const dish = d.dish || AI_DISH;
      const vote = aiVoteFor(d.questionId, dish, d, variant);
      const ai = { ...d.ai, voteQuestion: vote.voteQuestion, options: vote.options };
      return { ...s, draft: { ...d, ...vote, ai, voteBasis: voteBasisOf({ ...d, dish }) } };
    });
  }, []);

  const saveDraftForLater = useCallback((step: DraftStep) => {
    setState((s) =>
      s.draft.photos.length === 0
        ? s
        : { ...s, draft: { ...s.draft, savedStep: step, savedAt: Date.now() } },
    );
  }, []);

  const discardDraft = useCallback(() => {
    setState((s) => ({ ...s, draft: emptyDraft() }));
  }, []);

  const publish = useCallback(() => {
    setState((s) => {
      const d = s.draft;
      const photos = d.photos.length ? d.photos : SAMPLE_PHOTOS;
      return {
        ...s,
        myPost: {
          photos,
          coverId: d.coverId ?? photos[0].id,
          questionId: d.questionId,
          dish: d.dish || AI_DISH,
          title: d.title || SAMPLE_MY_POST.title,
          story: d.story || SAMPLE_MY_POST.story,
          voteQuestion: d.voteQuestion || SAMPLE_MY_POST.voteQuestion,
          options: d.options.filter((o) => o.trim()).length >= 2 ? d.options.filter((o) => o.trim()) : SAMPLE_MY_POST.options,
          voteBasis: d.voteBasis,
          votes: 0,
          comments: 0,
          views: 0,
        },
        draft: emptyDraft(),
      };
    });
  }, []);

  const updateMyPost = useCallback((patch: Partial<MyPost>) => {
    setState((s) => ({ ...s, myPost: { ...(s.myPost ?? SAMPLE_MY_POST), ...patch } }));
  }, []);

  const deleteMyPost = useCallback(() => {
    setState((s) => ({ ...s, myPost: null }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      logIn,
      addPhotos,
      removePhoto,
      setCover,
      movePhoto,
      updateDraft,
      applyAiDraft,
      makeVote,
      saveDraftForLater,
      discardDraft,
      publish,
      updateMyPost,
      deleteMyPost,
    }),
    [
      state,
      logIn,
      addPhotos,
      removePhoto,
      setCover,
      movePhoto,
      updateDraft,
      applyAiDraft,
      makeVote,
      saveDraftForLater,
      discardDraft,
      publish,
      updateMyPost,
      deleteMyPost,
    ],
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be used inside <FlowProvider>");
  return ctx;
}

export function coverOf(post: Pick<PostContent, "photos" | "coverId">) {
  // 맨 앞 사진이 대표 (순서를 바꿔 맨 앞으로 옮기면 그게 대표)
  return post.photos[0];
}
