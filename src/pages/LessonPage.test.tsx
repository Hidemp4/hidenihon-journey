import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hiraganaGroups } from "@/data/hiragana";
import { practicaGroups } from "@/data/pratica";
import type { ModuleType } from "@/hooks/useProgress";
import { TestRouter } from "@/features/dojo/shared/test/router";
import LessonPage from "./LessonPage";

const completeLesson = vi.fn();

/** Progresso controlado pelo teste (o real depende de login e do banco). */
vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({
    completeLesson,
    getLessonProgress: () => null,
    // Igual ao real: kana tudo liberado; os outros só a 1ª (nada concluído aqui).
    isLessonUnlocked: (module: ModuleType, index: number) => module === "kana" || index === 0,
    error: "",
  }),
}));

const LESSON = hiraganaGroups[0];

function renderLesson(path: string) {
  return render(
    <TestRouter path={path}>
      <Routes>
        <Route path="/home" element={<p>Trilha</p>} />
        <Route path="/module/:module" element={<p>Módulo</p>} />
        <Route path="/module/:module/lesson/:lessonId" element={<LessonPage />} />
      </Routes>
    </TestRouter>
  );
}

/** Passos pequenos, cada um no seu `act`. */
function advance(ms: number, step = 100) {
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    act(() => {
      vi.advanceTimersByTime(Math.min(step, ms - elapsed));
    });
  }
}

const status = () => screen.getByRole("status");
const currentStep = () => within(screen.getByRole("list", { name: "Etapas da lição" })).getAllByRole("listitem").find((item) => item.getAttribute("aria-current") === "step");

function finishIntro() {
  for (let index = 1; index < LESSON.chars.length; index += 1) fireEvent.click(screen.getByRole("button", { name: "Próxima letra" }));
  fireEvent.click(screen.getByRole("button", { name: /Ir para exercícios/ }));
}

describe("lição (fluxo completo)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    completeLesson.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("introdução → identificação (com um erro) → leitura → concluída, gravando a nota", () => {
    renderLesson(`/module/kana/lesson/hiragana__${LESSON.id}`);

    // Cabeçalho: h1 com a lição, volta para a mesma seção, etapas com a atual marcada.
    expect(screen.getByRole("heading", { level: 1, name: LESSON.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para as lições" })).toHaveAttribute("href", "/module/kana?secao=hiragana");
    expect(currentStep()).toHaveTextContent("Introdução");

    // Introdução: uma letra por vez.
    expect(screen.getByRole("heading", { level: 2, name: "Conheça cada caractere" })).toBeInTheDocument();
    expect(screen.getByText(`Letra 1 de ${LESSON.chars.length}`)).toBeInTheDocument();
    expect(screen.getByText(LESSON.chars[0].romaji)).toBeInTheDocument();
    finishIntro();

    // Identificação: o título da etapa recebe o foco; cada escolha é anunciada.
    const idHeading = screen.getByRole("heading", { level: 2, name: "Exercício de identificação" });
    expect(idHeading).toHaveFocus();
    expect(currentStep()).toHaveTextContent("Identificação");
    expect(screen.getByRole("list", { name: "Etapas da lição" })).toHaveTextContent("(feita)");
    expect(screen.getByRole("timer")).toHaveAccessibleName("Tempo restante: 15 segundos");

    const rows = LESSON.chars.slice(0, 5);
    rows.forEach((char, index) => {
      const row = screen.getByRole("group", { name: `Linha ${index + 1}: ${char.romaji}` });
      const options = within(row).getAllByRole("button");
      // Botões de pelo menos 44px (h-11 w-11) para o dedo.
      expect(options[0]).toHaveClass("h-11", "w-11");
      if (index === 1) {
        const wrong = options.find((button) => button.textContent !== char.char);
        if (!wrong) throw new Error("sem alternativa errada");
        fireEvent.click(wrong);
        expect(status()).toHaveTextContent(`${char.romaji}: errado. A certa era ${char.char}.`);
      } else {
        fireEvent.click(within(row).getByRole("button", { name: `Escolher ${char.char}` }));
        expect(status()).toHaveTextContent(`${char.romaji}: certo.`);
      }
      expect(options.every((button) => button.hasAttribute("disabled"))).toBe(true);
    });

    advance(400);
    expect(status()).toHaveTextContent(`Resultado: ${rows.length - 1} de ${rows.length} acertos.`);
    expect(screen.getByText("Acertos 4/5")).toBeInTheDocument();
    advance(1_200);

    // Leitura: palavra → significado → leitura, anunciados quando aparecem.
    expect(screen.getByRole("heading", { level: 2, name: "Exercício de leitura" })).toHaveFocus();
    LESSON.readingWords.forEach((word, index) => {
      expect(screen.getByText(`Palavra ${index + 1} de ${LESSON.readingWords.length}`)).toBeInTheDocument();
      expect(status()).toHaveTextContent("");
      advance(1_000);
      expect(status()).toHaveTextContent(`Significado: ${word.meaning}.`);
      advance(3_000);
      expect(status()).toHaveTextContent(`Leitura: ${word.romaji}.`);
      const last = index === LESSON.readingWords.length - 1;
      fireEvent.click(screen.getByRole("button", { name: last ? /Concluir lição/ : /Próxima palavra/ }));
      if (!last) advance(500);
    });

    // A nota final é a média das duas etapas; o erro vai para o mapa de erros.
    expect(completeLesson).toHaveBeenCalledTimes(1);
    expect(completeLesson).toHaveBeenCalledWith("kana", `hiragana__${LESSON.id}`, 90, LESSON.chars.length, { [rows[1].char]: 1 });
    advance(500);

    expect(screen.getByRole("heading", { level: 2, name: "Lição concluída!" })).toHaveFocus();
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Etapas da lição" })).toHaveTextContent("Introdução(feita)Identificação(feita)Leitura(feita)");
    expect(screen.getByRole("link", { name: /Ver próximas lições/ })).toHaveAttribute("href", "/module/kana?secao=hiragana");
    expect(screen.getByRole("link", { name: /Voltar para a Trilha/ })).toHaveAttribute("href", "/home");
  });

  it("tempo esgotado na identificação: as que faltaram contam como erro, e o aviso é anunciado", () => {
    renderLesson(`/module/kana/lesson/hiragana__${LESSON.id}`);
    finishIntro();
    advance(15_000, 500);
    expect(status()).toHaveTextContent("Tempo esgotado. Resultado: 0 de 5 acertos.");
    expect(screen.getByText("Acertos 0/5")).toBeInTheDocument();
  });

  it("Japonês na Prática: itens em vez de letras; lição ainda bloqueada volta para o módulo", () => {
    renderLesson(`/module/japones-pratica/lesson/pratica__${practicaGroups[0].id}`);
    expect(screen.getByText(`Item 1 de ${practicaGroups[0].chars.length}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo item" })).toBeInTheDocument();
    cleanup();

    renderLesson(`/module/japones-pratica/lesson/pratica__${practicaGroups[2].id}`);
    expect(screen.getByTestId("location")).toHaveTextContent("/module/japones-pratica");
  });
});
