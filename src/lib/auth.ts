import type { Session, User } from "@supabase/supabase-js";
import { requireSupabase } from "./supabase";

export const DEFAULT_DISPLAY_NAME = "Estudante HideNihon";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

function getDisplayName(user: User) {
  return user.user_metadata?.name || user.email?.split("@")[0] || DEFAULT_DISPLAY_NAME;
}

export function mapSession(session: Session): AuthSession {
  return {
    token: session.access_token,
    user: {
      id: session.user.id,
      name: getDisplayName(session.user),
      email: session.user.email ?? "",
    },
  };
}

function isRecoverableSessionError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("auth session missing") ||
    message.includes("refresh token") ||
    message.includes("invalid token") ||
    message.includes("jwt")
  );
}

export async function consumeAuthRedirect(): Promise<AuthSession | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    const { data, error } = await requireSupabase().auth.exchangeCodeForSession(code);
    if (error) throw error;
    window.history.replaceState({}, document.title, `${window.location.pathname}${params.get("mode") ? `?mode=${params.get("mode")}` : ""}`);
    return data.session ? mapSession(data.session) : null;
  }

  return null;
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) {
    if (isRecoverableSessionError(error)) {
      await requireSupabase().auth.signOut({ scope: "local" });
      return null;
    }

    throw error;
  }
  return data.session ? mapSession(data.session) : null;
}

export async function loginWithPassword(email: string, password: string): Promise<AuthSession> {
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  if (!data.session) throw new Error("Não foi possível criar a sessão.");
  return mapSession(data.session);
}

export function getAuthRedirectUrl() {
  return `${window.location.origin}/login`;
}

export async function signUpWithPassword(email: string, password: string, name: string): Promise<AuthSession | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await requireSupabase().auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { name: name.trim() || DEFAULT_DISPLAY_NAME },
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });
  if (error) throw error;
  if (data.user?.identities?.length === 0) throw new Error("Este e-mail já está cadastrado.");
  return data.session ? mapSession(data.session) : null;
}

export function getPasswordRecoveryRedirectUrl() {
  return `${window.location.origin}/login?mode=reset-password`;
}

export async function sendPasswordResetEmail(email: string) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: getPasswordRecoveryRedirectUrl(),
  });
  if (error) throw error;
}

export async function hasActiveSession() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  return Boolean(data.session);
}

export async function updateCurrentUserPassword(password: string): Promise<AuthSession> {
  const { data, error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;

  const { data: sessionData, error: sessionError } = await requireSupabase().auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error("Sessão de recuperação expirada. Solicite um novo link.");
  return mapSession(sessionData.session);
}

export async function logoutSession() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
