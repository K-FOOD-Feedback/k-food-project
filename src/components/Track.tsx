"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { setSuperProps, track, useTrackOnce, type EventName, type EventProps } from "@/lib/analytics";

/** 서버 컴포넌트 화면에서 "화면이 보였다"를 기록할 때 */
export function TrackView({ event, props }: { event: EventName; props?: EventProps }) {
  useTrackOnce(event, props);
  return null;
}

/** 누르면 이벤트를 남기는 Link (서버 컴포넌트에서도 사용 가능) */
export function TrackedLink({
  event,
  props,
  superProps,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { event: EventName; props?: EventProps; superProps?: EventProps }) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        if (superProps) setSuperProps(superProps);
        track(event, props);
        onClick?.(e);
      }}
    />
  );
}
