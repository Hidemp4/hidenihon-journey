import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/contexts/auth-context-core";
import type { AuthMode } from "@/components/login/config";
import { MAX_NAME_LENGTH, validatePasswords } from "@/components/login/validation";

const EMPTY_VALUES = { name: "", email: "", password: "", confirmPassword: "" };
type Field = keyof typeof EMPTY_VALUES;

export function useAuthForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, login, signUp, requestPasswordReset, updatePassword, hasRecoverySession, authError } = useAuthContext();

  const [mode, setMode] = useState<AuthMode>(() =>
    searchParams.get("mode") === "reset-password" ? "reset-password" : "login",
  );
  const [values, setValues] = useState(EMPTY_VALUES);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== "reset-password") return;

    let isMounted = true;
    hasRecoverySession().then((hasSession) => {
      if (!isMounted || hasSession) return;
      setMode("forgot-password");
      setError("Link de recuperação inválido ou expirado. Peça um novo e-mail para redefinir sua senha.");
    });

    return () => {
      isMounted = false;
    };
  }, [hasRecoverySession, mode]);

  const goHome = () => navigate("/home", { replace: true });
  const clearPasswords = () => setValues((v) => ({ ...v, password: "", confirmPassword: "" }));

  const bind = (field: Field) => ({
    value: values[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: event.target.value })),
  });

  const switchMode = (nextMode: AuthMode) => {
    setError("");
    setSuccess("");
    clearPasswords();
    setMode(nextMode);
  };

  const submit = async () => {
    const { name, email, password, confirmPassword } = values;

    switch (mode) {
      case "signup": {
        const problem = name.trim().length > MAX_NAME_LENGTH
          ? `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`
          : validatePasswords(password, confirmPassword);
        if (problem) return setError(problem);

        const result = await signUp(email, password, name);
        if (result === "ok") return goHome();
        if (result === "confirm-email") {
          setError("Conta criada. Confirme seu e-mail antes de entrar.");
          clearPasswords();
          setMode("login");
        }
        return;
      }

      case "forgot-password": {
        const sent = await requestPasswordReset(email);
        if (!sent) return setError(authError || "Não foi possível enviar o e-mail de recuperação.");
        return setSuccess("Enviamos um link para redefinir sua senha. Verifique seu e-mail.");
      }

      case "reset-password": {
        const problem = validatePasswords(password, confirmPassword);
        if (problem) return setError(problem);

        const updated = await updatePassword(password);
        return updated ? goHome() : setError(authError || "Não foi possível atualizar a senha.");
      }

      default: {
        const authenticated = await login(email, password);
        return authenticated
          ? goHome()
          : setError(authError || "E-mail ou senha inválidos. Verifique os dados e tente novamente.");
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      await submit();
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    token,
    mode,
    switchMode,
    bind,
    errorMessage: error || authError,
    success,
    isSubmitting,
    handleSubmit,
  };
}

export type AuthFormState = ReturnType<typeof useAuthForm>;