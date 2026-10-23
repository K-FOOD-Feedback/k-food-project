"use client";

import { useActionState, useRef, useState } from "react";
import { checkPin, type PinState } from "./actions";

/*
  숫자 4칸 비밀번호 입력 (어드민 진입)
  - 실제 입력칸은 하나(투명, 4칸 위에 덮여 있음)이고 4칸은 그 숫자를 보여 주기만 함
    → 빠르게 쳐도 숫자가 빠지지 않고, 지우기·붙여넣기·폰 숫자 키패드가 그대로 동작
  - 4자리가 차면 바로 확인 (버튼 없음)
  - 틀리면 칸이 흔들리고 비워진 뒤 다시 입력
  - 칸에는 숫자만 1글자라 넘칠 일 없음. 안내 문구는 짧은 고정 문구 (좁으면 줄바꿈)
*/
const LENGTH = 4;

export function PinForm({ next }: { next: string }) {
  const [pin, setPin] = useState("");
  const [focused, setFocused] = useState(true);
  const [shakes, setShakes] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState(async (prev: PinState, data: FormData) => {
    const result = await checkPin(prev, data);
    // 맞으면 서버가 어드민 화면으로 보내므로 여기엔 틀렸을 때만 옴
    setPin("");
    setShakes((n) => n + 1);
    requestAnimationFrame(() => input.current?.focus());
    return result;
  }, undefined);

  const message = pending
    ? ""
    : state?.error === "wrong"
      ? `비밀번호가 맞지 않아요 · ${state.tries}번 더 틀리면 10분 잠겨요`
      : state?.error === "locked"
        ? `너무 많이 틀렸어요. ${state.left}분 뒤에 다시 해 주세요`
        : state?.error === "setup"
          ? "비밀번호가 아직 설정되지 않았어요 (ADMIN_PASSWORD)"
          : "";

  return (
    <form ref={form} action={action} className="flex flex-col items-center gap-5">
      <input type="hidden" name="next" value={next} />
      <div key={shakes} className={`relative flex gap-3 ${shakes > 0 ? "animate-shake" : ""}`}>
        {Array.from({ length: LENGTH }, (_, i) => {
          // 지금 칠 칸 (다 찼으면 마지막 칸)
          const current = focused && !pending && i === Math.min(pin.length, LENGTH - 1);
          return (
            <span
              key={i}
              aria-hidden
              className={`flex size-16 items-center justify-center rounded-[20px] text-[24px] font-semibold transition ${
                current ? "bg-surface ring-2 ring-primary" : "bg-surface-2"
              } ${pending ? "opacity-60" : ""}`}
            >
              {pin[i] ?? ""}
            </span>
          );
        })}
        <input
          ref={input}
          name="pin"
          value={pin}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, LENGTH);
            setPin(v);
            // 화면에 4번째 숫자가 그려진 뒤 확인
            if (v.length === LENGTH) requestAnimationFrame(() => form.current?.requestSubmit());
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          readOnly={pending}
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={LENGTH}
          aria-label="어드민 비밀번호 숫자 4자리"
          // 4칸 위에 투명하게 덮어서 어느 칸을 눌러도 입력됨 (글자·커서는 안 보이게, 16px라 아이폰이 확대하지 않음)
          className="absolute inset-0 h-full w-full cursor-pointer bg-transparent text-[16px] text-transparent caret-transparent outline-none selection:bg-transparent"
        />
      </div>
      <p role="alert" className="min-h-[22px] text-center text-[14px] leading-[1.5] text-error">
        {message}
      </p>
    </form>
  );
}
