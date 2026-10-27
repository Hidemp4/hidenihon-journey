import { ArrowRight } from "lucide-react";
import type { AuthFormState } from "@/hooks/useAuthForm";
import { AuthField } from "./AuthField";
import { MODE_CONTENT } from "./config";
import { MIN_PASSWORD_LENGTH, MAX_NAME_LENGTH } from "./validation";

const GHOST_BUTTON =
  "w-full rounded-xl py-2 text-xs font-black text-journey-wood/65 transition hover:bg-white/45 hover:text-journey-orange active:scale-[0.98]";

export function AuthForm({ form }: { form: AuthFormState }) {
  const { mode, switchMode, bind, errorMessage, success, isSubmitting, handleSubmit } = form;
  const { submitLabel, SubmitIcon } = MODE_CONTENT[mode];

  const isSignup = mode === "signup";
  const isLogin = mode === "login";
  const isForgot = mode === "forgot-password";
  const isReset = mode === "reset-password";

  return (
    <form onSubmit={handleSubmit} className="scroll-panel p-5 sm:p-7">
      <div className="space-y-4">
        {isSignup && (
          <AuthField label="Nome" type="text" autoComplete="name" maxLength={MAX_NAME_LENGTH} placeholder="Seu nome" {...bind("name")} />
        )}

        {!isReset && (
          <AuthField label="E-mail" type="email" autoComplete="email" placeholder="seu@email.com" {...bind("email")} />
        )}

        {!isForgot && (
          <AuthField
            label="Senha"
            type="password"
            minLength={isLogin ? 1 : MIN_PASSWORD_LENGTH}
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder={isReset ? "Digite a nova senha" : "Digite sua senha"}
            {...bind("password")}
          />
        )}

        {(isSignup || isReset) && (
          <AuthField
            label={isSignup ? "Confirmar senha" : "Confirmar nova senha"}
            type="password"
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            placeholder={isSignup ? "Repita sua senha" : "Repita a nova senha"}
            {...bind("confirmPassword")}
          />
        )}
      </div>

      {success && (
        <p className="mt-4 rounded-2xl border border-emerald-700/10 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
          {success}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-2xl border border-red-700/10 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="group mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-journey-orange px-5 text-sm font-black text-white shadow-[0_14px_30px_hsl(var(--journey-orange)/.28)] transition hover:-translate-y-0.5 hover:bg-journey-orange-hover disabled:cursor-wait disabled:opacity-65 active:scale-[0.98]"
      >
        <SubmitIcon size={17} />
        {isSubmitting ? "Aguarde..." : submitLabel}
        {!isSubmitting && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
      </button>

      <div className="mt-4 border-t border-journey-wood/10 pt-4">
        {isLogin && (
          <button type="button" onClick={() => switchMode("forgot-password")} className={GHOST_BUTTON}>
            Esqueci minha senha
          </button>
        )}

        {!isReset && (
          <button
            type="button"
            onClick={() => switchMode(isSignup ? "login" : "signup")}
            className="mt-1 w-full rounded-2xl border border-journey-wood/15 bg-white/55 py-3 text-sm font-black text-journey-ink transition hover:border-journey-orange/30 hover:bg-white active:scale-[0.98]"
          >
            {isSignup ? "Já tenho uma conta" : "Criar nova conta"}
          </button>
        )}

        {isForgot && (
          <button type="button" onClick={() => switchMode("login")} className={`${GHOST_BUTTON} mt-3`}>
            Voltar para login
          </button>
        )}
      </div>
    </form>
  );
}