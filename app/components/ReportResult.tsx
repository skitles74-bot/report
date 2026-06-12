import type { IssueReport } from "@/lib/types";

const IMPACT_LABELS: Record<string, { label: string; className: string }> = {
  high: { label: "높음", className: "impact-high" },
  medium: { label: "보통", className: "impact-medium" },
  low: { label: "낮음", className: "impact-low" },
};

interface ReportResultProps {
  report: IssueReport;
}

export default function ReportResult({ report }: ReportResultProps) {
  const generatedDate = new Date(report.generatedAt).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });

  return (
    <div className="report-result">
      <div className="report-header">
        <h2 className="report-title">이슈 보고서</h2>
        <p className="report-keyword">&quot;{report.keyword}&quot;</p>
        <p className="report-meta">
          {report.period} · {generatedDate} 생성 · 이슈 {report.issues.length}건
        </p>
      </div>

      <section className="report-section">
        <h3 className="report-section-title">종합 요약</h3>
        <p className="report-summary">{report.summary}</p>
      </section>

      <section className="report-section">
        <h3 className="report-section-title">주요 이슈</h3>
        <ul className="issue-list">
          {report.issues.map((issue, index) => {
            const impact = IMPACT_LABELS[issue.impact] ?? IMPACT_LABELS.medium;
            return (
              <li key={`${issue.title}-${index}`} className="issue-item">
                <div className="issue-header">
                  <h4 className="issue-title">{issue.title}</h4>
                  <span className={`impact-badge ${impact.className}`}>
                    {impact.label}
                  </span>
                </div>
                <p className="issue-date">{issue.date}</p>
                <p className="issue-description">{issue.description}</p>
                {issue.sources.length > 0 && (
                  <ul className="source-list">
                    {issue.sources.map((source, sIndex) => (
                      <li key={`${source.url}-${sIndex}`}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {report.trends.length > 0 && (
        <section className="report-section">
          <h3 className="report-section-title">관련 트렌드</h3>
          <div className="trend-tags">
            {report.trends.map((trend) => (
              <span key={trend} className="trend-tag">
                {trend}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
