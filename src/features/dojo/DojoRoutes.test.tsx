import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { AuthContext, type AuthContextType } from "@/contexts/auth-context-core";
import DojoRoutes from "./DojoRoutes";
import { progressionStore } from "./progression/store";
import { createMemoryStorage } from "./shared/test/memoryStorage";
import { TestRouter } from "./shared/test/router";

function renderAt(path: string) {
  render(
    <TestRouter path={path}>
      <Suspense fallback={<p>Carregando…</p>}>
        <Routes>
          <Route path="/dojo/*" element={<DojoRoutes />} />
        </Routes>
      </Suspense>
    </TestRouter>
  );
}

const location = () => screen.getByTestId("location").textContent;

describe("rotas do Dojô", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("/dojo é o hub", () => {
    renderAt("/dojo");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dojô");
    // A liga e o nível ficam no topo do hub, com o caminho para o ranking.
    expect(screen.getByRole("region", { name: "Bronze III" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver ranking/ })).toHaveAttribute("href", "/dojo/ranking");
  });

  it("/dojo/ranking abre o ranking (sob demanda) e o progresso passa a ser da conta logada", async () => {
    const auth = { token: "token-de-teste", user: { id: "conta-ana", name: "Ana", email: "ana@exemplo.com" }, loading: false } as AuthContextType;
    render(
      <AuthContext.Provider value={auth}>
        <TestRouter path="/dojo/ranking">
          <Suspense fallback={<p>Carregando…</p>}>
            <Routes>
              <Route path="/dojo/*" element={<DojoRoutes />} />
            </Routes>
          </Suspense>
        </TestRouter>
      </AuthContext.Provider>
    );
    expect(await screen.findByRole("heading", { level: 1, name: /Ranking/ })).toBeInTheDocument();
    expect(progressionStore.getSnapshot().userId).toBe("conta-ana");
    progressionStore.resetForTests();
  });

  it("/dojo/reflexos abre a Arena de Reflexos (carregada sob demanda)", async () => {
    renderAt("/dojo/reflexos");
    expect(await screen.findByRole("button", { name: /Entrar na arena/ })).toBeInTheDocument();
  });

  it("/dojo/pergaminhos abre os Pergaminhos (carregados sob demanda)", async () => {
    renderAt("/dojo/pergaminhos");
    expect(await screen.findByRole("heading", { level: 1, name: /Pergaminhos/ })).toBeInTheDocument();
  });

  it("/dojo/exame abre o Exame Chunin (carregado sob demanda)", async () => {
    renderAt("/dojo/exame");
    expect(await screen.findByRole("heading", { level: 1, name: /Exame Chunin/ })).toBeInTheDocument();
  });

  it("/dojo/selos abre os Selos (carregados sob demanda)", async () => {
    renderAt("/dojo/selos");
    expect(await screen.findByRole("heading", { level: 1, name: /Selos/ })).toBeInTheDocument();
  });

  it("/dojo/pincel abre o Pincel (carregado sob demanda)", async () => {
    renderAt("/dojo/pincel");
    expect(await screen.findByRole("heading", { level: 1, name: /Pincel/ })).toBeInTheDocument();
  });

  it("URL desconhecida volta para o hub", () => {
    renderAt("/dojo/kumite");
    expect(location()).toBe("/dojo");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dojô");
  });

  it("subcaminho desconhecido também volta para o hub", () => {
    renderAt("/dojo/reflexos/extra/coisa");
    expect(location()).toBe("/dojo");
  });
});

describe("rota antiga no App", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
    vi.unstubAllGlobals();
  });

  it("/reaction-time redireciona para /dojo/reflexos", async () => {
    window.history.replaceState({}, "", "/reaction-time");
    const auth = { token: "token-de-teste", user: null, loading: false } as AuthContextType;

    render(
      <AuthContext.Provider value={auth}>
        <App />
      </AuthContext.Provider>
    );

    expect(await screen.findByRole("button", { name: /Entrar na arena/ })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dojo/reflexos");
  });
});
