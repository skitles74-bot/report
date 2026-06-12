import type { Subscription } from "./types";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getKstNow(): Date {
  return new Date(Date.now() + KST_OFFSET_MS);
}

function getKstDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shouldSendReport(sub: Subscription, nowKst: Date): boolean {
  const hour = nowKst.getUTCHours();
  if (hour !== 9) return false;

  if (!sub.last_sent_at) return true;

  const lastSentKst = new Date(new Date(sub.last_sent_at).getTime() + KST_OFFSET_MS);
  const todayStr = getKstDateString(nowKst);
  const lastSentStr = getKstDateString(lastSentKst);

  if (todayStr === lastSentStr) return false;

  if (sub.schedule === "daily") return true;

  // weekly: Monday (1 in KST via UTC day since we shifted)
  const dayOfWeek = nowKst.getUTCDay();
  return dayOfWeek === 1;
}

export function getKstNowForCron(): Date {
  return getKstNow();
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
