import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { HEADER_BUTTON } from "./PageHeader";

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
      // 모든 화면 상단 버튼은 메인 헤더와 같은 64px 원형 (PageHeader의 HEADER_BUTTON)
      className={`${HEADER_BUTTON} ${className}`}
      {...props}
    >
      <Icon name={icon} />
    </Clickable>
  );
}

/**
 * 화살표 CTA (알약 + 오른쪽 원 →).
 * 규칙: "다음 단계로 넘어가는" 버튼에만 씁니다 — 작성 플로우의 Next / Write with AI / Post.
 * 그 자리에서 끝나는 행동(저장·삭제·이동·투표 등)은 PillButton(일반 CTA)을 씁니다.
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
      className={`flex w-full items-center gap-3 overflow-hidden rounded-full bg-primary py-1 pl-7 pr-1 text-left text-on-light transition active:scale-[0.98] disabled:cursor-not-allowed [&:disabled:not(.animate-pulse)]:opacity-40 ${className}`}
      {...props}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.3]">
        {caption && <span className="truncate text-[13px] font-medium opacity-70">{caption}</span>}
        <span className="text-[18px] font-bold">{title}</span>
      </span>
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-background text-on-dark ${compact ? "size-14" : "size-16"}`}
      >
        <Icon name={icon} />
      </span>
    </Clickable>
  );
}

const PILL_TONES = {
  primary: "bg-primary text-on-light",
  black: "bg-on-dark text-on-light",
  white: "bg-surface text-on-dark",
  soft: "bg-surface-2 text-on-dark",
  error: "bg-error text-on-light",
  disabled: "bg-surface-2 text-disabled",
} as const;

/** 크기 — lg: 화면 아래 CTA(h64, 칸을 채움) · md: 화면 중간의 작은 버튼(h48, 글자만큼) */
const PILL_SIZES = {
  lg: "h-16 min-w-0 flex-1 text-[16px]",
  md: "h-12 flex-none px-6 text-[15px]",
} as const;

/** 일반 CTA — SemiBold. 저장·확인·이동처럼 그 자리에서 끝나는 행동 */
export function PillButton({
  tone = "black",
  size = "lg",
  children,
  className = "",
  ...props
}: Clickable & {
  tone?: keyof typeof PILL_TONES;
  size?: keyof typeof PILL_SIZES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Clickable
      className={`flex items-center justify-center rounded-full font-semibold leading-[1.5] transition active:scale-[0.99] disabled:cursor-not-allowed ${PILL_SIZES[size]} ${PILL_TONES[tone]} ${className}`}
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
      className={`flex h-[72px] w-full items-center justify-center rounded-full px-6 font-display text-[20px] leading-none text-on-dark transition active:scale-[0.99] ${
        tone === "primary" ? "bg-primary" : "bg-secondary"
      }`}
      {...props}
    >
      {children}
    </Clickable>
  );
}
