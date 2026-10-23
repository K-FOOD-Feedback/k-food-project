import type { Metadata } from "next";
import { PolicyPlaceholder } from "../my/PolicyPlaceholder";

export const metadata: Metadata = { title: "개인정보처리방침" };

// 개인정보처리방침 (자리만, 내용은 나중에)
export default function Page() {
  return <PolicyPlaceholder doc="privacy" />;
}
