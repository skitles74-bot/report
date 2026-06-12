import { Resend } from "resend";
import type { IssueReport } from "./types";
import { getReportSubject, renderReportHtml } from "./report-template";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendReportEmail(
  to: string,
  report: IssueReport
): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL is not configured");

  const html = renderReportHtml(report);
  const subject = getReportSubject(report);

  const { error } = await getResend().emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }
}
