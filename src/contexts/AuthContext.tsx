import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "@/contexts/auth-context-core";
import {
    consumeAuthRedirect,
    getCurrentSession,
    hasActiveSession,
    loginWithPassword,
    logoutSession,
    mapSession,
    sendPasswordResetEmail,
    signUpWithPassword,
    type AuthSession,
    updateCurrentUserPassword,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function getFriendlyAuthError(error: unknown, fallback: string) {
    if (!(error instanceof Error)) return fallback;

    const message = error.message.toLowerCase();

    if (message.includes("invalid email")) return "Informe um e-mail válido.";
    if (message.includes("signup") && (message.includes("disabled") || message.includes("not allowed"))) return "Cadastro desativado no Supabase. Ative novos usuários em Authentication > Providers.";
    if (message.includes("database error saving new user")) return "Erro ao salvar o usuário no Supabase. Verifique triggers/policies da tabela de perfis.";
    if (message.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
    if (message.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
    if (message.includes("user already registered") || message.includes("already registered")) return "Este e-mail já está cadastrado.";
    if (message.includes("password") && message.includes("weak")) return "Use uma senha mais forte.";
    if (message.includes("password") && message.includes("at least")) return "A senha não atende aos requisitos mínimos.";
    if (message.includes("rate limit") || message.includes("too many")) return "Muitas tentativas. Aguarde um pouco e tente novamente.";
    if (message.includes("session") && message.includes("expired")) return "Sua sessão expirou. Entre novamente.";

    return fallback;
}

export const AuthProvider = ( {children} : { children: React.ReactNode }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState("");

    useEffect(() => {
        let active = true;

        consumeAuthRedirect()
            .then((redirectSession) => redirectSession ?? getCurrentSession())
            .then((currentSession) => {
                if (active) setSession(currentSession);
            })
            .catch((error) => {
                if (active) setAuthError(getFriendlyAuthError(error, "Erro ao carregar sessão."));
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        const subscription = supabase?.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession ? mapSession(nextSession) : null);
            setLoading(false);
        });

        return () => {
            active = false;
            subscription?.data.subscription.unsubscribe();
        };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        try {
            setAuthError("");
            const nextSession = await loginWithPassword(email, password);
            setSession(nextSession);
            return true;
        } catch (error) {
            setAuthError(getFriendlyAuthError(error, "Não foi possível entrar."));
            return false;
        }
    }, []);

    const signUp = useCallback(async (email: string, password: string, name: string) => {
        try {
            setAuthError("");
            const nextSession = await signUpWithPassword(email, password, name);
            if (!nextSession) return "confirm-email";
            setSession(nextSession);
            return "ok";
        } catch (error) {
            setAuthError(getFriendlyAuthError(error, "Não foi possível criar a conta."));
            return "error";
        }
    }, []);

    const requestPasswordReset = useCallback(async (email: string) => {
        try {
            setAuthError("");
            await sendPasswordResetEmail(email);
            return true;
        } catch (error) {
            setAuthError(getFriendlyAuthError(error, "Não foi possível enviar o e-mail de recuperação."));
            return false;
        }
    }, []);

    const updatePassword = useCallback(async (password: string) => {
        try {
            setAuthError("");
            const nextSession = await updateCurrentUserPassword(password);
            setSession(nextSession);
            return true;
        } catch (error) {
            setAuthError(getFriendlyAuthError(error, "Não foi possível atualizar a senha."));
            return false;
        }
    }, []);

    const hasRecoverySession = useCallback(async () => {
        try {
            setAuthError("");
            return await hasActiveSession();
        } catch (error) {
            setAuthError(getFriendlyAuthError(error, "Link de recuperação inválido ou expirado."));
            return false;
        }
    }, []);

    const logout = useCallback(async () => {
        await logoutSession();
        setSession(null);
    }, []);

    const value = useMemo(() => ({
        token: session?.token ?? null,
        user: session?.user ?? null,
        loading,
        login,
        signUp,
        requestPasswordReset,
        updatePassword,
        hasRecoverySession,
        logout,
        authError,
    }), [authError, hasRecoverySession, loading, login, logout, requestPasswordReset, session, signUp, updatePassword]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
