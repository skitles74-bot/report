import type { IssueReport } from "./types";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    keyword: { type: "STRING" },
    period: { type: "STRING" },
    summary: { type: "STRING" },
    issues: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          date: { type: "STRING" },
          description: { type: "STRING" },
          impact: { type: "STRING" },
          sources: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                url: { type: "STRING" },
              },
              required: ["title", "url"],
            },
          },
        },
        required: ["title", "date", "description", "impact", "sources"],
      },
    },
    trends: { type: "ARRAY", items: { type: "STRING" } },
    generatedAt: { type: "STRING" },
  },
  required: ["keyword", "period", "summary", "issues", "trends", "generatedAt"],
};

const RESEARCH_PROMPT = (keyword: string) => `
당신은 뉴스·이슈 분석 전문가입니다. "${keyword}" 키워드와 관련된 **최근 7일 이내** 주요 이슈를 웹에서 조사하세요.

다음 항목을 포함해 한국어로 상세히 작성하세요:
1. 3~5문장 종합 요약
2. 주요 이슈 3~7개 (각각: 제목, 날짜 YYYY-MM-DD, 설명 2~3문장, 영향도 high/medium/low, 출처 URL 1~3개)
3. 관련 트렌드 키워드 3~5개

최근 7일 이내 이슈만 포함하고, 출처 URL은 실제 링크를 사용하세요.
`;

const STRUCTURE_PROMPT = (keyword: string, research: string) => `
아래 조사 결과를 보고서 JSON으로 변환하세요.

조사 결과:
${research}

규칙:
- keyword: "${keyword}"
- period: "최근 7일"
- generatedAt: "${new Date().toISOString()}"
- impact는 "high", "medium", "low" 중 하나
- issues는 3~7개
- 한국어 유지
`;

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function normalizeImpact(value: string): "high" | "medium" | "low" {
  const v = value?.toLowerCase?.() ?? "medium";
  if (v === "high" || v === "medium" || v === "low") return v;
  return "medium";
}

function normalizeReport(raw: IssueReport, keyword: string): IssueReport {
  if (!raw.summary || !Array.isArray(raw.issues) || raw.issues.length === 0) {
    throw new Error("Invalid report structure");
  }

  return {
    keyword: raw.keyword || keyword,
    period: "최근 7일",
    summary: String(raw.summary).trim(),
    issues: raw.issues.map((issue) => ({
      title: String(issue.title).trim(),
      date: String(issue.date).trim(),
      description: String(issue.description).trim(),
      impact: normalizeImpact(String(issue.impact)),
      sources: (issue.sources ?? []).map((s) => ({
        title: String(s.title).trim(),
        url: String(s.url).trim(),
      })),
    })),
    trends: (raw.trends ?? []).map((t) => String(t).trim()),
    generatedAt: raw.generatedAt ?? new Date().toISOString(),
  };
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

async function requestGemini(
  apiKey: string,
  model: string,
  payload: object
): Promise<string> {
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
    throw new Error(
      `Gemini API error (${model}): ${response.status} ${responseText.slice(0, 300)}`
    );
  }

  const data = JSON.parse(responseText) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error(`Gemini API empty response (${model})`);
  }

  return text;
}

async function researchIssues(
  apiKey: string,
  model: string,
  keyword: string
): Promise<string> {
  return requestGemini(apiKey, model, {
    contents: [{ role: "user", parts: [{ text: RESEARCH_PROMPT(keyword) }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });
}

async function structureReport(
  apiKey: string,
  model: string,
  keyword: string,
  research: string
): Promise<IssueReport> {
  const text = await requestGemini(apiKey, model, {
    contents: [
      { role: "user", parts: [{ text: STRUCTURE_PROMPT(keyword, research) }] },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const parsed = JSON.parse(extractJson(text)) as IssueReport;
  return normalizeReport(parsed, keyword);
}

async function structureReportPlain(
  apiKey: string,
  model: string,
  keyword: string,
  research: string
): Promise<IssueReport> {
  const text = await requestGemini(apiKey, model, {
    contents: [
      { role: "user", parts: [{ text: STRUCTURE_PROMPT(keyword, research) }] },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const parsed = JSON.parse(extractJson(text)) as IssueReport;
  return normalizeReport(parsed, keyword);
}

function toUserFacingError(errors: string[]): string {
  const joined = errors.join(" | ");

  if (/API key not valid|API_KEY_INVALID|401/i.test(joined)) {
    return "Gemini API 키가 올바르지 않습니다. Google AI Studio에서 API 키를 확인해 주세요.";
  }
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(joined)) {
    return "Gemini API 사용 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (/no longer available|deprecated|404/i.test(joined)) {
    return "AI 모델 호출에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "보고서 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

async function researchKeywordIssues(keyword: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const errors: string[] = [];

  for (const model of GEMINI_MODELS) {
    try {
      return await researchIssues(apiKey, model, keyword);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(toUserFacingError(errors));
}

async function buildReportFromResearch(
  keyword: string,
  research: string
): Promise<IssueReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const structureErrors: string[] = [];

  for (const model of GEMINI_MODELS) {
    try {
      return await structureReport(apiKey, model, keyword, research);
    } catch (err) {
      structureErrors.push(err instanceof Error ? err.message : String(err));
    }
  }

  for (const model of GEMINI_MODELS) {
    try {
      return await structureReportPlain(apiKey, model, keyword, research);
    } catch (err) {
      structureErrors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(toUserFacingError(structureErrors));
}

export { researchKeywordIssues, buildReportFromResearch };

export async function generateIssueReport(keyword: string): Promise<IssueReport> {
  const research = await researchKeywordIssues(keyword);
  return buildReportFromResearch(keyword, research);
}
