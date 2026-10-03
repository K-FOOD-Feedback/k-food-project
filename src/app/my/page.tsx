import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <Placeholder
      part="7. 마이 (나중)"
      title="마이"
      owner="송희"
      links={[{ href: "/home", label: "메인으로" }]}
    />
  );
}
