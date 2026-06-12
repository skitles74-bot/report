"use client";

import { useRef, useState } from "react";
import ReportResult from "./components/ReportResult";
import SearchResult from "./components/SearchResult";
import type { IssueReport } from "@/lib/types";

type Tab = "instant" | "subscribe";
type Toast = { type: "success" | "error"; message: string };
type ReportStep = "validating" | "searching" | "generating" | "sending";

const REPORT_STEPS: Array<{ id: ReportStep; label: string }> = [
  { id: "validating", label: "입력 확인" },
  { id: "searching", label: "이슈 검색" },
  { id: "generating", label: "보고서 작성" },
  { id: "sending", label: "이메일 발송" },
];

const STEP_ORDER: ReportStep[] = ["validating", "searching", "generating", "sending"];

function parseSseChunk(chunk: string): Array<{ event: string; data: string }> {
  return chunk
    .split("\n\n")
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      const event = lines.find((l) => l.startsWith("event: "))?.slice(7) ?? "message";
      const data = lines.find((l) => l.startsWith("data: "))?.slice(6) ?? "{}";
      return { event, data };
    });
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("instant");
  const [keyword, setKeyword] = useState("");
  const [email, setEmail] = useState("");
  const [schedule, setSchedule] = useState<"daily" | "weekly">("daily");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [currentStep, setCurrentStep] = useState<ReportStep | null>(null);
  const [completedSteps, setCompletedSteps] = useState<ReportStep[]>([]);
  const [stepMessage, setStepMessage] = useState("");
  const [reportResult, setReportResult] = useState<IssueReport | null>(null);
  const [searchResult, setSearchResult] = useState<{ keyword: string; content: string } | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearSuccessTimer() {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }

  function showToast(type: "success" | "error", message: string) {
    clearSuccessTimer();
    setToast({ type, message });

    if (type === "success") {
      successTimerRef.current = setTimeout(() => {
        setToast((prev) => (prev?.type === "success" ? null : prev));
      }, 5000);
    }
  }

  function dismissToast() {
    clearSuccessTimer();
    setToast(null);
  }

  function resetProgress() {
    setCurrentStep(null);
    setCompletedSteps([]);
    setStepMessage("");
  }

  function handleProgress(step: ReportStep, message: string) {
    setCurrentStep((prev) => {
      if (prev && STEP_ORDER.indexOf(step) > STEP_ORDER.indexOf(prev)) {
        setCompletedSteps((completed) =>
          completed.includes(prev) ? completed : [...completed, prev]
        );
      }
      return step;
    });
    setStepMessage(message);
  }

  async function handleInstantSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    setReportResult(null);
    setSearchResult(null);
    resetProgress();

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, email }),
      });

      if (!res.body) {
        showToast("error", "서버 응답을 받지 못했습니다.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          for (const { event, data } of parseSseChunk(part)) {
            const payload = JSON.parse(data) as Record<string, unknown>;

            if (event === "progress") {
              handleProgress(payload.step as ReportStep, payload.message as string);
            } else if (event === "search") {
              setSearchResult({
                keyword: payload.keyword as string,
                content: payload.content as string,
              });
            } else if (event === "report") {
              setReportResult(payload.report as IssueReport);
            } else if (event === "done") {
              setCompletedSteps([...STEP_ORDER]);
              setCurrentStep(null);
              showToast(
                "success",
                `보고서가 생성되어 ${payload.email}(으)로 발송되었습니다. (이슈 ${payload.issueCount}건)`
              );
            } else if (event === "error") {
              setCurrentStep(null);
              showToast("error", (payload.message as string) ?? "보고서 발송에 실패했습니다.");
            }
          }
        }
      }
    } catch {
      setCurrentStep(null);
      showToast("error", "네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    resetProgress();

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, email, schedule }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error ?? "구독 등록에 실패했습니다.");
        return;
      }

      const scheduleLabel = schedule === "daily" ? "매일" : "매주 월요일";
      showToast(
        "success",
        `"${keyword}" 키워드 ${scheduleLabel} 09:00 보고서 구독이 등록되었습니다.`
      );
    } catch {
      showToast("error", "네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    if (!keyword || !email) {
      showToast("error", "키워드와 이메일을 입력해 주세요.");
      return;
    }

    setLoading(true);
    setToast(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, email }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error ?? "구독 해지에 실패했습니다.");
        return;
      }

      showToast("success", `"${keyword}" 키워드 구독이 해지되었습니다.`);
    } catch {
      showToast("error", "네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function getStepStatus(stepId: ReportStep): "pending" | "active" | "done" {
    if (completedSteps.includes(stepId)) return "done";
    if (currentStep === stepId) return "active";
    return "pending";
  }

  return (
    <div className="app">
      <header className="header">
        <h1>키워드 이슈 보고서</h1>
        <p className="subtitle">
          키워드를 입력하면 AI가 최근 7일 주요 이슈를 수집·요약해 이메일로 보내드립니다.
        </p>
      </header>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === "instant" ? "active" : ""}`}
          onClick={() => setTab("instant")}
        >
          즉시 발송
        </button>
        <button
          type="button"
          className={`tab ${tab === "subscribe" ? "active" : ""}`}
          onClick={() => setTab("subscribe")}
        >
          정기 구독
        </button>
      </div>

      <div className="card">
        {tab === "instant" ? (
          <form onSubmit={handleInstantSubmit}>
            <div className="form-group">
              <label htmlFor="keyword-instant">키워드</label>
              <input
                id="keyword-instant"
                type="text"
                placeholder="예: AI, 반도체, 기후변화"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                maxLength={50}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email-instant">수신 이메일</label>
              <input
                id="email-instant"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {loading && (
              <div className="progress-panel" aria-live="polite">
                <p className="progress-title">보고서 생성 중</p>
                <ol className="progress-steps">
                  {REPORT_STEPS.map((step) => {
                    const status = getStepStatus(step.id);
                    return (
                      <li key={step.id} className={`progress-step progress-step--${status}`}>
                        <span className="progress-step-icon">
                          {status === "done" ? "✓" : status === "active" ? "●" : "○"}
                        </span>
                        <span className="progress-step-label">{step.label}</span>
                      </li>
                    );
                  })}
                </ol>
                {stepMessage && <p className="progress-message">{stepMessage}</p>}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? "처리 중..." : "보고서 생성 및 발송"}
            </button>
            {!loading && (
              <p className="hint">AI가 웹 검색 후 보고서를 생성하므로 30초~1분 정도 소요될 수 있습니다.</p>
            )}
          </form>
        ) : (
          <form onSubmit={handleSubscribe}>
            <div className="form-group">
              <label htmlFor="keyword-sub">키워드</label>
              <input
                id="keyword-sub"
                type="text"
                placeholder="예: AI, 반도체, 기후변화"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                maxLength={50}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email-sub">수신 이메일</label>
              <input
                id="email-sub"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="schedule">발송 주기</label>
              <select
                id="schedule"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as "daily" | "weekly")}
              >
                <option value="daily">매일 09:00 (KST)</option>
                <option value="weekly">매주 월요일 09:00 (KST)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? "등록 중..." : "구독 등록"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading}
              onClick={handleUnsubscribe}
            >
              구독 해지
            </button>
          </form>
        )}

        {toast && (
          <div className={`toast ${toast.type}`} role="alert">
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-dismiss"
              onClick={dismissToast}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {tab === "instant" && searchResult && (
        <div className="card report-card">
          <SearchResult
            keyword={searchResult.keyword}
            content={searchResult.content}
            isGeneratingReport={loading && !reportResult}
          />
        </div>
      )}

      {tab === "instant" && reportResult && (
        <div className="card report-card">
          <ReportResult report={reportResult} />
        </div>
      )}

      <footer className="footer">
        Powered by Gemini AI · Resend
      </footer>
    </div>
  );
}
