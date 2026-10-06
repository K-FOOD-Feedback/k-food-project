"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

/** Mixpanel 시작 (토큰이 없으면 아무것도 하지 않음) */
export function Analytics() {
  useEffect(() => {
    initAnalytics();
  }, []);
  return null;
}
