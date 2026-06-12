import { NextResponse } from "next/server";
import { generateIssueReport } from "@/lib/gemini";
import { sendReportEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { reportRequestSchema } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "요청 횟수 제한을 초과했습니다. 1시간 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = reportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { keyword, email } = parsed.data;
    const report = await generateIssueReport(keyword);
    await sendReportEmail(email, report);

    return NextResponse.json({
      success: true,
      issueCount: report.issues.length,
    });
  } catch (err) {
    console.error("Report generation failed:", err);
    const message =
      err instanceof Error ? err.message : "보고서 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
