import type { IssueReport } from "./types";

const IMPACT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: "높음", color: "#dc2626", bg: "#fef2f2" },
  medium: { label: "보통", color: "#d97706", bg: "#fffbeb" },
  low: { label: "낮음", color: "#16a34a", bg: "#f0fdf4" },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderReportHtml(report: IssueReport): string {
  const generatedDate = new Date(report.generatedAt).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });

  const issuesHtml = report.issues
    .map((issue) => {
      const impact = IMPACT_LABELS[issue.impact] ?? IMPACT_LABELS.medium;
      const sourcesHtml = issue.sources
        .map(
          (s) =>
            `<li style="margin-bottom:4px;"><a href="${escapeHtml(s.url)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(s.title)}</a></li>`
        )
        .join("");

      return `
        <div style="margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:8px;border-left:4px solid ${impact.color};">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:16px;font-weight:700;color:#1e293b;">${escapeHtml(issue.title)}</span>
            <span style="font-size:11px;padding:2px 8px;border-radius:12px;background:${impact.bg};color:${impact.color};font-weight:600;">${impact.label}</span>
          </div>
          <p style="font-size:12px;color:#64748b;margin:0 0 8px;">${escapeHtml(issue.date)}</p>
          <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 12px;">${escapeHtml(issue.description)}</p>
          ${sourcesHtml ? `<ul style="margin:0;padding-left:20px;font-size:13px;">${sourcesHtml}</ul>` : ""}
        </div>`;
    })
    .join("");

  const trendsHtml = report.trends
    .map(
      (t) =>
        `<span style="display:inline-block;margin:4px 4px 4px 0;padding:4px 12px;background:#eef2ff;color:#4338ca;border-radius:16px;font-size:13px;">${escapeHtml(t)}</span>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px 24px;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
      <div style="text-align:center;margin-bottom:24px;padding-bottom:24px;border-bottom:2px solid #e2e8f0;">
        <h1 style="margin:0 0 8px;font-size:22px;color:#1e293b;">📊 이슈 보고서</h1>
        <p style="margin:0;font-size:18px;font-weight:700;color:#c99400;">"${escapeHtml(report.keyword)}"</p>
        <p style="margin:8px 0 0;font-size:13px;color:#64748b;">${escapeHtml(report.period)} · ${generatedDate} 생성</p>
      </div>

      <div style="margin-bottom:24px;">
        <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;">종합 요약</h2>
        <p style="font-size:14px;color:#334155;line-height:1.7;margin:0;padding:16px;background:#fffbeb;border-radius:8px;border-left:4px solid #c99400;">${escapeHtml(report.summary)}</p>
      </div>

      <div style="margin-bottom:24px;">
        <h2 style="font-size:16px;color:#1e293b;margin:0 0 16px;">주요 이슈 (${report.issues.length}건)</h2>
        ${issuesHtml}
      </div>

      ${
        report.trends.length > 0
          ? `<div style="margin-bottom:24px;">
        <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;">관련 트렌드</h2>
        <div>${trendsHtml}</div>
      </div>`
          : ""
      }

      <div style="text-align:center;padding-top:16px;border-top:1px solid #e2e8f0;">
        <p style="font-size:12px;color:#94a3b8;margin:0;">키워드 이슈 자동 보고서 · AI 생성 콘텐츠</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function getReportSubject(report: IssueReport): string {
  return `[이슈 보고서] "${report.keyword}" 최근 7일 주요 이슈 (${report.issues.length}건)`;
}
