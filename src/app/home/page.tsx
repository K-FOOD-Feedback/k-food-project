import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <Placeholder
      part="1. 메인 카드"
      title="메인 (카드)"
      owner="지현"
      links={[
        { href: "/posts/1", label: "카드 → 상세" },
        { href: "/write", label: "콘텐츠 작성" },
        { href: "/my", label: "마이" },
      ]}
    />
  );
}
