import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import DojoHubPage from "./DojoHubPage";
import { ProgressionSync } from "./progression/components/ProgressionSync";
import { RANKING_SLUG } from "./progression/routes";
import { DOJO_ACTIVITIES, type ActivityId } from "./registry";
import { DOJO_HUB_ROUTE } from "./shared/constants";

/** Cada atividade vira um chunk próprio: abrir o hub não baixa os cinco jogos. */
const ACTIVITY_PAGES: Readonly<Partial<Record<ActivityId, LazyExoticComponent<ComponentType>>>> = {
  scrolls: lazy(() => import("./activities/scrolls/ScrollsPage")),
  reflexes: lazy(() => import("./activities/reflexes/ReflexesPage")),
  exam: lazy(() => import("./activities/exam/ExamPage")),
  seals: lazy(() => import("./activities/seals/SealsPage")),
  brush: lazy(() => import("./activities/brush/BrushPage")),
};

const RankingPage = lazy(() => import("./progression/RankingPage"));

/**
 * Rotas descendentes de `/dojo/*`. Atividades "em breve" (ou URLs desconhecidas)
 * caem no hub em vez de numa tela em branco.
 */
export default function DojoRoutes() {
  return (
    <>
      {/* XP e troféus seguem a conta logada (cada conta tem o seu progresso). */}
      <ProgressionSync />
      <Routes>
        <Route index element={<DojoHubPage />} />
        <Route path={RANKING_SLUG} element={<RankingPage />} />
        {DOJO_ACTIVITIES.map((activity) => {
          const Page = ACTIVITY_PAGES[activity.id];
          if (activity.status !== "ready" || !Page) return null;
          return <Route key={activity.id} path={activity.slug} element={<Page />} />;
        })}
        <Route path="*" element={<Navigate to={DOJO_HUB_ROUTE} replace />} />
      </Routes>
    </>
  );
}
