export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  authVersion: string;
}

const SESSION_KEY = "hidenihon_session_v1";
const LEGACY_USERS_KEY = "hidenihon_users_v1";
const LOCAL_AUTH_EMAIL = (import.meta.env.VITE_LOGIN_EMAIL ?? "aluno@hidenihon.local").trim().toLowerCase();
const LOCAL_AUTH_PASSWORD = import.meta.env.VITE_LOGIN_PASSWORD ?? "hidenihon123";
const LOCAL_AUTH_VERSION = `${LOCAL_AUTH_EMAIL}:${LOCAL_AUTH_PASSWORD}`;

export async function loginWithLocalPassword(email: string, password: string): Promise<AuthSession | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== LOCAL_AUTH_EMAIL || password !== LOCAL_AUTH_PASSWORD) return null;

  const session = createSession({
    id: LOCAL_AUTH_EMAIL,
    name: "Estudante HideNihon",
    email: LOCAL_AUTH_EMAIL,
  });
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(LEGACY_USERS_KEY);
  return session;
}

function createSession(user: AuthUser): AuthSession {
  return {
    token: crypto.randomUUID(),
    authVersion: LOCAL_AUTH_VERSION,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.token || !session.user?.id || !session.user?.name || !session.user?.email) return null;
    if (session.user.email.trim().toLowerCase() !== LOCAL_AUTH_EMAIL || session.authVersion !== LOCAL_AUTH_VERSION) {
      clearStoredSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_USERS_KEY);
  localStorage.removeItem("token");
}
