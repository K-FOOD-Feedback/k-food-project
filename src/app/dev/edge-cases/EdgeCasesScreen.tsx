"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { CardStack } from "@/app/home/CardStack";
import { CommentCard, MyTabs, PhotoTile, timeAgo } from "@/app/my/parts";
import { ProfileHeader } from "@/app/my/profile";
import { openWelcome, WelcomePopup } from "@/app/my/WelcomePopup";
import { DETAIL_COPY } from "@/app/posts/[id]/copy";
import { PhotoGrid } from "@/components/PhotoGrid";
import { NotificationCard } from "@/app/notifications/NotificationsScreen";
import { CommentPile } from "@/app/posts/[id]/CommentPile";
import { CommentModal } from "@/app/posts/[id]/CommentModal";
import { ArticleBody, PhotoTile as DetailPhotoTile } from "@/app/posts/[id]/DetailScreen";
import { DishCard } from "@/app/write/DishCard";
import { OptionsEditor } from "@/app/write/OptionsEditor";
import { ArrowCta, PillButton } from "@/components/Buttons";
import { LoginSheet } from "@/components/LoginSheet";
import { VoteBowl } from "@/app/posts/[id]/VoteBowl";
import { paperlogy } from "@/app/posts/[id]/font";
import { ShareCard, type CardStyle } from "@/app/write/done/ShareCard";
import { THEMES } from "@/app/write/done/ShareSheet";
import { cardShapeAt } from "@/app/home/cardShapes";
import { TextField } from "@/components/Field";
import {
  CARD_CASES,
  COMMENT_CASES,
  DETAIL_CASES,
  DISH_CASES,
  FIELD_CASES,
  LOGIN_CASES,
  MODAL_CASES,
  NEXT_CASES,
  NOTIF_CASES,
  OPTIONS_CASES,
  PHOTO_CASES,
  SHARE_CASES,
  SHARE_SAMPLE,
  TILE_CASES,
  TRANSLATION_CASES,
  AGO_CASES,
  BIG_VOTES_POST,
  CHECK_PHOTOS,
  MAX_PHOTOS_SET,
  MY_COMMENT_CASES,
  PROFILE_CASES,
  VOTE_CASES,
} from "./fixtures";

/*
  점검 화면 /dev/edge-cases (송희) — 극단 데이터(최소·최대 길이, 긴 영어 단어, 이모지, 개수)를 넣은 실제 컴포넌트를 한 화면에
  - 화면을 고치면 폰 크기로 열어서 깨지는 곳이 없는지 확인 (앱 안에는 이 주소로 가는 링크 없음)
  - 데이터는 fixtures.ts 에서 (입력 한도를 바꾸면 여기도 따라 바뀜)
  - 새 컴포넌트를 만들면 아래에 묶음을 하나 추가 (AGENTS.md)
*/
const noop = () => {};
const SHARE_THEME = THEMES[0];
const SHARE_STYLES: CardStyle[] = ["photo", "vote", "verdict"];

export function EdgeCasesScreen() {
  return (
    <main className={`${paperlogy.variable} mx-auto flex w-full max-w-[430px] flex-col gap-14 bg-background px-2 pt-6 pb-24 text-on-dark`}>
      <header className="flex flex-col gap-2 px-2">
        <h1 className="font-display text-[32px] leading-[1.2]">Edge cases</h1>
        <p className="text-[14px] leading-[1.5] text-muted break-keep">
          극단 데이터를 넣은 실제 컴포넌트예요. 글자가 겹치거나, 칸 밖으로 나가거나, 잘려서 뜻을 알 수 없으면 깨진 거예요.
        </p>
      </header>

      <Group title="메인 카드" owner="지현">
        {CARD_CASES.map((c) => (
          <Case key={c.label} label={c.label}>
            <div className="-mx-2 overflow-hidden">
              <CardStack lang={c.lang} posts={[c.post]} index={0} votedIds={new Set()} onIndexChange={noop} onOpen={noop} />
            </div>
          </Case>
        ))}
      </Group>

      <Group title="번역 — 메인 카드 제목 (원문 50자 → 다른 언어)" owner="지현">
        <p className="px-2 text-[14px] text-muted break-keep">기준: 메인 카드는 2줄까지, 넘치면 … (글자 크기는 그대로)</p>
        {TRANSLATION_CASES.map((c) => (
          <Case key={c.label} label={c.label}>
            <div className="-mx-2 overflow-hidden">
              <CardStack lang={c.lang} contentLang={c.lang} posts={[c.post]} index={0} votedIds={new Set()} onIndexChange={noop} onOpen={noop} />
            </div>
          </Case>
        ))}
      </Group>

      <Group title="번역 — 상세 제목 (원문 50자 → 다른 언어)" owner="지현">
        <p className="px-2 text-[14px] text-muted break-keep">기준: 상세는 제목을 잘리지 않게 전부</p>
        {TRANSLATION_CASES.map((c) => (
          <Case key={c.label} label={c.label}>
            <article className="flex flex-col gap-6 rounded-[32px] px-8 py-8 text-on-light" style={{ background: c.post.color }}>
              <ArticleBody post={c.post} lang={c.lang} contentLang={c.lang} />
            </article>
          </Case>
        ))}
      </Group>

      <Group title="상세 사진 칸 · 참여 인원 칩" owner="지현">
        {PHOTO_CASES.map((c) => (
          <Case key={c.label} label={c.label}>
            <DetailPhotoTile postId={c.post.id} photos={c.post.photos} chip={c.chip} title={c.post.title} />
          </Case>
        ))}
      </Group>

      <Group title="상세 글 카드 (제목·본문·글쓴이)" owner="지현">
        {DETAIL_CASES.map((c) => (
          <Case key={c.label} label={c.label}>
            {/* 상세 화면의 본문 카드와 같은 틀 (DetailScreen article) */}
            <article className="flex flex-col gap-6 rounded-[32px] px-8 py-8 text-on-light" style={{ background: c.post.color }}>
              <ArticleBody post={c.post} lang={c.lang} contentLang={c.lang} />
            </article>
          </Case>
        ))}
      </Group>

      <Group title="다음 훈수 거리 버튼" owner="지현">
        {NEXT_CASES.map((c) => (
          <Case key={c.label} label={c.label}>
            {/* 상세 화면 맨 아래 버튼과 같은 모양 (DetailScreen의 ArrowCta, 한국어) */}
            <ArrowCta
              caption="다음 훈수 거리"
              title={c.title}
              style={{ backgroundColor: "#fae276" }}
              className="[&>span>span:last-child]:font-(family-name:--font-paperlogy) [&>span>span:last-child]:truncate [&>span>span:last-child]:font-normal"
              onClick={noop}
            />
          </Case>
        ))}
      </Group>

      <Group title="답글 레이어 (한마디 상세)" owner="지현">
        <p className="px-2 text-[14px] text-muted">화면 전체를 덮는 레이어라 눌러서 열어 봐요. ×나 빈 곳을 누르면 닫혀요.</p>
        {MODAL_CASES.map((c) => (
          <ModalCase key={c.label} c={c} />
        ))}
      </Group>

      <Group title="상세 투표 칸" owner="지현">
        {VOTE_CASES.map((c) => (
          <Case key={c.label} label={c.label}>
            <div className="flex flex-col gap-2">
              <VoteBowl post={c.post} />
              <p className="px-2 text-[12px] text-muted">↓ 결과 (외국인 화면)</p>
              <VoteBowl post={c.post} viewOnly lang="en" />
            </div>
          </Case>
        ))}
      </Group>

      <Group title="한마디 칸" owner="지현">
        {COMMENT_CASES.map((c) => (
          <Case key={c.label} label={c.label}>
            <CommentPile postId={`edge-pile-${c.label}`} commentCount={c.comments.length} authorFlag="🇨🇦" fixture={c.comments} />
          </Case>
        ))}
      </Group>

      <Group title="마이 사진 타일" owner="송희">
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 px-1">
          {TILE_CASES.map((c) => (
            <PhotoTile
              key={c.label}
              href="#"
              onClick={noop}
              photo="/images/card-buldak.png"
              chip={c.chip}
              chipIcon="check"
              chipStrong
              title={c.title}
            />
          ))}
        </div>
      </Group>

      <Group title="알림 카드" owner="송희">
        <NotifCases />
      </Group>

      <Group title="공유 카드" owner="송희">
        {SHARE_CASES.map((c) => (
          <Case key={c.label} label={c.label}>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {SHARE_STYLES.map((s) => (
                <div key={s} className="shrink-0">
                  <ShareCard style={s} post={c.post} theme={SHARE_THEME} seed={1} lang="en" />
                </div>
              ))}
            </div>
          </Case>
        ))}
        {/* 색 5가지 × 언어 4가지 — 그라데이션·어두운 카드에서 글자·띠·스티커가 잘 보이는지, 언어별 큰 제목 길이 (사진 모양도 5가지 돌아가며) */}
        {(["en", "ko", "zh", "ja"] as const).map((l) => (
          <Case key={l} label={`색 5가지 · ${l}`}>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {THEMES.map((th, i) =>
                SHARE_STYLES.map((s) => (
                  <div key={`${i}-${s}`} className="shrink-0">
                    <ShareCard style={s} post={SHARE_SAMPLE} theme={th} seed={i} lang={l} shape={cardShapeAt(i)} />
                  </div>
                )),
              )}
            </div>
          </Case>
        ))}
      </Group>

      <Group title="숫자 표시" owner="공통">
        <p className="px-2 text-[14px] text-muted break-keep">0 · 1 · 999 · 9,999 · 12,345 · 1,234,567 — 칸 밖으로 나가거나 겹치면 깨진 것</p>
        <Case label="상세 참여 인원 칩 (한·영·중·일, 1,234,567명)">
          <div className="flex flex-col gap-2">
            {LANGS.map((l) => (
              <div key={l} className="relative h-[90px] overflow-hidden rounded-[32px]">
                <DetailPhotoTile postId={`edge-chip-${l}`} photos={[BIG_VOTES_POST.cardPhoto]} chip={DETAIL_COPY[l].participants(1234567)} title="" />
              </div>
            ))}
          </div>
        </Case>
        <Case label="투표 결과 문장 (1,234,567명 · 한·영·중·일)">
          <div className="flex flex-col gap-2">
            {LANGS.map((l) => (
              <VoteBowl key={l} post={BIG_VOTES_POST} viewOnly lang={l} />
            ))}
          </div>
        </Case>
        <Case label="한마디 칸 머리 숫자 (12,345)">
          <CommentPile postId="edge-pile-count" commentCount={12345} authorFlag="🇨🇦" fixture={COMMENT_CASES[1].comments} />
        </Case>
        <Case label="마이 탭 숫자">
          <TabsCase />
        </Case>
      </Group>

      <Group title="마이 프로필 머리" owner="송희">
        {PROFILE_CASES.map((c) => (
          <Case key={c.label} label={c.label}>
            <ProfileHeader lang={c.lang} nickname={c.nickname} line={c.line} onOpen={noop} />
          </Case>
        ))}
      </Group>

      <Group title="마이 한마디 카드" owner="송희">
        <div className="flex flex-col gap-3">
          {MY_COMMENT_CASES.map((c) => (
            <CommentCard key={c.label} href={c.href} photo="/images/card-buldak.png" text={c.text} time="방금" where={c.where} />
          ))}
        </div>
      </Group>

      <Group title="시간 표시" owner="송희">
        <AgoCase />
      </Group>

      <Group title="가입 화면 (나라 고르기 · 닉네임)" owner="송희">
        <p className="px-2 text-[14px] text-muted break-keep">열어서 나라 목록에서 가장 긴 이름(Bosnia and Herzegovina 등)을 골라 봐요.</p>
        <div className="flex">
          <PillButton tone="soft" size="md" onClick={openWelcome}>
            열어 보기
          </PillButton>
        </div>
        <WelcomePopup lang="en" onDone={noop} />
      </Group>

      <Group title="사진 검사 · 사진 10장" owner="송희">
        <Case label="검사 중 · 음식 아님 · 부적절 · 애매 · 통과">
          <PhotoGrid photos={CHECK_PHOTOS} onRemove={noop} onMove={noop} onAdd={noop} />
        </Case>
        <Case label="사진 10장 (최대 — Add 잠김)">
          <PhotoGrid photos={MAX_PHOTOS_SET} onRemove={noop} onMove={noop} onAdd={noop} addLocked />
        </Case>
      </Group>

      <Group title="중국어·일본어 한마디 칸" owner="지현">
        {(["zh", "ja"] as const).map((l) => (
          <Case key={l} label={l === "zh" ? "중국어 화면" : "일본어 화면"}>
            <CommentPile postId={`edge-pile-${l}`} commentCount={5} authorFlag="🇨🇦" lang={l} fixture={COMMENT_CASES[1].comments} />
          </Case>
        ))}
      </Group>

      <Group title="로그인 시트 제목" owner="송희">
        {LOGIN_CASES.map((c) => (
          <LoginCase key={c.label} c={c} />
        ))}
      </Group>

      <Group title="음식 이름 카드 (작성 ①)" owner="송희">
        {DISH_CASES.map((c) => (
          <Case key={c.label} label={c.label}>
            <DishCard preview={c.dish} />
          </Case>
        ))}
      </Group>

      <Group title="선택지 편집 (작성 ③ · 수정)" owner="송희">
        {OPTIONS_CASES.map((c) => (
          <OptionsCase key={c.label} c={c} />
        ))}
      </Group>

      <Group title="작성 입력칸" owner="송희">
        <div className="rounded-[32px] bg-surface">
          {FIELD_CASES.map((f) => (
            <TextField key={f.label} label={f.label} value={f.value} maxLength={f.max} rows={f.rows} onChange={noop} />
          ))}
          <div className="pb-2" />
        </div>
      </Group>
    </main>
  );
}

function Group({ title, owner, children }: { title: string; owner: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-baseline gap-2 border-b border-white/10 px-2 pb-2 font-display text-[24px] leading-[1.2]">
        {title}
        <span className="text-[14px] font-semibold text-muted">담당 {owner}</span>
      </h2>
      {children}
    </section>
  );
}

function Case({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="px-2 text-[14px] font-semibold text-muted">{label}</p>
      {children}
    </div>
  );
}

/** 답글 레이어는 화면 전체를 덮어서 버튼으로 열기 */
function ModalCase({ c }: { c: (typeof MODAL_CASES)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <Case label={c.label}>
      <div className="flex">
        <PillButton tone="soft" size="md" onClick={() => setOpen(true)}>
          열어 보기
        </PillButton>
      </div>
      {open && (
        <CommentModal
          comment={c.comment}
          replies={c.replies}
          onClose={() => setOpen(false)}
          onReply={noop}
          onEdit={noop}
          onDelete={noop}
          onEditReply={noop}
          onDeleteReply={noop}
          onReport={noop}
          hiddenIds={new Set(c.hidden ?? [])}
        />
      )}
    </Case>
  );
}

/** 로그인 시트도 바텀시트라 버튼으로 열기 */
function LoginCase({ c }: { c: (typeof LOGIN_CASES)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <Case label={c.label}>
      <div className="flex">
        <PillButton tone="soft" size="md" onClick={() => setOpen(true)}>
          열어 보기
        </PillButton>
      </div>
      <LoginSheet lang="ko" open={open} title={c.title} onClose={() => setOpen(false)} onLoggedIn={() => setOpen(false)} />
    </Case>
  );
}

/** 선택지 편집 — 고쳐 볼 수 있게 이 화면 안에서만 상태로 */
function OptionsCase({ c }: { c: (typeof OPTIONS_CASES)[number] }) {
  const [options, setOptions] = useState(c.options);
  return (
    <Case label={c.label}>
      <div className="rounded-[32px] bg-surface px-3 py-4">
        <OptionsEditor source="write" options={options} onChange={setOptions} />
      </div>
    </Case>
  );
}

const LANGS = ["ko", "en", "zh", "ja"] as const;

/** 마이 탭 — 큰 숫자 */
function TabsCase() {
  const [tab, setTab] = useState<"a" | "b">("a");
  return (
    <div className="flex flex-col gap-2">
      <MyTabs lang="ko" label="ko" value={tab} onChange={setTab} tabs={[["a", "투표", 12345], ["b", "한마디", 1234567]]} />
      <MyTabs label="en" value={tab} onChange={setTab} tabs={[["a", "Posts", 9999], ["b", "Comments", 1234567]]} />
    </div>
  );
}

/** 알림 카드 — 시각 글자가 서버·브라우저 시간대로 어긋나지 않게 브라우저에서만 그림 */
function NotifCases() {
  const now = useSyncExternalStore(
    () => () => {},
    () => NOTIF_NOW,
    () => 0,
  );
  if (!now) return null;
  return (
    <div className="flex flex-col gap-3">
      {NOTIF_CASES.ko.map((n) => (
        <NotificationCard key={n.id} lang="ko" now={now} n={n} translate={false} />
      ))}
      {/* 외국인 알림 — 영·일·중 화면 (일·중은 문장이 가장 김) */}
      {(["en", "ja", "zh"] as const).map((ui) =>
        NOTIF_CASES.en.map((n) => <NotificationCard key={`${ui}-${n.id}`} lang="en" ui={ui} now={now} n={n} translate />),
      )}
    </div>
  );
}
const NOTIF_NOW = typeof window === "undefined" ? 0 : Date.now();

/** 시간 표시 — 네 언어 */
function AgoCase() {
  // 화면을 그릴 때 한 번만 지금 시각을 잡음 (그릴 때마다 바뀌지 않게)
  const [now] = useState(() => Date.now());
  return (
    <div className="flex flex-col gap-1 rounded-[20px] bg-surface p-4 text-[14px]">
      {AGO_CASES.map((ms) => (
        <p key={ms} className="flex gap-3 tabular-nums">
          {LANGS.map((l) => (
            <span key={l} className="min-w-0 flex-1 truncate">
              {timeAgo(now - ms, now, l)}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
