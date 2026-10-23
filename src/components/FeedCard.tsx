import Image from "next/image";
import { Icon } from "./Icon";

/** 물결(Star 6) 모양으로 잘린 음식 사진 */
export function BlobPhoto({
  src,
  size,
  priority = false,
  className = "relative",
}: {
  src: string;
  size: number;
  priority?: boolean;
  /** 위치 지정 클래스 (기본 relative — absolute로 바꿔도 됨) */
  className?: string;
}) {
  return (
    <div
      className={`shrink-0 bg-background ${className}`}
      style={{
        width: size,
        height: size,
        maskImage: "url(/images/blob-mask.svg)",
        WebkitMaskImage: "url(/images/blob-mask.svg)",
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes={`${size}px`}
        priority={priority}
        unoptimized={src.startsWith("blob:")}
        className="object-cover"
      />
    </div>
  );
}

/** 홈 카드 스택용 Feed Card */
export function FeedCard({
  title,
  author,
  photo,
  votesLabel,
  questionLabel,
  color = "bg-lilac",
  scale = 1,
  priority,
}: {
  title: string;
  author: string;
  photo: string;
  votesLabel: string;
  questionLabel: string;
  color?: string;
  /** 게시 완료 화면처럼 작게 보여 줄 때 (0.72 등) */
  scale?: number;
  priority?: boolean;
}) {
  return (
    <div
      className={`flex w-full flex-col items-center gap-4 rounded-[32px] px-6 pt-6 pb-8 text-on-light ${color}`}
      style={scale !== 1 ? { zoom: scale } : undefined}
    >
      <BlobPhoto src={photo} size={242} priority={priority} />
      <div className="flex w-full flex-col items-start gap-3">
        <p className="font-display text-[24px] leading-[1.2] text-on-light [text-wrap:balance]">{title}</p>
        <div className="flex items-center gap-2">
          <span className="size-6 rounded-full bg-lilac ring-2 ring-white/60" aria-hidden="true" />
          <span className="text-[14px] font-bold leading-[1.4]">{author}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-2 text-[14px] font-bold leading-[1.4] text-on-dark">
            <Icon name="heart" size={16} />
            {votesLabel}
          </span>
          <span className="inline-flex items-center rounded-full bg-white px-3 py-2 text-[14px] font-bold leading-[1.4] text-on-light">
            {questionLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
