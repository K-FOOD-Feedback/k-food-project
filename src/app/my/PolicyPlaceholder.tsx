import { Screen } from "@/components/Layout";

/** 이용약관 · 개인정보처리방침 자리 (담당 송희) — 내용은 송희·지현이 정한 뒤 채움 */
export function PolicyPlaceholder({ ko, en }: { ko: string; en: string }) {
  return (
    <Screen className="px-6 pt-[calc(48px+env(safe-area-inset-top))] pb-16">
      <h1 className="font-display text-[28px] leading-[1.15]">{ko}</h1>
      <p className="mt-1 text-[15px] text-muted">{en}</p>
      <p className="mt-8 text-[15px] leading-[1.6] text-muted break-keep">
        준비 중이에요. 곧 내용을 채울게요.
        <br />
        Coming soon.
      </p>
    </Screen>
  );
}
