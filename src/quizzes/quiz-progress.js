const STORAGE_KEY = "managerial-accounting-quiz-progress-v1";

function readAll() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(next) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures in private mode or constrained browsers.
  }
}

export function loadQuizDraft(chapterId) {
  const all = readAll();
  const draft = all[chapterId];
  return draft && typeof draft === "object" && !Array.isArray(draft) ? draft : null;
}

export function saveQuizDraft(chapterId, draft) {
  const all = readAll();
  all[chapterId] = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  writeAll(all);
}

export function clearQuizDraft(chapterId) {
  const all = readAll();
  if (chapterId in all) {
    delete all[chapterId];
    writeAll(all);
  }
}
