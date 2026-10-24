"use client";

import { useSyncExternalStore } from "react";
import { mtVersion, subscribeMt } from "./translate";

/** 자동 번역(mt)이 도착하면 이 화면을 다시 그리게 — mt()·titleIn 등을 쓰는 화면 맨 위에서 부르세요 */
export function useMt() {
  return useSyncExternalStore(subscribeMt, mtVersion, () => 0);
}
