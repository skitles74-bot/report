export interface IssueReport {
  keyword: string;
  period: "최근 7일";
  summary: string;
  issues: Array<{
    title: string;
    date: string;
    description: string;
    impact: "high" | "medium" | "low";
    sources: Array<{ title: string; url: string }>;
  }>;
  trends: string[];
  generatedAt: string;
}
