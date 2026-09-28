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
  AI_DRAFTS,
  getQuestion,
  MAX_PHOTOS,
  QUESTIONS,
  SAMPLE_PHOTOS,
  type Photo,
  type QuestionId,
} from "./data";

/*
  업로드 → 작성 → 게시 → 수정/삭제 흐름의 화면 간 상태입니다.
  아직 서버가 없어서 메모리에만 저장합니다 (새로고침하면 초기화).
*/

export type DraftStep = "photos" | "question" | "review";

export type PostContent = {
  photos: Photo[];
  coverId: string | null;
  questionId: QuestionId;
  title: string;
  story: string;
  voteQuestion: string;
};

export type Draft = PostContent & {
  savedStep: DraftStep | null; // 임시 저장된 경우 이어서 볼 단계
  savedAt: number | null;
};

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
  title: "",
  story: "",
  voteQuestion: "",
  savedStep: null,
  savedAt: null,
});

// 직접 URL로 들어왔을 때도 화면이 비지 않도록 쓰는 기본 게시글
export const SAMPLE_MY_POST: MyPost = {
  photos: SAMPLE_PHOTOS,
  coverId: SAMPLE_PHOTOS[0].id,
  questionId: "eat",
  title: AI_DRAFTS[0].title,
  story: AI_DRAFTS[0].story,
  voteQuestion: getQuestion("eat").voteQuestion,
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
  applyAiDraft: (variant?: number) => void;
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
          draft: { ...base, photos, coverId: base.coverId ?? photos[0]?.id ?? null },
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

  const applyAiDraft = useCallback((variant = 0) => {
    setState((s) => {
      const copy = AI_DRAFTS[variant % AI_DRAFTS.length];
      return {
        ...s,
        draft: {
          ...s.draft,
          title: copy.title,
          story: copy.story,
          voteQuestion: getQuestion(s.draft.questionId).voteQuestion,
        },
      };
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
          title: d.title || AI_DRAFTS[0].title,
          story: d.story || AI_DRAFTS[0].story,
          voteQuestion: d.voteQuestion || getQuestion(d.questionId).voteQuestion,
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
  return post.photos.find((p) => p.id === post.coverId) ?? post.photos[0];
}
