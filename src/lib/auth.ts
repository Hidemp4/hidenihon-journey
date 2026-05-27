export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

const SESSION_KEY = "hidenihon_session_v1";

export function createLocalSession(name: string, email: string): AuthSession | null {
  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!trimmedName || !normalizedEmail) return null;

  const session: AuthSession = {
    token: crypto.randomUUID(),
    user: {
      id: normalizedEmail,
      name: trimmedName,
      email: normalizedEmail,
    },
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.token || !session.user?.id || !session.user?.name || !session.user?.email) return null;
    return session;
  } catch {
    return null;
  }
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("token");
}
