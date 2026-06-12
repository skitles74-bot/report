import { Resend } from "resend";
import type { IssueReport } from "./types";
import { getReportSubject, renderReportHtml } from "./report-template";

const DEFAULT_FROM = "onboarding@resend.dev";

let resendClient: Resend | null = null;

export type EmailSendResult = {
  sent: boolean;
  warning?: string;
};

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

function formatFromAddress(from: string): string {
  if (from.includes("<")) return from;
  return `키워드 이슈 보고서 <${from}>`;
}

function toUserFacingEmailError(message: string): string {
  if (/domain|verify|not verified/i.test(message)) {
    return "발신 도메인이 인증되지 않았습니다. Resend 대시보드에서 도메인을 인증하고 RESEND_FROM_EMAIL을 설정해 주세요.";
  }
  if (/only send testing emails to your own/i.test(message)) {
    return "Resend 테스트 모드에서는 Resend 가입 이메일로만 발송할 수 있습니다. Vercel에 RESEND_FROM_EMAIL(인증 도메인)을 설정해 주세요.";
  }
  return message;
}

export async function sendReportEmail(
  to: string,
  report: IssueReport
): Promise<EmailSendResult> {
  const resend = getResend();
  if (!resend) {
    return {
      sent: false,
      warning:
        "RESEND_API_KEY가 설정되지 않아 이메일을 발송하지 않았습니다. Vercel 환경 변수를 확인해 주세요.",
    };
  }

  const from = formatFromAddress(getFromEmail());
  const html = renderReportHtml(report);
  const subject = getReportSubject(report);

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    return { sent: false, warning: toUserFacingEmailError(error.message) };
  }

  return { sent: true };
}
