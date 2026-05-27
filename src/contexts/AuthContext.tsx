import React, { createContext, useContext, useMemo, useState } from "react";
import {
    clearStoredSession,
    createLocalSession,
    getStoredSession,
    type AuthSession,
} from "@/lib/auth";

interface AuthContextType {
    token: string | null;
    user: AuthSession["user"] | null;
    login: (name: string, email: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ( {children} : { children: React.ReactNode }) => {
    const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());

    const login = (name: string, email: string) => {
        const nextSession = createLocalSession(name, email);
        if (!nextSession) return false;
        setSession(nextSession);
        return true;
    };

    const logout = () => {
        clearStoredSession();
        setSession(null);
    };

    const value = useMemo(() => ({
        token: session?.token ?? null,
        user: session?.user ?? null,
        login,
        logout,
    }), [session]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuthContext = () => useContext(AuthContext);
