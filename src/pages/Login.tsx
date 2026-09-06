import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, KeyRound, LockKeyhole, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context-core";
import { t, FONT_JP, FONT_SANS } from "./Theme";

type AuthMode = "login" | "signup" | "forgot-password" | "reset-password";

function getInitialMode(searchParams: URLSearchParams): AuthMode {
  return searchParams.get("mode") === "reset-password" ? "reset-password" : "login";
}

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 120;

function getTitle(mode: AuthMode) {
  if (mode === "signup") return "Criar sua conta";
  if (mode === "forgot-password") return "Recuperar senha";
  if (mode === "reset-password") return "Nova senha";
  return "Entrar na jornada";
}

function validateStrongPassword(password: string) {
  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;

  for (const character of password) {
    if (character >= "a" && character <= "z") hasLower = true;
    else if (character >= "A" && character <= "Z") hasUpper = true;
    else if (character >= "0" && character <= "9") hasDigit = true;
  }

  if (password.length < MIN_PASSWORD_LENGTH) return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (!hasLower || !hasUpper || !hasDigit) return "A senha deve ter letra maiúscula, letra minúscula e número.";
  return "";
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, login, signUp, requestPasswordReset, updatePassword, hasRecoverySession, authError } = useAuthContext();
  const [mode, setMode] = useState<AuthMode>(() => getInitialMode(searchParams));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== "reset-password") return;

    let isMounted = true;
    hasRecoverySession().then(hasSession => {
      if (!isMounted || hasSession) return;
      setMode("forgot-password");
      setError("Link de recuperação inválido ou expirado. Peça um novo e-mail para redefinir sua senha.");
    });

    return () => {
      isMounted = false;
    };
  }, [hasRecoverySession, mode]);

  if (token && mode !== "reset-password") return <Navigate to="/home" replace />;

  const switchMode = (nextMode: AuthMode) => {
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
    setMode(nextMode);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    if (mode === "signup") {
      if (name.trim().length > MAX_NAME_LENGTH) {
        setError(`O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`);
        setIsSubmitting(false);
        return;
      }

      const passwordError = validateStrongPassword(password);
      if (passwordError) {
        setError(passwordError);
        setIsSubmitting(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("As senhas não conferem.");
        setIsSubmitting(false);
        return;
      }

      const result = await signUp(email, password, name);
      setIsSubmitting(false);

      if (result === "ok") {
        navigate("/home", { replace: true });
        return;
      }

      if (result === "confirm-email") {
        setError("Conta criada. Confirme seu e-mail antes de entrar.");
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        return;
      }

      setError("");
      return;
    }

    if (mode === "forgot-password") {
      const sent = await requestPasswordReset(email);
      setIsSubmitting(false);

      if (!sent) {
        setError(authError || "Não foi possível enviar o e-mail de recuperação.");
        return;
      }

      setSuccess("Enviamos um link para redefinir sua senha. Verifique seu e-mail.");
      return;
    }

    if (mode === "reset-password") {
      const passwordError = validateStrongPassword(password);
      if (passwordError) {
        setIsSubmitting(false);
        setError(passwordError);
        return;
      }

      if (password !== confirmPassword) {
        setIsSubmitting(false);
        setError("As senhas não conferem.");
        return;
      }

      const updated = await updatePassword(password);
      setIsSubmitting(false);

      if (!updated) {
        setError(authError || "Não foi possível atualizar a senha.");
        return;
      }

      navigate("/home", { replace: true });
      return;
    }

    const authenticated = await login(email, password);
    setIsSubmitting(false);

    if (!authenticated) {
      setError(authError || "E-mail ou senha inválidos. Verifique os dados e tente novamente.");
      return;
    }

    navigate("/home", { replace: true });
  };

  return (
    <div
      className="min-h-screen px-5 py-6"
      style={{
        background: "radial-gradient(circle at top right, rgba(223,37,49,0.18), transparent 32%), #f6f2ee",
        fontFamily: FONT_SANS,
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-md flex-col justify-between">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm transition active:scale-95"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="my-8">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: t.accent }}>
                <span style={{ fontFamily: FONT_JP }} className="text-3xl text-white">日</span>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: t.accent }}>HideNihon</p>
                <h1 className="text-3xl font-bold tracking-tight text-black">{getTitle(mode)}</h1>
              </div>
            </div>

          <form onSubmit={handleSubmit} className="rounded-[28px] border border-black/5 bg-white p-5 shadow-xl shadow-black/5">
            <div className="mb-5 rounded-2xl bg-black px-4 py-3 text-white">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={17} />
                Progresso individual
              </div>
              <p className="text-xs text-white/70">
                Entre com sua conta para salvar seu progresso no banco, em qualquer dispositivo.
              </p>
            </div>

            <div className="space-y-4">
              {mode === "signup" && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-black/70">Nome</span>
                  <input
                    value={name}
                    onChange={event => setName(event.target.value)}
                    type="text"
                    required
                    autoComplete="name"
                    maxLength={MAX_NAME_LENGTH}
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none transition focus:border-[#df2531] focus:bg-white focus:ring-4 focus:ring-[#df2531]/10"
                    placeholder="Seu nome"
                  />
                </label>
              )}

              {mode !== "reset-password" && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-black/70">E-mail</span>
                  <input
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none transition focus:border-[#df2531] focus:bg-white focus:ring-4 focus:ring-[#df2531]/10"
                    placeholder="seu@email.com"
                  />
                </label>
              )}

              {mode !== "forgot-password" && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-black/70">Senha</span>
                  <input
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    type="password"
                    required
                    minLength={mode === "login" ? 1 : MIN_PASSWORD_LENGTH}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none transition focus:border-[#df2531] focus:bg-white focus:ring-4 focus:ring-[#df2531]/10"
                    placeholder={mode === "reset-password" ? "Digite a nova senha" : "Digite sua senha"}
                  />
                </label>
              )}

              {(mode === "signup" || mode === "reset-password") && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-black/70">
                    {mode === "signup" ? "Confirmar senha" : "Confirmar nova senha"}
                  </span>
                  <input
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none transition focus:border-[#df2531] focus:bg-white focus:ring-4 focus:ring-[#df2531]/10"
                    placeholder={mode === "signup" ? "Repita sua senha" : "Repita a nova senha"}
                  />
                </label>
              )}
            </div>

            {success && (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {success}
              </p>
            )}

            {(error || authError) && (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error || authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/10 transition active:scale-[0.98]"
              style={{ background: t.accent }}
            >
              {mode === "signup" && <UserPlus size={17} />}
              {mode === "login" && <LockKeyhole size={17} />}
              {mode === "forgot-password" && <Mail size={17} />}
              {mode === "reset-password" && <KeyRound size={17} />}
              {isSubmitting
                ? "Aguarde..."
                : mode === "signup"
                  ? "Criar conta"
                  : mode === "forgot-password"
                    ? "Enviar link"
                    : mode === "reset-password"
                      ? "Salvar nova senha"
                      : "Entrar"}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => switchMode("forgot-password")}
                className="mt-3 w-full rounded-2xl border border-black/10 bg-white py-3 text-sm font-bold text-black transition active:scale-[0.98]"
              >
                Esqueci minha senha
              </button>
            )}

            {mode !== "reset-password" && (
              <button
                type="button"
                onClick={() => switchMode(mode === "signup" ? "login" : "signup")}
                className="mt-3 w-full rounded-2xl border border-black/10 bg-white py-3 text-sm font-bold text-black transition active:scale-[0.98]"
              >
                {mode === "signup" ? "Já tenho conta" : "Criar nova conta"}
              </button>
            )}

            {mode === "forgot-password" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="mt-3 w-full rounded-2xl border border-black/10 bg-white py-3 text-sm font-bold text-black transition active:scale-[0.98]"
              >
                Voltar para login
              </button>
            )}
          </form>

        </div>

        <p className="text-center text-xs font-semibold text-black/65">
          O progresso agora é salvo por usuário no banco de dados.
        </p>
      </div>
    </div>
  );
}
