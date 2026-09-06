import { createContext, useContext } from "react";
import type { AuthSession } from "@/lib/auth";

interface AuthContextType {
    token: string | null;
    user: AuthSession["user"] | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    signUp: (email: string, password: string, name: string) => Promise<"ok" | "confirm-email" | "error">;
    requestPasswordReset: (email: string) => Promise<boolean>;
    updatePassword: (password: string) => Promise<boolean>;
    hasRecoverySession: () => Promise<boolean>;
    logout: () => Promise<void>;
    authError: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const useAuthContext = () => useContext(AuthContext);

export { AuthContext, useAuthContext };
export type { AuthContextType };
