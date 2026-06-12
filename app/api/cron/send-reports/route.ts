import { NextResponse } from "next/server";
import { getActiveSubscriptions, updateLastSentAt } from "@/lib/db";
import { sendReportEmail } from "@/lib/email";
import { generateIssueReport } from "@/lib/gemini";
import { delay, getKstNowForCron, shouldSendReport } from "@/lib/cron-utils";

function verifyCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const nowKst = getKstNowForCron();
    const subscriptions = await getActiveSubscriptions();
    const due = subscriptions.filter((sub) => shouldSendReport(sub, nowKst));

    const results: Array<{ id: string; status: "sent" | "failed"; error?: string }> = [];

    for (const sub of due) {
      try {
        const report = await generateIssueReport(sub.keyword);
        await sendReportEmail(sub.email, report);
        await updateLastSentAt(sub.id);
        results.push({ id: sub.id, status: "sent" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Cron send failed for ${sub.id}:`, message);
        results.push({ id: sub.id, status: "failed", error: message });
      }

      await delay(6000);
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    });
  } catch (err) {
    console.error("Cron job failed:", err);
    const message = err instanceof Error ? err.message : "Cron job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
