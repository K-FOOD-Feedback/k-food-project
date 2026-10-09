/*
  알림함에서 들어온 화면의 "뒤로" 목적지
  알림을 누르면 ?from=notifications(한국인) / ?from=notifications-en(외국인) 이 붙어서 옵니다.
  그 값이 있으면 알림함으로, 없으면 화면 원래의 뒤로 목적지로 갑니다.
*/
const FROM_BACK: Record<string, string> = {
  notifications: "/notifications",
  "notifications-en": "/notifications/en",
};

export function backHrefFrom(from: string | string[] | undefined, fallback: string) {
  const key = Array.isArray(from) ? from[0] : from;
  return (key && FROM_BACK[key]) ?? fallback;
}
