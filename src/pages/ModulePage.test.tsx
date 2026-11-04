import { fireEvent, render, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hiraganaGroups } from "@/data/hiragana";
import { katakanaGroups } from "@/data/katakana";
import { kanjiGroups } from "@/data/kanji";
import { practicaGroups } from "@/data/pratica";
import type { LessonProgress, ModuleType } from "@/hooks/useProgress";
import { TestRouter } from "@/features/dojo/shared/test/router";
import ModulePage from "./ModulePage";

/** Progresso controlado pelo teste (o real depende de login e do banco). */
let lessons: Record<string, LessonProgress> = {};

vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({
    progress: {
      kana: { module: "kana", lessons, totalChars: 107, learnedChars: 10 },
      "japones-pratica": { module: "japones-pratica", lessons, totalChars: 0, learnedChars: 5 },
    },
    getLessonProgress: (_module: ModuleType, id: string) => lessons[id] ?? null,
    // Igual ao real: kana tudo liberado; os outros em sequência.
    isLessonUnlocked: (module: ModuleType, index: number, ids: string[] = []) =>
      module === "kana" || index === 0 || lessons[ids[index - 1]]?.completed === true,
    getModulePercent: () => 9,
  }),
}));

function done(lessonId: string, score: number): LessonProgress {
  return { lessonId, completed: true, score, lastPracticed: "2026-11-01T00:00:00.000Z", errorCount: {} };
}

function renderModule(path: string) {
  return render(
    <TestRouter path={path}>
      <Routes>
        <Route path="/home" element={<p>Trilha</p>} />
        <Route path="/module/:module" element={<ModulePage />} />
        <Route path="/module/:module/lesson/:lessonId" element={<p>Lição aberta</p>} />
      </Routes>
    </TestRouter>
  );
}

const location = () => screen.getByTestId("location").textContent;
const trail = () => within(screen.getByRole("list", { name: "Lições" }));

describe("página do módulo Kana", () => {
  beforeEach(() => {
    lessons = { "hiragana__a-row": done("hiragana__a-row", 92) };
  });

  it("cabeçalho da missão com placar, seções e a trilha do Hiragana", () => {
    renderModule("/module/kana");

    expect(screen.getByRole("heading", { level: 1, name: "Kana" })).toBeInTheDocument();
    expect(screen.getByText(/Missão 01/)).toBeInTheDocument();
    const totalLessons = hiraganaGroups.length + katakanaGroups.length + kanjiGroups.length;
    expect(screen.getByRole("group", { name: "Progresso do módulo" })).toHaveTextContent(`Lições1/${totalLessons}Caracteres10/107Progresso9%`);
    expect(screen.getByRole("link", { name: "Voltar para a Trilha" })).toHaveAttribute("href", "/home");

    // Seções: Hiragana aberta por padrão, com a contagem de cada uma.
    const sections = within(screen.getByRole("group", { name: "Seção do módulo" })).getAllByRole("button");
    expect(sections.map((button) => button.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
    expect(sections[0]).toHaveTextContent(`Hiragana1/${hiraganaGroups.length} lições`);
    expect(screen.getByRole("heading", { level: 2, name: /Hiragana/ })).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", `1 de ${hiraganaGroups.length} lições concluídas`);

    // Trilha: a 1ª concluída com nota, a 2ª é a próxima, o resto disponível (kana é todo liberado).
    const cards = trail().getAllByRole("link");
    expect(cards).toHaveLength(hiraganaGroups.length);
    expect(cards[0]).toHaveAccessibleName(hiraganaGroups[0].title);
    expect(cards[0]).toHaveAccessibleDescription("Concluída · 92%");
    expect(cards[1]).toHaveAccessibleDescription("Próxima");
    expect(cards[2]).toHaveAccessibleDescription("Disponível");
    expect(cards[0]).toHaveAttribute("href", "/module/kana/lesson/hiragana__a-row");
  });

  it("'Próxima lição' em destaque abre a lição certa", () => {
    renderModule("/module/kana");
    const panel = screen.getByRole("region", { name: "Próxima lição" });
    expect(panel).toHaveTextContent(hiraganaGroups[1].title);
    expect(within(panel).getByRole("list", { name: "Etapas da lição" })).toHaveTextContent(/Introdução.*Identificação.*Leitura/);

    fireEvent.click(within(panel).getByRole("link", { name: /Começar lição/ }));
    expect(location()).toBe(`/module/kana/lesson/hiragana__${hiraganaGroups[1].id}`);
  });

  it("trocar de seção mostra a trilha dela; a seção vem da URL (a volta da lição cai no mesmo lugar)", () => {
    renderModule("/module/kana?secao=kanji");
    expect(screen.getByRole("heading", { level: 2, name: /Kanji/ })).toBeInTheDocument();
    expect(trail().getAllByRole("link")).toHaveLength(kanjiGroups.length);

    fireEvent.click(screen.getByRole("button", { name: /Katakana/ }));
    expect(screen.getByRole("button", { name: /Katakana/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { level: 2, name: /Katakana/ })).toBeInTheDocument();
    expect(trail().getAllByRole("link")[0]).toHaveAttribute("href", `/module/kana/lesson/katakana__${katakanaGroups[0].id}`);
    // Nada de Katakana concluído: a 1ª é a próxima.
    expect(trail().getAllByRole("link")[0]).toHaveAccessibleDescription("Próxima");
  });

  it("seção toda concluída: sem 'Começar lição', com o aviso de concluída", () => {
    lessons = Object.fromEntries(kanjiGroups.map((group) => [`kanji__${group.id}`, done(`kanji__${group.id}`, 100)]));
    renderModule("/module/kana?secao=kanji");
    expect(screen.getByRole("region", { name: "Seção concluída" })).toHaveTextContent("Seção concluída!");
    expect(screen.queryByRole("link", { name: /Começar lição/ })).not.toBeInTheDocument();
  });
});

describe("outros módulos no mesmo estilo", () => {
  beforeEach(() => {
    lessons = {};
  });

  it("Japonês na Prática: liberado em sequência, bloqueadas focáveis e sem link", () => {
    renderModule("/module/japones-pratica");
    expect(screen.getByRole("heading", { level: 1, name: "Japonês na Prática" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Progresso do módulo" })).toHaveTextContent("Itens5/");

    const cards = trail().getAllByRole("link");
    expect(cards).toHaveLength(practicaGroups.length);
    expect(cards[0]).toHaveAttribute("href", `/module/japones-pratica/lesson/pratica__${practicaGroups[0].id}`);
    expect(cards[1]).toHaveAttribute("aria-disabled", "true");
    expect(cards[1]).not.toHaveAttribute("href");
    expect(cards[1]).toHaveAccessibleDescription("Bloqueada · conclua a anterior");
  });

  it("módulo bloqueado: o que vem nele e a volta para a Trilha", () => {
    renderModule("/module/numeros-familia");
    expect(screen.getByRole("heading", { level: 1, name: "Números e Família" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Missão bloqueada" })).toBeInTheDocument();
    expect(screen.getByText("Membros da família")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Ver outras missões" }));
    expect(location()).toBe("/home");
  });

  it("módulo que não existe não renderiza nada", () => {
    const { container } = renderModule("/module/nao-existe");
    expect(container.querySelector("main")).toBeNull();
  });
});
