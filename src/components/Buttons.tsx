import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Clickable =
  | ({ href: string } & Omit<ComponentProps<typeof Link>, "href" | "className">)
  | ({ href?: undefined } & Omit<ComponentProps<"button">, "className">);

function Clickable({ className, ...props }: Clickable & { className: string }) {
  if (props.href !== undefined) {
    return <Link className={className} {...props} />;
  }
  const { type = "button", ...rest } = props as ComponentProps<"button">;
  return <button type={type} className={className} {...rest} />;
}

/** 48px 원형 아이콘 버튼 (Top Bar 좌·우) */
export function IconButton({
  icon,
  label,
  className = "",
  ...props
}: Clickable & { icon: IconName; label: string; className?: string }) {
  return (
    <Clickable
      aria-label={label}
      className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-ink transition active:scale-95 ${className}`}
      {...props}
    >
      <Icon name={icon} />
    </Clickable>
  );
}

/**
 * 검정 알약 + 흰 원 화살표 CTA.
 * 홈 진입·질문 CTA처럼 "간혹"만 쓰는 강조 버튼입니다.
 */
export function ArrowCta({
  title,
  caption,
  icon = "arrow-right",
  compact = false,
  className = "",
  ...props
}: Clickable & {
  title: string;
  caption?: string;
  icon?: IconName;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Clickable
      className={`flex w-full items-center gap-3 overflow-hidden rounded-full bg-night py-1 pl-7 pr-1 text-left text-white transition active:scale-[0.99] disabled:opacity-40 ${className}`}
      {...props}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.3]">
        {caption && <span className="truncate text-[13px] font-medium opacity-70">{caption}</span>}
        <span className="text-[18px] font-bold">{title}</span>
      </span>
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-white text-ink ${compact ? "size-14" : "size-16"}`}
      >
        <Icon name={icon} />
      </span>
    </Clickable>
  );
}

const PILL_TONES = {
  black: "bg-night text-white",
  white: "bg-white text-ink",
  soft: "bg-canvas-soft text-ink",
  error: "bg-error text-ink",
  disabled: "bg-[#e3e3e3] text-subtle",
} as const;

/** 일반 CTA — h64, SemiBold 16 */
export function PillButton({
  tone = "black",
  children,
  className = "",
  ...props
}: Clickable & { tone?: keyof typeof PILL_TONES; children: ReactNode; className?: string }) {
  return (
    <Clickable
      className={`flex h-16 min-w-0 flex-1 items-center justify-center rounded-full text-[16px] font-semibold leading-[1.5] transition active:scale-[0.99] disabled:cursor-not-allowed ${PILL_TONES[tone]} ${className}`}
      {...props}
    >
      {children}
    </Clickable>
  );
}

/** 랜딩 전용 큰 버튼 (Button / MVP, LG) */
export function BrandButton({
  tone,
  children,
  ...props
}: Clickable & { tone: "primary" | "secondary"; children: ReactNode }) {
  return (
    <Clickable
      className={`flex h-[72px] w-full items-center justify-center rounded-full px-6 font-display text-[20px] leading-none text-ink transition active:scale-[0.99] ${
        tone === "primary" ? "bg-pink" : "bg-periwinkle"
      }`}
      {...props}
    >
      {children}
    </Clickable>
  );
}
