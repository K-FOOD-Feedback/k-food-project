"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/*
  페이지 전환 (송희) — 화면이 "뚝" 바뀌지 않게, 나가는 화면은 빠르게 사라지고 들어오는 화면은 살짝 올라오며 나타남
  - template은 주소가 바뀔 때마다 새로 그려져서(layout과 달리) 들어오고 나가는 순간을 잡을 수 있음
  - 메인 ↔ 상세는 지현의 카드 전환(사진·카드가 이어지는 움직임)이 따로 있어서 겹치지 않게 그 화면은 빼고
    (나가는 화면은 나가는 쪽 주소로, 들어오는 화면은 들어오는 쪽 주소로 정해짐)
  - 브라우저가 지원하지 않으면 그냥 지금처럼 바로 바뀜
  모양은 globals.css 의 .page-fade
*/
const OWN_TRANSITION = /^\/(home|posts\/[^/]+)$/;

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fade = OWN_TRANSITION.test(pathname) ? "none" : "page-fade";
  return (
    <ViewTransition enter={fade} exit={fade} default="none">
      {children}
    </ViewTransition>
  );
}
