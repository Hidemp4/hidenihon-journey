import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dojoStorageKey, readJson, readRaw, writeFirstThatFits, writeRaw } from "./storage";
import { createMemoryStorage } from "./test/memoryStorage";

describe("storage compartilhado", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa o prefixo hidenihon:dojo: nas chaves novas", () => {
    expect(dojoStorageKey("mastery:v1")).toBe("hidenihon:dojo:mastery:v1");
  });

  it("lê e grava texto e JSON", () => {
    expect(writeRaw("k", JSON.stringify({ a: 1 }))).toBe(true);
    expect(readRaw("k")).toBe('{"a":1}');
    expect(readJson("k")).toEqual({ a: 1 });
    expect(readJson("inexistente")).toBeNull();
  });

  it("devolve null para JSON corrompido", () => {
    writeRaw("k", "{não é json");
    expect(readJson("k")).toBeNull();
  });

  it("grava o primeiro payload que couber e não gera os seguintes à toa", () => {
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: (value) => value.length > 5 }));
    const generated: string[] = [];
    function* payloads() {
      for (const payload of ["grande-demais", "médio!", "ok", "nunca"]) {
        generated.push(payload);
        yield payload;
      }
    }

    expect(writeFirstThatFits("k", payloads())).toBe(true);
    expect(readRaw("k")).toBe("ok");
    expect(generated).toEqual(["grande-demais", "médio!", "ok"]);
  });

  it("retorna false quando nada cabe", () => {
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: () => true }));
    expect(writeFirstThatFits("k", ["a", "b"])).toBe(false);
  });

  it("não lança sem localStorage ou quando o acesso dá SecurityError", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readRaw("k")).toBeNull();
    expect(writeRaw("k", "v")).toBe(false);

    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    });
    expect(readJson("k")).toBeNull();
    expect(writeRaw("k", "v")).toBe(false);
  });
});
