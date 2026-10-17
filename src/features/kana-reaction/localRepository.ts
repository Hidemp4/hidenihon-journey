import type { KanaReactionSession } from "./types";

const STORAGE_KEY = "hidenihon:kana-reaction:sessions";
const MAX_LOCAL_SESSIONS = 50;

function readSessions(): KanaReactionSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions: KanaReactionSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_LOCAL_SESSIONS)));
}

export function loadLocalKanaReactionSessions() {
  return readSessions();
}

export function saveLocalKanaReactionSession(session: KanaReactionSession) {
  const sessions = readSessions().filter((storedSession) => storedSession.id !== session.id);
  writeSessions([session, ...sessions]);
}
