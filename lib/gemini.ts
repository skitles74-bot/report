import type { IssueReport } from "./types";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"];

const REPORT_PROMPT = (keyword: string) => `
당신은 뉴스·이슈 분석 전문가입니다. "${keyword}" 키워드와 관련된 **최근 7일 이내** 주요 이슈를 조사하고 보고서를 작성하세요.

다음 JSON 형식으로만 응답하세요. 다른 텍스트나 마크다운 코드 블록 없이 순수 JSON만 출력하세요:

{
  "keyword": "${keyword}",
  "period": "최근 7일",
  "summary": "3~5문장의 종합 요약 (한국어)",
  "issues": [
    {
      "title": "이슈 제목",
      "date": "YYYY-MM-DD",
      "description": "이슈 상세 설명 (2~3문장, 한국어)",
      "impact": "high",
      "sources": [{ "title": "출처 제목", "url": "https://..." }]
    }
  ],
  "trends": ["관련 트렌드 키워드 1", "키워드 2"],
  "generatedAt": "${new Date().toISOString()}"
}

규칙:
- issues는 3~7개, 최근 7일 이내 이슈만 포함
- impact는 high(중대), medium(보통), low(경미)
- sources는 각 이슈당 1~3개, 실제 URL 포함
- 한국어로 작성
- JSON만 출력
`;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);

  return text.trim();
}

function parseReport(raw: string, keyword: string): IssueReport {
  const parsed = JSON.parse(extractJson(raw)) as IssueReport;

  if (!parsed.summary || !Array.isArray(parsed.issues)) {
    throw new Error("Invalid report structure");
  }

  return {
    keyword: parsed.keyword || keyword,
    period: "최근 7일",
    summary: parsed.summary,
    issues: parsed.issues.map((issue) => ({
      title: issue.title,
      date: issue.date,
      description: issue.description,
      impact: issue.impact ?? "medium",
      sources: issue.sources ?? [],
    })),
    trends: parsed.trends ?? [],
    generatedAt: parsed.generatedAt ?? new Date().toISOString(),
  };
}

async function callGemini(apiKey: string, model: string, keyword: string): Promise<string> {
  const payload = {
    contents: [{ role: "user", parts: [{ text: REPORT_PROMPT(keyword) }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const response = await fetch(
    `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Gemini API error (${model}): ${response.status} ${responseText}`);
  }

  const data = JSON.parse(responseText) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini API empty response (${model})`);

  return text;
}

export async function generateIssueReport(keyword: string): Promise<IssueReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const errors: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const model of GEMINI_MODELS) {
      try {
        const text = await callGemini(apiKey, model, keyword);
        return parseReport(text, keyword);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${model}: ${message}`);
      }
    }
  }

  throw new Error(errors.join(" | ") || "Failed to generate report");
}
