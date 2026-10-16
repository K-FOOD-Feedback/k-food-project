/*
  글자 수 세기 — 글자마다 무게를 다르게 (X(트위터)처럼) (송희)
  - 영어·숫자·기호 1칸, 한글·한자·가나 WIDE_WEIGHT칸
  - 한도는 "칸"으로: 제목 50칸이면 영어 50자, 한·중·일 25자. 섞어 쓰면 섞인 대로 셈 (송희: 소수점 없이 2칸)
  - 왜: 한·중·일은 글자 하나에 뜻이 많이 담겨서 같은 50자라도 다른 언어로 번역되면 2~3배 길어짐
  입력칸(TextField · 선택지 · 음식 이름)과 글자 수 표시("12/50")가 이걸 씀
*/
export const WIDE_WEIGHT = 2;

// 한글(자모·음절) · 한자 · 히라가나·가타카나 · 전각 문자
const WIDE = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯豈-﫿＀-￯]/;

const weightOf = (ch: string) => (WIDE.test(ch) ? WIDE_WEIGHT : 1);

/** 무게를 반영한 글자 수 (칸 수) */
export function textLength(text: string) {
  let n = 0;
  for (const ch of text) n += weightOf(ch);
  return n;
}

/** 한도를 넘는 뒷부분을 잘라 냄 (붙여 넣기 등으로 한 번에 넘쳤을 때) */
export function clampText(text: string, max: number) {
  let n = 0;
  let out = "";
  for (const ch of text) {
    n += weightOf(ch);
    if (n > max) break;
    out += ch;
  }
  return out;
}

/** 이 한도에 한·중·일 글자만 쓰면 몇 자까지 들어가는지 (점검 화면 등) */
export const wideCharsFor = (max: number) => Math.floor(max / WIDE_WEIGHT);
