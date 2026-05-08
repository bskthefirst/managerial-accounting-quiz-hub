import React from "react";
import Ch01Quiz from "./quizzes/ch01-quiz.jsx";
import Ch02Quiz from "./quizzes/ch02-quiz.jsx";
import Ch03Quiz from "./quizzes/ch03-quiz.jsx";
import Ch05Quiz from "./quizzes/ch05-quiz.jsx";

const STORAGE_KEY = "managerial-accounting-quiz-history-v1";
const DEFAULT_HISTORY = [
  {
    id: "seed-ch01-82",
    chapterId: "ch01",
    chapterLabel: "Chapter 1",
    percent: 82,
    completedAt: "2026-05-07T09:00:00-05:00",
    seeded: true,
    note: "Pre-site attempt",
  },
  {
    id: "seed-ch02-76",
    chapterId: "ch02",
    chapterLabel: "Chapter 2",
    percent: 76,
    completedAt: "2026-05-07T09:15:00-05:00",
    seeded: true,
    note: "Pre-site attempt",
  },
];

const CHAPTERS = {
  ch01: {
    id: "ch01",
    label: "Chapter 1",
    title: "Chapter 1",
    summary: "Cost classification and COGM basics",
    component: Ch01Quiz,
  },
  ch02: {
    id: "ch02",
    label: "Chapter 2",
    title: "Chapter 2",
    summary: "Job order costing, overhead rates, and journal entries",
    component: Ch02Quiz,
  },
  ch03: {
    id: "ch03",
    label: "Chapter 3",
    title: "Chapter 3",
    summary: "Activity-based costing, cost drivers, and cost hierarchy",
    component: Ch03Quiz,
  },
  ch05: {
    id: "ch05",
    label: "Chapter 5",
    title: "Chapter 5",
    summary: "Cost behavior, high-low method, regression, and contribution margin",
    component: Ch05Quiz,
  },
};

function safeLoadHistory() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_HISTORY;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 0) return DEFAULT_HISTORY;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return DEFAULT_HISTORY;
  }
}

function saveHistory(nextHistory) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
  } catch {
    // Ignore storage failures in constrained browsers/private mode.
  }
}

function routeFromHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const path = raw || "/";
  const [cleanPath] = path.split("?");
  const parts = cleanPath.split("/").filter(Boolean);

  if (parts[0] === "quiz" && parts[1] && CHAPTERS[parts[1]]) {
    return { page: "quiz", chapterId: parts[1] };
  }

  if (parts[0] === "history") {
    return { page: "history" };
  }

  return { page: "home" };
}

function routeToHash(route) {
  if (route.page === "quiz") return `#/quiz/${route.chapterId}`;
  if (route.page === "history") return "#/history";
  return "#/";
}

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

function formatDateTime(iso) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function pct(correct, total) {
  return total ? Math.round((correct / total) * 100) : 0;
}

function HomePage({ history, onStart, onOpenHistory }) {
  const latestByChapter = Object.fromEntries(
    Object.keys(CHAPTERS).map(chapterId => {
      const attempts = history.filter(item => item.chapterId === chapterId);
      return [chapterId, attempts[attempts.length - 1] || null];
    }),
  );

  const totalAttempts = history.length;

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroKicker}>Managerial Accounting Quiz Hub</div>
        <h1 style={styles.heroTitle}>Pick a chapter, solve it, and keep your score history.</h1>
        <p style={styles.heroBody}>
          Chapter quizzes are saved locally in your browser. Each completed run is recorded, so you can compare tries over time.
        </p>
        <div style={styles.heroActions}>
          <button onClick={() => onStart("ch01")} style={styles.primaryButton}>Start Chapter 1</button>
          <button onClick={onOpenHistory} style={styles.secondaryButton}>View Score History</button>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Chapters</h2>
          <div style={styles.sectionMeta}>{totalAttempts} recorded attempt{totalAttempts === 1 ? "" : "s"}</div>
        </div>
        <div style={styles.cardGrid}>
          {Object.values(CHAPTERS).map(chapter => {
            const last = latestByChapter[chapter.id];
            return (
              <article key={chapter.id} style={styles.chapterCard}>
                <div>
                  <div style={styles.chapterEyebrow}>{chapter.label}</div>
                  <h3 style={styles.chapterTitle}>{chapter.title}</h3>
                  <p style={styles.chapterSummary}>{chapter.summary}</p>
                </div>
                <div style={styles.chapterMeta}>
                  <div>{last ? `Latest: ${last.percent}%` : "No attempts yet"}</div>
                  <div>{history.filter(item => item.chapterId === chapter.id).length} attempt{history.filter(item => item.chapterId === chapter.id).length === 1 ? "" : "s"}</div>
                </div>
                <button onClick={() => onStart(chapter.id)} style={styles.chapterButton}>Solve {chapter.label}</button>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function HistoryPage({ history, onStart, onClearHistory }) {
  const chapterIds = Object.keys(CHAPTERS);

  return (
    <main style={styles.page}>
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Score History</h2>
            <div style={styles.sectionMeta}>Every completed attempt is grouped by chapter.</div>
          </div>
          <button onClick={onClearHistory} style={styles.secondaryButton}>Clear History</button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {chapterIds.map(chapterId => {
            const chapter = CHAPTERS[chapterId];
            const attempts = history.filter(item => item.chapterId === chapterId);
            return (
              <article key={chapterId} style={styles.historyCard}>
                <div style={styles.historyHeader}>
                  <div>
                    <h3 style={styles.chapterTitle}>{chapter.label}</h3>
                    <div style={styles.chapterSummary}>{chapter.summary}</div>
                  </div>
                  <button onClick={() => onStart(chapterId)} style={styles.chapterButton}>Solve again</button>
                </div>

                {attempts.length === 0 ? (
                  <div style={styles.emptyState}>No attempts yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {attempts.map((attempt, index) => (
                      <div key={attempt.id} style={styles.attemptRow}>
                        <div style={styles.attemptOrdinal}>{ordinal(index + 1)} try</div>
                        <div style={styles.attemptScore}>{attempt.percent}%</div>
                        <div style={styles.attemptDetails}>
                          <span>
                            {Number.isFinite(attempt.correct) && Number.isFinite(attempt.total)
                              ? `${attempt.correct} / ${attempt.total}`
                              : attempt.note || "Pre-site attempt"}
                          </span>
                          <span>{formatDateTime(attempt.completedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function QuizPage({ chapter, onBackHome, onOpenHistory, onComplete }) {
  const Quiz = chapter.component;

  return (
    <main style={styles.quizPage}>
      <div style={styles.quizTopbar}>
        <div>
          <div style={styles.heroKicker}>{chapter.label}</div>
          <div style={styles.quizSubtitle}>{chapter.summary}</div>
        </div>
        <div style={styles.heroActions}>
          <button onClick={onBackHome} style={styles.secondaryButton}>Home</button>
          <button onClick={onOpenHistory} style={styles.secondaryButton}>History</button>
        </div>
      </div>
      <div style={styles.quizFrame}>
        <Quiz onComplete={onComplete} />
      </div>
    </main>
  );
}

export default function App() {
  const [route, setRoute] = React.useState(() => routeFromHash());
  const [history, setHistory] = React.useState(() => safeLoadHistory());

  React.useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) window.location.hash = routeToHash({ page: "home" });
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  React.useEffect(() => {
    saveHistory(history);
  }, [history]);

  React.useEffect(() => {
    const label =
      route.page === "quiz"
        ? `${CHAPTERS[route.chapterId].label} · Managerial Accounting Quiz Hub`
        : route.page === "history"
          ? "Score History · Managerial Accounting Quiz Hub"
          : "Managerial Accounting Quiz Hub";
    document.title = label;
  }, [route]);

  const start = React.useCallback((chapterId) => {
    window.location.hash = routeToHash({ page: "quiz", chapterId });
  }, []);

  const openHistory = React.useCallback(() => {
    window.location.hash = routeToHash({ page: "history" });
  }, []);

  const clearHistory = React.useCallback(() => {
    setHistory([]);
  }, []);

  const recordAttempt = React.useCallback((attempt) => {
    setHistory(prev => ([
      ...prev,
      {
        id: uid(),
        ...attempt,
      },
    ]));
  }, []);

  const chapter = route.page === "quiz" ? CHAPTERS[route.chapterId] : null;

  return (
    <div style={styles.app}>
      <header style={styles.shellHeader}>
        <button onClick={() => window.location.hash = routeToHash({ page: "home" })} style={styles.brandButton}>
          <span style={styles.brandMark}>MA</span>
          <span>Managerial Accounting Quiz Hub</span>
        </button>
        <div style={styles.headerActions}>
          <button onClick={() => window.location.hash = routeToHash({ page: "home" })} style={styles.headerButton}>Home</button>
          <button onClick={openHistory} style={styles.headerButton}>History</button>
        </div>
      </header>

      {route.page === "home" && (
        <HomePage history={history} onStart={start} onOpenHistory={openHistory} />
      )}

      {route.page === "history" && (
        <HistoryPage history={history} onStart={start} onClearHistory={clearHistory} />
      )}

      {route.page === "quiz" && chapter && (
        <QuizPage chapter={chapter} onBackHome={() => window.location.hash = routeToHash({ page: "home" })} onOpenHistory={openHistory} onComplete={recordAttempt} />
      )}
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #eef2ff 0%, #f8fafc 26%, #f1f5f9 100%)",
    color: "#0f172a",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  shellHeader: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "14px 18px",
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #e2e8f0",
  },
  brandButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    border: "none",
    background: "transparent",
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    padding: 0,
  },
  brandMark: {
    width: 32,
    height: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    background: "#0f172a",
    color: "#fff",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  headerActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  headerButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  page: {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "28px 18px 56px",
  },
  hero: {
    borderRadius: 22,
    padding: "32px 30px",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #155e75 100%)",
    color: "#fff",
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.25)",
  },
  heroKicker: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#bfdbfe",
    fontWeight: 800,
    marginBottom: 10,
  },
  heroTitle: {
    margin: 0,
    fontSize: 42,
    lineHeight: 1.05,
    maxWidth: 760,
    letterSpacing: -0.02,
  },
  heroBody: {
    margin: "14px 0 0",
    maxWidth: 700,
    fontSize: 16,
    lineHeight: 1.7,
    color: "#dbeafe",
  },
  heroActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 22,
  },
  primaryButton: {
    border: "none",
    background: "#f8fafc",
    color: "#0f172a",
    padding: "10px 16px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "rgba(255,255,255,0.9)",
    color: "#0f172a",
    padding: "10px 16px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
  },
  section: {
    marginTop: 26,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
  },
  sectionMeta: {
    color: "#475569",
    fontSize: 13,
    fontWeight: 700,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
  },
  chapterCard: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    background: "#fff",
    padding: 18,
    boxShadow: "0 10px 25px rgba(15,23,42,0.06)",
  },
  chapterEyebrow: {
    fontSize: 12,
    fontWeight: 800,
    color: "#0f766e",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chapterTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
  },
  chapterSummary: {
    margin: "8px 0 0",
    color: "#475569",
    lineHeight: 1.6,
    fontSize: 14,
  },
  chapterMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: "#334155",
    fontSize: 13,
    fontWeight: 700,
  },
  chapterButton: {
    border: "none",
    background: "#0f172a",
    color: "#fff",
    borderRadius: 12,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 800,
  },
  historyCard: {
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    background: "#fff",
    padding: 18,
    boxShadow: "0 10px 25px rgba(15,23,42,0.06)",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  attemptRow: {
    display: "grid",
    gridTemplateColumns: "120px 90px 1fr",
    gap: 12,
    alignItems: "center",
    padding: "12px 14px",
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  attemptOrdinal: {
    fontWeight: 800,
    color: "#0f172a",
  },
  attemptScore: {
    fontSize: 22,
    fontWeight: 900,
    color: "#0f766e",
  },
  attemptDetails: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    color: "#475569",
    fontSize: 13,
    fontWeight: 700,
  },
  emptyState: {
    padding: "14px 0 2px",
    color: "#64748b",
    fontWeight: 600,
  },
  quizPage: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "20px 18px 56px",
  },
  quizTopbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  quizSubtitle: {
    color: "#475569",
    fontWeight: 700,
    marginTop: 4,
  },
  quizFrame: {
    borderRadius: 18,
    overflow: "visible",
  },
};
