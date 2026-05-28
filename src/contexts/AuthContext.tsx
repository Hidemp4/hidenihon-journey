import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
    clearStoredSession,
    getStoredSession,
    loginWithLocalPassword,
    type AuthSession,
} from "@/lib/auth";

interface AuthContextType {
    token: string | null;
    user: AuthSession["user"] | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ( {children} : { children: React.ReactNode }) => {
    const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());

    const login = useCallback(async (email: string, password: string) => {
        const nextSession = await loginWithLocalPassword(email, password);
        if (!nextSession) return false;
        setSession(nextSession);
        return true;
    }, []);

    const logout = () => {
        clearStoredSession();
        setSession(null);
    };

    const value = useMemo(() => ({
        token: session?.token ?? null,
        user: session?.user ?? null,
        login,
        logout,
    }), [login, session]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuthContext = () => useContext(AuthContext);
