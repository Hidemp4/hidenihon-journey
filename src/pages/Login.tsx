import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  KeyRound,
  Leaf,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context-core";

type AuthMode = "login" | "signup" | "forgot-password" | "reset-password";

function getInitialMode(searchParams: URLSearchParams): AuthMode {
  return searchParams.get("mode") === "reset-password" ? "reset-password" : "login";
}

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 120;
const INPUT_CLASS = "w-full rounded-2xl border border-journey-wood/15 bg-white/70 px-4 py-3.5 text-sm font-semibold text-journey-ink outline-none transition placeholder:text-journey-ink/35 focus:border-journey-orange focus:bg-white focus:ring-4 focus:ring-journey-orange/10";

function getTitle(mode: AuthMode) {
  if (mode === "signup") return "Criar sua conta";
  if (mode === "forgot-password") return "Recuperar senha";
  if (mode === "reset-password") return "Nova senha";
  return "Entrar na jornada";
}

function getModeContent(mode: AuthMode) {
  if (mode === "signup") {
    return {
      eyebrow: "Novo integrante",
      title: "Comece sua jornada",
      description: "Crie seu perfil para salvar cada missão concluída e acompanhar sua evolução.",
      scene: "Cena 01 · Registro ninja",
    };
  }
  if (mode === "forgot-password") {
    return {
      eyebrow: "Recuperar acesso",
      title: "Retome sua jornada",
      description: "Informe seu e-mail e enviaremos um caminho seguro para você voltar à vila.",
      scene: "Cena 01 · Missão de resgate",
    };
  }
  if (mode === "reset-password") {
    return {
      eyebrow: "Proteja sua conta",
      title: "Crie uma nova senha",
      description: "Escolha uma senha forte para proteger seu progresso e continuar treinando.",
      scene: "Cena 01 · Novo selo",
    };
  }
  return {
    eyebrow: "Bem-vindo de volta",
    title: "Continue sua jornada",
    description: "Entre na vila e retome seus treinamentos de onde parou.",
    scene: "Cena 01 · Portões da vila",
  };
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
  const reduceMotion = useReducedMotion();
  const modeContent = getModeContent(mode);

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
    <main className="journey-home min-h-screen bg-journey-surface font-ui text-journey-ink lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(460px,.95fr)]">
      <section className="relative isolate min-h-[300px] overflow-hidden bg-journey-forest text-white lg:min-h-screen">
        <img
          src="/midoriyahome-card.webp"
          alt="Herói diante de uma paisagem verde, pronto para iniciar seu treinamento"
          className="absolute inset-0 -z-30 h-full w-full object-cover object-top lg:object-center"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(0deg,hsl(var(--journey-forest-deep)/.98)_0%,hsl(var(--journey-forest-deep)/.42)_62%,hsl(var(--journey-forest-deep)/.18)),linear-gradient(90deg,hsl(var(--journey-forest-deep)/.55),transparent_70%)]" />
        <div className="journey-leaf-pattern absolute inset-0 -z-10 opacity-10" />

        <div className="flex min-h-[300px] flex-col justify-between px-5 py-6 sm:px-8 lg:min-h-screen lg:px-12 lg:py-10 xl:px-16">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-journey-forest-deep/55 px-4 text-xs font-extrabold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-journey-forest-deep/75 active:scale-95"
              aria-label="Voltar para a página inicial"
            >
              <ChevronLeft size={17} />
              <span>Voltar</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/30 bg-journey-orange shadow-[0_0_0_4px_hsl(var(--journey-forest-deep)/.35)]">
                <Leaf size={20} strokeWidth={2.6} />
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-display text-base font-black leading-none tracking-[-0.04em]">HideNihon</p>
                <p className="mt-1 font-jp text-[9px] font-bold tracking-[0.2em] text-journey-sand">木ノ葉の旅</p>
              </div>
            </div>
          </div>

          <motion.div
            key={mode}
            initial={reduceMotion ? undefined : { opacity: 0, y: 22 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="max-w-xl pb-2 lg:pb-10"
          >
            <p className="hidden items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-journey-gold lg:flex">
              <Sparkles size={15} /> {modeContent.scene}
            </p>
            <h1 className="mt-3 font-display text-4xl font-black uppercase leading-[0.92] tracking-[-0.055em] sm:text-5xl lg:mt-5 lg:text-7xl">
              {modeContent.title}
            </h1>
            <p className="mt-4 max-w-lg text-sm font-semibold leading-6 text-white/80 sm:text-base lg:mt-6 lg:leading-7">
              {modeContent.description}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="relative flex min-h-[calc(100vh-300px)] items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:min-h-screen lg:px-12 lg:py-14">
        <div className="absolute -right-24 top-8 font-jp text-[15rem] font-black leading-none text-journey-forest/[0.035]" aria-hidden="true">忍</div>
        <motion.div
          key={`form-${mode}`}
          initial={reduceMotion ? undefined : { opacity: 0, x: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative w-full max-w-lg"
        >
          <div className="mb-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-journey-orange/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-journey-orange">
              <ShieldCheck size={14} /> {modeContent.eyebrow}
            </span>
            <h2 className="mt-4 font-display text-3xl font-black tracking-[-0.045em] sm:text-4xl">{getTitle(mode)}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-journey-ink/55">
              Seu progresso fica protegido e disponível em qualquer dispositivo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="scroll-panel p-5 sm:p-7">
            <div className="space-y-4">
              {mode === "signup" && (
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-journey-wood/70">Nome</span>
                  <input
                    value={name}
                    onChange={event => setName(event.target.value)}
                    type="text"
                    required
                    autoComplete="name"
                    maxLength={MAX_NAME_LENGTH}
                    className={INPUT_CLASS}
                    placeholder="Seu nome"
                  />
                </label>
              )}

              {mode !== "reset-password" && (
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-journey-wood/70">E-mail</span>
                  <input
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    className={INPUT_CLASS}
                    placeholder="seu@email.com"
                  />
                </label>
              )}

              {mode !== "forgot-password" && (
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-journey-wood/70">Senha</span>
                  <input
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    type="password"
                    required
                    minLength={mode === "login" ? 1 : MIN_PASSWORD_LENGTH}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className={INPUT_CLASS}
                    placeholder={mode === "reset-password" ? "Digite a nova senha" : "Digite sua senha"}
                  />
                </label>
              )}

              {(mode === "signup" || mode === "reset-password") && (
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-journey-wood/70">
                    {mode === "signup" ? "Confirmar senha" : "Confirmar nova senha"}
                  </span>
                  <input
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    className={INPUT_CLASS}
                    placeholder={mode === "signup" ? "Repita sua senha" : "Repita a nova senha"}
                  />
                </label>
              )}
            </div>

            {success && (
              <p className="mt-4 rounded-2xl border border-emerald-700/10 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
                {success}
              </p>
            )}

            {(error || authError) && (
              <p className="mt-4 rounded-2xl border border-red-700/10 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
                {error || authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-journey-orange px-5 text-sm font-black text-white shadow-[0_14px_30px_hsl(var(--journey-orange)/.28)] transition hover:-translate-y-0.5 hover:bg-journey-orange-hover disabled:cursor-wait disabled:opacity-65 active:scale-[0.98]"
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
              {!isSubmitting && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
            </button>

            <div className="mt-4 border-t border-journey-wood/10 pt-4">
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => switchMode("forgot-password")}
                  className="w-full rounded-xl py-2 text-xs font-black text-journey-wood/65 transition hover:bg-white/45 hover:text-journey-orange active:scale-[0.98]"
                >
                  Esqueci minha senha
                </button>
              )}

              {mode !== "reset-password" && (
                <button
                  type="button"
                  onClick={() => switchMode(mode === "signup" ? "login" : "signup")}
                  className="mt-1 w-full rounded-2xl border border-journey-wood/15 bg-white/55 py-3 text-sm font-black text-journey-ink transition hover:border-journey-orange/30 hover:bg-white active:scale-[0.98]"
                >
                  {mode === "signup" ? "Já tenho uma conta" : "Criar nova conta"}
                </button>
              )}

              {mode === "forgot-password" && (
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="mt-3 w-full rounded-xl py-2 text-xs font-black text-journey-wood/65 transition hover:bg-white/45 hover:text-journey-orange active:scale-[0.98]"
                >
                  Voltar para login
                </button>
              )}
            </div>
          </form>

          <p className="mt-6 text-center font-jp text-[10px] font-bold tracking-[0.14em] text-journey-wood/55">
            一歩ずつ、夢に近づく
          </p>
        </motion.div>
      </section>
    </main>
  );
}
