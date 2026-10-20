import type { Metadata } from "next";
import { PolicyPlaceholder } from "../my/PolicyPlaceholder";

export const metadata: Metadata = { title: "이용약관 · 오늘의 참견" };

// 이용약관 (자리만, 내용은 나중에)
export default function Page() {
  return <PolicyPlaceholder doc="terms" />;
}
