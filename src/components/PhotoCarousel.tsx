"use client";

import { useRef, useState } from "react";
import { PhotoImage } from "./PhotoGrid";

/** Tile/Photo — 가로 스와이프 사진 + 점 인디케이터 또는 "1 / 3" 칩 */
export function PhotoCarousel({
  photos,
  height,
  indicator = "dots",
  bordered = false,
}: {
  photos: string[];
  /** 없으면 정사각형 */
  height?: number;
  indicator?: "dots" | "count" | "none";
  bordered?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[32px] bg-surface ${bordered ? "border border-white/5" : ""} ${
        height ? "" : "aspect-square"
      }`}
      style={height ? { height } : undefined}
    >
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
      >
        {photos.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative size-full shrink-0 snap-center"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${photos.length}`}
          >
            <PhotoImage src={src} sizes="(max-width: 430px) 100vw, 430px" priority={i === 0} />
          </div>
        ))}
      </div>

      {indicator === "dots" && photos.length > 1 && (
        <div className="pointer-events-none absolute bottom-[15px] left-1/2 flex -translate-x-1/2 gap-1.5">
          {photos.map((src, i) => (
            <span
              key={`${src}-dot-${i}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-[18px] bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
      {indicator === "count" && (
        <span className="absolute left-4 top-4 rounded-full bg-surface px-3 py-[7px] text-[13px] font-semibold leading-[1.3] tabular-nums">
          {index + 1} / {photos.length}
        </span>
      )}
    </div>
  );
}
