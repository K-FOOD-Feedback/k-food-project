export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-medium tracking-widest text-orange-600 dark:text-orange-400">
          K-FOOD FEEDBACK
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          오늘의 참견
        </h1>

        <p className="mt-4 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          전 세계의 한식 도전에 한마디를 보태는 곳
        </p>

        <p className="mt-10 text-sm text-neutral-500 dark:text-neutral-500">
          준비 중입니다
        </p>
      </div>
    </main>
  );
}
