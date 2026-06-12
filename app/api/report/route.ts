import { buildReportFromResearch, researchKeywordIssues } from "@/lib/gemini";
import { isEmailEnabled, sendReportEmail, type EmailSendResult } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { reportRequestSchema } from "@/lib/validate";

type ProgressStep = "validating" | "searching" | "generating" | "sending";

const STEP_MESSAGES: Record<ProgressStep, string> = {
  validating: "입력값을 확인하고 있습니다...",
  searching: "웹에서 최근 7일 관련 이슈를 검색하고 있습니다...",
  generating: "AI가 이슈를 분석하고 보고서를 작성하고 있습니다...",
  sending: "HTML 보고서를 생성하고 이메일을 발송하고 있습니다...",
};

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: object) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const emitProgress = (step: ProgressStep) => {
        emit("progress", { step, message: STEP_MESSAGES[step] });
      };

      try {
        emitProgress("validating");

        const ip = getClientIp(request);
        if (!checkRateLimit(ip)) {
          emit("error", {
            message: "요청 횟수 제한을 초과했습니다. 1시간 후 다시 시도해 주세요.",
          });
          return;
        }

        const body = await request.json();
        const parsed = reportRequestSchema.safeParse(body);

        if (!parsed.success) {
          emit("error", {
            message:
              parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다.",
          });
          return;
        }

        const { keyword, email } = parsed.data;

        emitProgress("searching");
        const research = await researchKeywordIssues(keyword);
        emit("search", { keyword, content: research });

        emitProgress("generating");
        const report = await buildReportFromResearch(keyword, research);
        emit("report", { report });

        let emailResult: EmailSendResult = { sent: false, skipped: true };
        if (isEmailEnabled()) {
          emitProgress("sending");
          emailResult = await sendReportEmail(email, report);
        }

        emit("done", {
          issueCount: report.issues.length,
          email,
          emailSent: emailResult.sent,
          emailSkipped: emailResult.skipped ?? false,
          emailWarning: emailResult.warning,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "보고서 생성 중 오류가 발생했습니다.";
        console.error("Report generation failed:", err);
        emit("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
