"use client";

import { useActionState } from "react";
import { PillButton } from "@/components/Buttons";
import { login } from "./actions";

/** 관리 페이지 비밀번호 칸 (숫자 키패드) */
export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: false });
  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <input
        name="password"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        autoFocus
        placeholder="비밀번호"
        aria-label="비밀번호"
        className="h-14 rounded-[20px] bg-surface-2 px-5 text-center text-[20px] tracking-[0.3em] outline-none placeholder:tracking-normal placeholder:text-white/40"
      />
      <p className="h-5 text-center text-[13px] text-error">{state.error ? "비밀번호가 달라요" : ""}</p>
      <div className="flex">
        <PillButton type="submit" tone={pending ? "disabled" : "primary"} disabled={pending}>
          {pending ? "확인 중…" : "열기"}
        </PillButton>
      </div>
    </form>
  );
}
