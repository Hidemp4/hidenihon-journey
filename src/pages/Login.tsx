import { motion, useReducedMotion } from "framer-motion";
import { Navigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuthForm } from "@/hooks/useAuthForm";
import { AuthForm } from "@/components/login/AuthForm";
import { LoginHero } from "@/components/login/LoginHero";
import { MODE_CONTENT } from "@/components/login/config";

export default function Login() {
  const form = useAuthForm();
  const reduceMotion = useReducedMotion();
  const { mode, token } = form;

  if (token && mode !== "reset-password") return <Navigate to="/home" replace />;

  const { eyebrow, formTitle } = MODE_CONTENT[mode];

  return (
    <main className="journey-home min-h-screen bg-journey-surface font-ui text-journey-ink lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(460px,.95fr)]">
      <LoginHero mode={mode} />

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
              <ShieldCheck size={14} /> {eyebrow}
            </span>
            <h2 className="mt-4 font-display text-3xl font-black tracking-[-0.045em] sm:text-4xl">{formTitle}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-journey-ink/55">
              Seu progresso fica protegido e disponível em qualquer dispositivo.
            </p>
          </div>

          <AuthForm form={form} />

          <p className="mt-6 text-center font-jp text-[10px] font-bold tracking-[0.14em] text-journey-wood/55">
            一歩ずつ、夢に近づく
          </p>
        </motion.div>
      </section>
    </main>
  );
}