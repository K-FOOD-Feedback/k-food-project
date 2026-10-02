import Link from "next/link";

/**
 * 아직 구현 전인 화면 자리.
 * 담당자가 이 화면을 만들기 시작하면 Placeholder를 지우고 실제 화면으로 바꾸세요.
 */
export function Placeholder({
  part,
  title,
  owner,
  links = [],
}: {
  part: string;
  title: string;
  owner: string;
  links?: { href: string; label: string }[];
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-neutral-500">
          {part} · 담당 {owner}
        </p>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-neutral-500">준비 중입니다</p>
      </div>
      {links.length > 0 && (
        <nav className="flex flex-col gap-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-xl bg-neutral-100 px-4 py-3 font-medium">
              {l.label} →
            </Link>
          ))}
        </nav>
      )}
    </main>
  );
}
