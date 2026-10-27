import { KeyRound, LockKeyhole, Mail, UserPlus, type LucideIcon } from "lucide-react";

export type AuthMode = "login" | "signup" | "forgot-password" | "reset-password";

type ModeContent = {
  scene: string;
  title: string;
  description: string;
  eyebrow: string;
  formTitle: string;
  submitLabel: string;
  SubmitIcon: LucideIcon;
};

export const MODE_CONTENT: Record<AuthMode, ModeContent> = {
  login: {
    scene: "Cena 01 · De volta à vila",
    title: "Continue sua jornada",
    description: "Retome seus treinamentos de onde parou.",
    eyebrow: "Bem-vindo de volta",
    formTitle: "Entrar na jornada",
    submitLabel: "Entrar",
    SubmitIcon: LockKeyhole,
  },
  signup: {
    scene: "Cena 01 · Registro ninja",
    title: "Comece sua jornada",
    description: "Crie seu perfil para salvar cada missão concluída e acompanhar sua evolução.",
    eyebrow: "Novo integrante",
    formTitle: "Criar sua conta",
    submitLabel: "Criar conta",
    SubmitIcon: UserPlus,
  },
  "forgot-password": {
    scene: "Cena 01 · Missão de resgate",
    title: "Retome sua jornada",
    description: "Informe seu e-mail e enviaremos um caminho seguro para você voltar à vila.",
    eyebrow: "Recuperar acesso",
    formTitle: "Recuperar senha",
    submitLabel: "Enviar link",
    SubmitIcon: Mail,
  },
  "reset-password": {
    scene: "Cena 01 · Novo selo",
    title: "Crie uma nova senha",
    description: "Escolha uma senha forte para proteger seu progresso e continuar treinando.",
    eyebrow: "Proteja sua conta",
    formTitle: "Nova senha",
    submitLabel: "Salvar nova senha",
    SubmitIcon: KeyRound,
  },
};