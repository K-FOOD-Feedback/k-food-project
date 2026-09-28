"use client";

import { useCallback, useRef } from "react";

/**
 * 03 Native picker.
 * 웹에서는 <input type="file">을 열면 OS가 사진 보관함 / 사진 찍기 / 파일 선택 메뉴를 보여 줍니다.
 * open()은 반드시 사용자 클릭 핸들러 안에서 호출해야 합니다.
 */
export function usePhotoPicker(onFiles: (files: FileList) => void) {
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback(() => inputRef.current?.click(), []);

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      hidden
      onChange={(e) => {
        if (e.target.files?.length) onFiles(e.target.files);
        // 같은 파일을 다시 골라도 change가 일어나도록 비웁니다.
        e.target.value = "";
      }}
    />
  );

  return { open, input };
}
