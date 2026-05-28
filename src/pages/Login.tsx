import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ChevronLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { t, FONT_JP, FONT_SANS } from "./Theme";

export default function Login() {
  const navigate = useNavigate();
  const { token, login } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (token) return <Navigate to="/home" replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const authenticated = await login(email, password);
    setIsSubmitting(false);

    if (!authenticated) {
      setError("E-mail ou senha inválidos. Verifique os dados e tente novamente.");
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
              <h1 className="text-3xl font-bold tracking-tight text-black">Entrar na jornada</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[28px] border border-black/5 bg-white p-5 shadow-xl shadow-black/5">
            <div className="mb-5 rounded-2xl bg-black px-4 py-3 text-white">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={17} />
                Login local
              </div>
              <p className="text-xs text-white/70">
                Use as credenciais configuradas para acessar seu progresso neste navegador.
              </p>
            </div>

            <div className="space-y-4">
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

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-black/70">Senha</span>
                <input
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none transition focus:border-[#df2531] focus:bg-white focus:ring-4 focus:ring-[#df2531]/10"
                  placeholder="Digite sua senha"
                />
              </label>
            </div>

            {error && (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/10 transition active:scale-[0.98]"
              style={{ background: t.accent }}
            >
              <LockKeyhole size={17} />
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

        </div>

        <p className="text-center text-xs font-medium text-black/45">
          Esta autenticação é local para estudo. Não use uma senha real ou sensível aqui.
        </p>
      </div>
    </div>
  );
}
