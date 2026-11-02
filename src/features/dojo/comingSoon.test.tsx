import { fireEvent, render, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DojoHubPage from "./DojoHubPage";
import DojoRoutes from "./DojoRoutes";
import { createMemoryStorage } from "./shared/test/memoryStorage";
import { TestRouter } from "./shared/test/router";

// Desde a Fase 4 nenhuma atividade está "em breve". O estado continua suportado (para atividades
// futuras), então aqui o Pincel volta a ser "em breve" só neste arquivo, para cobrir o caminho.
vi.mock("./registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./registry")>();
  return {
    ...actual,
    DOJO_ACTIVITIES: actual.DOJO_ACTIVITIES.map((activity) =>
      activity.id === "brush" ? { ...activity, status: "coming-soon" as const, getBadge: actual.comingSoonBadge } : activity
    ),
  };
});

const location = () => screen.getByTestId("location").textContent;

describe("atividade 'em breve'", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("card fica desativado, mas focável, e não navega", () => {
    render(
      <TestRouter path="/dojo">
        <Routes>
          <Route path="/dojo" element={<DojoHubPage />} />
        </Routes>
      </TestRouter>
    );

    const card = screen.getByRole("link", { name: "Pincel 筆" });
    expect(card).toHaveAttribute("aria-disabled", "true");
    expect(card).not.toHaveAttribute("href");
    expect(card).toHaveAttribute("tabindex", "0");
    expect(within(card).getByText("Em breve")).toBeInTheDocument();

    fireEvent.click(card);
    fireEvent.keyDown(card, { key: "Enter" });
    expect(location()).toMatch(/^\/dojo$/);
  });

  it("a rota dela volta para o hub", () => {
    render(
      <TestRouter path="/dojo/pincel">
        <Routes>
          <Route path="/dojo/*" element={<DojoRoutes />} />
        </Routes>
      </TestRouter>
    );
    expect(location()).toBe("/dojo");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dojô");
  });
});
