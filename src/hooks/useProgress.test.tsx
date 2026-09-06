import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProgressProvider, useProgress, type AllProgress } from "./useProgress";

const authState = vi.hoisted(() => ({ user: { id: "user-1" } as { id: string } | null }));
const progressDb = vi.hoisted(() => ({
  loadUserProgress: vi.fn(),
  saveUserProgress: vi.fn(),
}));

vi.mock("@/contexts/auth-context-core", () => ({
  useAuthContext: () => ({ user: authState.user }),
}));

vi.mock("@/lib/progressDb", () => progressDb);

const wrapper = ({ children }: { children: React.ReactNode }) => <ProgressProvider>{children}</ProgressProvider>;

describe("useProgress", () => {
  beforeEach(() => {
    authState.user = { id: "user-1" };
    progressDb.loadUserProgress.mockReset();
    progressDb.saveUserProgress.mockReset();
    progressDb.loadUserProgress.mockResolvedValue(null);
    progressDb.saveUserProgress.mockResolvedValue(undefined);
  });

  it("accumulates lesson error counts instead of replacing them", async () => {
    const { result } = renderHook(() => useProgress(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.completeLesson("kana", "hiragana-a", 60, 5, { あ: 1, い: 2 });
    });

    act(() => {
      result.current.completeLesson("kana", "hiragana-a", 90, 5, { あ: 2, う: 1 });
    });

    expect(result.current.getLessonProgress("kana", "hiragana-a")?.errorCount).toEqual({
      あ: 3,
      い: 2,
      う: 1,
    });
    expect(result.current.getLessonProgress("kana", "hiragana-a")?.score).toBe(90);
    expect(result.current.getErrorChars("kana")).toEqual(["あ", "い"]);
  });

  it("loads saved progress for the authenticated user", async () => {
    const savedProgress: Partial<AllProgress> = {
      kana: {
        module: "kana",
        totalChars: 107,
        learnedChars: 5,
        lessons: {
          "hiragana-a": {
            lessonId: "hiragana-a",
            completed: true,
            score: 100,
            lastPracticed: "2026-01-01T00:00:00.000Z",
            errorCount: {},
          },
        },
      },
    };
    progressDb.loadUserProgress.mockResolvedValue(savedProgress);

    const { result } = renderHook(() => useProgress(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(progressDb.loadUserProgress).toHaveBeenCalledWith("user-1");
    expect(result.current.getModulePercent("kana")).toBe(5);
    expect(result.current.getLessonProgress("kana", "hiragana-a")?.completed).toBe(true);
  });

  it("exposes save errors so the UI can warn the user", async () => {
    progressDb.saveUserProgress.mockRejectedValue(new Error("Falha ao salvar progresso."));
    const { result } = renderHook(() => useProgress(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.completeLesson("kana", "hiragana-a", 100, 5, {});
    });

    await waitFor(() => expect(result.current.error).toBe("Falha ao salvar progresso."));
  });
});
