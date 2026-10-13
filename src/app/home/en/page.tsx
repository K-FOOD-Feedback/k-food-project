import { redirect } from "next/navigation";

// 예전 외국인 메인 주소 — 이제 /home?lang=en 한 화면으로 합쳐서, 들어오면 그쪽으로 보냅니다.
// (랜딩·글쓰기·마이 등 여러 화면이 아직 이 주소로 연결돼 있어 남겨 둠)
export default function Page() {
  redirect("/home?lang=en");
}
