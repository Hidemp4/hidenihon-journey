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

export async function getCurrentSession(): Promise<AuthSession | null> {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
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

export async function signUpWithPassword(email: string, password: string, name: string): Promise<AuthSession | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await requireSupabase().auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { name: name.trim() || DEFAULT_DISPLAY_NAME },
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
