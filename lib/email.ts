import { Resend } from "resend";
import type { IssueReport } from "./types";
import { getReportSubject, renderReportHtml } from "./report-template";

const DEFAULT_FROM = "onboarding@resend.dev";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY가 설정되지 않았습니다. Vercel 환경 변수에 Resend API 키를 추가해 주세요."
      );
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (from) return from;

  // Resend 가입 직후 테스트용 (Resend 계정 이메일로만 수신 가능)
  if (process.env.NODE_ENV === "development") {
    return DEFAULT_FROM;
  }

  throw new Error(
    "RESEND_FROM_EMAIL이 설정되지 않았습니다. Resend에서 도메인을 인증한 뒤 Vercel 환경 변수에 발신 주소(예: report@yourdomain.com)를 추가해 주세요."
  );
}

function toUserFacingEmailError(message: string): string {
  if (/RESEND_API_KEY/i.test(message)) return message;
  if (/RESEND_FROM_EMAIL/i.test(message)) return message;
  if (/domain|verify|not verified/i.test(message)) {
    return "발신 도메인이 인증되지 않았습니다. Resend 대시보드에서 도메인을 인증해 주세요.";
  }
  if (/only send testing emails to your own/i.test(message)) {
    return "Resend 테스트 모드에서는 Resend 가입 이메일로만 발송할 수 있습니다. 도메인 인증 후 RESEND_FROM_EMAIL을 설정해 주세요.";
  }
  return `이메일 발송 실패: ${message}`;
}

function formatFromAddress(from: string): string {
  if (from.includes("<")) return from;
  return `키워드 이슈 보고서 <${from}>`;
}

export async function sendReportEmail(
  to: string,
  report: IssueReport
): Promise<void> {
  const from = formatFromAddress(getFromEmail());
  const html = renderReportHtml(report);
  const subject = getReportSubject(report);

  const { error } = await getResend().emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(toUserFacingEmailError(error.message));
  }
}
