"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { useFlow } from "@/lib/write-store";
import { LoginSheet } from "./LoginSheet";
import { usePhotoPicker } from "./PhotoPicker";

/**
 * 외국인 메인의 "Share your K-food" 버튼 (6. 콘텐츠 작성의 시작점, 담당 송희)
 * - 로그인 전: 메인 화면 위에 로그인 바텀시트 → 로그인하면 바로 사진 선택
 * - 로그인 후: 바로 사진 선택
 * - 사진을 고르면 /write(04 Photos)로 이동
 * 모양은 className으로 메인 화면에서 정합니다.
 */
export function ShareKfoodButton({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  const { loggedIn, logIn, addPhotos } = useFlow();
  const [loginOpen, setLoginOpen] = useState(false);

  const picker = usePhotoPicker((files) => {
    const { added, overflow } = addPhotos(files, { fresh: true });
    track("photos_added", { count: added, total: added, from: "share" });
    if (overflow) track("photo_limit_hit", { from: "share" });
    router.push("/write");
  });

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          track("share_clicked", { logged_in: loggedIn });
          if (loggedIn) {
            picker.open();
          } else {
            track("login_sheet_opened", { from: "share" });
            setLoginOpen(true);
          }
        }}
      >
        {children}
      </button>
      {picker.input}
      <LoginSheet
        open={loginOpen}
        onClose={() => {
          track("login_cancelled", { from: "share", stage: "sheet" });
          setLoginOpen(false);
        }}
        onLoggedIn={() => {
          track("login_completed", { from: "share", method: "google" });
          logIn();
          setLoginOpen(false);
          // 로그인 버튼 클릭 안에서 바로 사진 선택을 열어야 브라우저가 막지 않습니다
          picker.open();
        }}
      />
    </>
  );
}
