import { Fragment } from "react";

/*
  중국어·일본어 제목 줄바꿈 — 띄어쓰기가 없어 글자 아무 데서나 끊기면 "레/시피"처럼 단어가 갈라짐.
  Intl.Segmenter로 단어를 나눈 뒤 말덩이로 묶고, 말덩이 사이에서만 줄을 바꿈 (그 자리에 <wbr>, 글 자체는 keep-all).
  묶는 규칙:
  - 문장부호(、？，)는 앞말에 붙임 → 줄 맨 앞에 문장부호가 오지 않음
  - 한 글자 조각은 앞말에 붙임 (火鸡|面 → 火鸡面, 芝|士 → 芝士) — 맨 앞이거나 문장부호 바로 뒤면 뒷말에 붙임
  - 일본어 히라가나 조각(조사·어미: が, の, たい)은 앞말에 붙임 → "私が", "作った"
  - 가타카나 조각이 이어지면 하나로 (ブル|ダ|ッ|ク → ブルダック) — 단 앞 조각이 3글자 이상(사전에 있는 단어: ソーセージ, カルボ)이면
    거기서는 나눌 수 있게 둠 → "ソーセージ|ブルダック" (긴 가타카나 덩이가 칸을 넘어 글자 중간에서 끊기지 않게)
  말덩이 하나가 칸보다 길면 그때는 쓰는 쪽의 overflow-wrap:anywhere 로 글자 사이에서 끊김
*/
const HIRAGANA = /^[\p{Script=Hiragana}ー]+$/u;
const KATAKANA = /^[\p{Script=Katakana}ー]+$/u;
const ENDS_KATAKANA = /[\p{Script=Katakana}ー]$/u;

export function cjkPhrases(text: string, lang: "zh" | "zht" | "ja"): string[] {
  if (typeof Intl === "undefined" || !("Segmenter" in Intl)) return [text];
  const out: string[] = [];
  let forward = false; // 바로 앞 조각이 뒷말에 붙어야 함
  let prevPunct = false;
  let prevLen = 0; // 바로 앞 조각(묶기 전)의 글자 수
  for (const { segment, isWordLike } of new Intl.Segmenter(lang === "zht" ? "zh-Hant" : lang, { granularity: "word" }).segment(text)) {
    const single = [...segment].length === 1;
    const last = out[out.length - 1];
    const glue: boolean =
      last !== undefined &&
      (!isWordLike ||
        forward ||
        (!prevPunct &&
          (single ||
            (lang === "ja" && HIRAGANA.test(segment)) ||
            (KATAKANA.test(segment) && ENDS_KATAKANA.test(last) && prevLen < 3))));
    if (glue) out[out.length - 1] = last + segment;
    else out.push(segment);
    forward = !!isWordLike && single && (out.length === 1 || prevPunct) && !glue;
    prevPunct = !isWordLike;
    prevLen = [...segment].length;
  }
  return out;
}

/** 말덩이 사이에만 줄바꿈 자리를 둔 글 (부모에 break-keep을 함께 씀) */
export function PhraseText({ phrases }: { phrases: string[] }) {
  return phrases.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {p}
    </Fragment>
  ));
}

/**
  두 줄로 고르게 나눌 때의 폭 — 말덩이 경계 중 두 줄 길이가 가장 비슷해지는 자리를 골라, 긴 쪽 줄이 겨우 들어가는 폭.
  (중·일 글자는 거의 정사각형이라 글자 수 × 1em으로 셈, 자간 -0.69px 반영 + 여유 0.6em)
  4글자 이하로 짧거나 말덩이가 하나뿐이면 나누지 않음
*/
export function twoLineWidth(phrases: string[]): string | undefined {
  const lens = phrases.map((p) => [...p].length);
  const total = lens.reduce((a, b) => a + b, 0);
  if (total <= 4 || phrases.length < 2) return undefined;
  let best = total;
  let head = 0;
  for (const n of lens.slice(0, -1)) {
    head += n;
    best = Math.min(best, Math.max(head, total - head));
  }
  return `min(100%, calc(${best} * (1em - 0.69px) + 0.6em))`;
}
