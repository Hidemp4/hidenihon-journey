import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadAudioEnabled,
  loadLocalDojoSessions,
  loadLocalSettings,
  sanitizeSettings,
  saveAudioEnabled,
  saveLocalDojoSession,
  saveLocalSettings,
} from "./localRepository";
import { DEFAULT_DOJO_SETTINGS } from "./constants";
import type { DojoAttempt, DojoSession } from "./types";

function createMemoryStorage(options: { failOnSet?: (value: string) => boolean } = {}) {
  const data = new Map<string, string>();

  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (options.failOnSet?.(value)) throw new Error("QuotaExceededError");
      data.set(key, value);
    },
    removeItem: (key: string) => void data.delete(key),
  };
}

function makeAttempt(index: number): DojoAttempt {
  return {
    id: `a-${index}`,
    kana: "あ",
    romaji: "a",
    answer: "a",
    alphabet: "hiragana",
    group: "hiragana:vowels",
    outcome: "correct",
    reactionMs: 200,
    completionMs: 400,
    createdAt: new Date(0).toISOString(),
  };
}

function makeSession(id: string, attemptCount = 1): DojoSession {
  return {
    id,
    settings: { ...DEFAULT_DOJO_SETTINGS, selectedGroupIds: [] },
    startedAt: new Date(0).toISOString(),
    finishedAt: new Date(1000).toISOString(),
    attempts: Array.from({ length: attemptCount }, (_, index) => makeAttempt(index)),
  };
}

describe("localRepository", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("salva e recarrega sessões, a mais recente primeiro", () => {
    expect(saveLocalDojoSession(makeSession("s1"))).toBe(true);
    expect(saveLocalDojoSession(makeSession("s2"))).toBe(true);

    expect(loadLocalDojoSessions().map((session) => session.id)).toEqual(["s2", "s1"]);
  });

  it("não duplica a mesma sessão", () => {
    saveLocalDojoSession(makeSession("s1"));
    saveLocalDojoSession(makeSession("s1"));

    expect(loadLocalDojoSessions()).toHaveLength(1);
  });

  it("não guarda sessões sem tentativas", () => {
    expect(saveLocalDojoSession(makeSession("vazia", 0))).toBe(true);
    expect(loadLocalDojoSessions()).toEqual([]);
  });

  it("limita as tentativas guardadas por sessão e o total de sessões", () => {
    saveLocalDojoSession(makeSession("grande", 500));
    expect(loadLocalDojoSessions()[0].attempts).toHaveLength(200);

    for (let index = 0; index < 40; index += 1) saveLocalDojoSession(makeSession(`s${index}`));
    expect(loadLocalDojoSessions()).toHaveLength(30);
  });

  it("ignora JSON corrompido e dados em formato antigo", () => {
    localStorage.setItem("hidenihon:kana-reaction:sessions:v2", "{não é json");
    expect(loadLocalDojoSessions()).toEqual([]);

    localStorage.setItem("hidenihon:kana-reaction:sessions:v2", JSON.stringify({ version: 1, sessions: [makeSession("x")] }));
    expect(loadLocalDojoSessions()).toEqual([]);

    localStorage.setItem("hidenihon:kana-reaction:sessions:v2", JSON.stringify({ version: 2, sessions: [{ id: 1 }, makeSession("ok")] }));
    expect(loadLocalDojoSessions().map((session) => session.id)).toEqual(["ok"]);
  });

  it("não lança quando o setItem falha e retorna false", () => {
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: () => true }));

    expect(saveLocalDojoSession(makeSession("s1"))).toBe(false);
    expect(() => saveLocalSettings(DEFAULT_DOJO_SETTINGS)).not.toThrow();
    expect(() => saveAudioEnabled(false)).not.toThrow();
  });

  it("tenta novamente com menos sessões quando estoura a quota", () => {
    // Falha enquanto o payload for grande; passa quando sobra poucas sessões.
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: (value) => value.length > 3_000 }));

    for (let index = 0; index < 20; index += 1) {
      saveLocalDojoSession(makeSession(`s${index}`, 5));
    }

    const stored = loadLocalDojoSessions();
    expect(stored.length).toBeGreaterThan(0);
    expect(stored[0].id).toBe("s19");
  });

  it("funciona (sem lançar) quando não existe localStorage", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(loadLocalDojoSessions()).toEqual([]);
    expect(saveLocalDojoSession(makeSession("s1"))).toBe(false);
    expect(loadAudioEnabled()).toBe(true);
  });
});

describe("configurações e áudio", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devolve os padrões quando não há nada salvo", () => {
    expect(loadLocalSettings()).toEqual(DEFAULT_DOJO_SETTINGS);
  });

  it("persiste e recarrega as configurações", () => {
    saveLocalSettings({ ...DEFAULT_DOJO_SETTINGS, difficulty: "jonin", mode: "timed", timeLimitSeconds: 180, focusMode: true, selectedGroupIds: [] });

    expect(loadLocalSettings()).toMatchObject({ difficulty: "jonin", mode: "timed", timeLimitSeconds: 180, focusMode: true });
  });

  it("corrige valores inválidos vindos do disco", () => {
    const settings = sanitizeSettings({
      alphabet: "klingon",
      mode: 42,
      difficulty: "hokage",
      targetCount: 7,
      timeLimitSeconds: -1,
      selectedGroupIds: ["grupo-que-nao-existe", 5],
      focusMode: "sim",
    });

    expect(settings).toEqual(DEFAULT_DOJO_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_DOJO_SETTINGS);
  });

  it("lembra se o áudio foi desligado", () => {
    expect(loadAudioEnabled()).toBe(true);
    saveAudioEnabled(false);
    expect(loadAudioEnabled()).toBe(false);
  });
});
