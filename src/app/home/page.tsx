import { HomeScreen } from "./HomeScreen";

// 메인 카드 — 한국인(/home) · 외국인(/home?lang=en) 둘 다 이 한 화면.
// 외국인 버전은 문구가 영어이고 하단 버튼이 "Share your K-food" (Figma 259:7803)
export default async function Page(props: PageProps<"/home">) {
  const { lang } = await props.searchParams;
  return <HomeScreen lang={lang === "en" ? "en" : "ko"} />;
}
