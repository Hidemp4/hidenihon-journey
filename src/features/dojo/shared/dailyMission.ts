import type { ActivityId } from "../registry";
import { createRng } from "./components/arena/rng";
import { shuffle } from "./random";

export interface MissionTask {
  activity: ActivityId;
  target: number;
  /** Texto da tarefa ("Avalie 10 pergaminhos"). */
  label: string;
}

/** Uma tarefa possível por atividade, na ordem dos cards do hub. Metas pensadas para ~5 minutos cada. */
export const MISSION_POOL: readonly MissionTask[] = [
  { activity: "scrolls", target: 10, label: "Avalie 10 pergaminhos" },
  { activity: "reflexes", target: 15, label: "Responda 15 kana na Arena" },
  { activity: "exam", target: 10, label: "Responda 10 perguntas no Exame" },
  { activity: "seals", target: 6, label: "Forme 6 pares nos Selos" },
  { activity: "brush", target: 3, label: "Escreva 3 caracteres no Pincel" },
];

export const MISSION_SIZE = 3;

/**
 * Missão do dia: 3 tarefas de atividades diferentes, sorteadas pela data local. O mesmo dia dá
 * sempre a mesma missão (em qualquer aba ou aparelho com o mesmo fuso), e muda à meia-noite.
 */
export function dailyMission(day: number): MissionTask[] {
  const picked = new Set(shuffle(MISSION_POOL, createRng(day)).slice(0, MISSION_SIZE));
  return MISSION_POOL.filter((task) => picked.has(task));
}

export interface MissionTaskProgress {
  task: MissionTask;
  /** Já feito hoje, limitado à meta. */
  done: number;
  complete: boolean;
}

export interface MissionProgress {
  tasks: MissionTaskProgress[];
  completed: number;
  complete: boolean;
}

export function missionProgress(tasks: readonly MissionTask[], counts: Partial<Record<ActivityId, number>>): MissionProgress {
  const progress = tasks.map((task) => {
    const done = Math.min(task.target, counts[task.activity] ?? 0);
    return { task, done, complete: done >= task.target };
  });
  const completed = progress.filter((item) => item.complete).length;
  return { tasks: progress, completed, complete: progress.length > 0 && completed === progress.length };
}
