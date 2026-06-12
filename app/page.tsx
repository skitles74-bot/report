"use client";

import { useState } from "react";

type Tab = "instant" | "subscribe";
type Toast = { type: "success" | "error"; message: string } | null;

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("instant");
  const [keyword, setKeyword] = useState("");
  const [email, setEmail] = useState("");
  const [schedule, setSchedule] = useState<"daily" | "weekly">("daily");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleInstantSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, email }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", data.error ?? "보고서 발송에 실패했습니다.");
        return;
      }

      showToast(
        "success",
        `보고서가 생성되어 ${email}(으)로 발송되었습니다. (이슈 ${data.issueCount}건)`
      );
    } catch {
      showToast("error", "네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setToast(null);

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
          onClick={() => { setTab("instant"); setToast(null); }}
        >
          즉시 발송
        </button>
        <button
          type="button"
          className={`tab ${tab === "subscribe" ? "active" : ""}`}
          onClick={() => { setTab("subscribe"); setToast(null); }}
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
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? "보고서 생성 중..." : "보고서 생성 및 발송"}
            </button>
            <p className="hint">AI가 웹 검색 후 보고서를 생성하므로 30초~1분 정도 소요될 수 있습니다.</p>
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
          <div className={`toast ${toast.type}`}>{toast.message}</div>
        )}
      </div>

      <footer className="footer">
        Powered by Gemini AI · Resend
      </footer>
    </div>
  );
}
