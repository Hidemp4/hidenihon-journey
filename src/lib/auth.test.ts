import { beforeEach, describe, expect, it } from "vitest";
import { clearStoredSession, getStoredSession, loginWithLocalPassword } from "./auth";

const TEST_EMAIL = "aluno@hidenihon.local";
const TEST_PASSWORD = "hidenihon123";

describe("local authentication", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("rejects arbitrary credentials", async () => {
    await expect(loginWithLocalPassword("qualquer@email.com", "qualquer123")).resolves.toBeNull();

    expect(getStoredSession()).toBeNull();
  });

  it("accepts only the configured local credentials", async () => {
    const session = await loginWithLocalPassword(TEST_EMAIL.toUpperCase(), TEST_PASSWORD);

    expect(session?.user.email).toBe(TEST_EMAIL);
    expect(getStoredSession()?.user.email).toBe(TEST_EMAIL);
  });

  it("invalidates sessions created for unknown users", () => {
    localStorage.setItem("hidenihon_session_v1", JSON.stringify({
      token: "legacy-token",
      authVersion: "legacy-version",
      user: {
        id: "intruso@email.com",
        name: "Intruso",
        email: "intruso@email.com",
      },
    }));

    expect(getStoredSession()).toBeNull();
    expect(localStorage.getItem("hidenihon_session_v1")).toBeNull();
  });

  it("invalidates old sessions without the current auth version", () => {
    localStorage.setItem("hidenihon_session_v1", JSON.stringify({
      token: "legacy-token",
      user: {
        id: TEST_EMAIL,
        name: "Estudante HideNihon",
        email: TEST_EMAIL,
      },
    }));

    expect(getStoredSession()).toBeNull();
    expect(localStorage.getItem("hidenihon_session_v1")).toBeNull();
  });

  it("clears legacy auto-created users on logout", () => {
    localStorage.setItem("hidenihon_users_v1", JSON.stringify({}));

    clearStoredSession();

    expect(localStorage.getItem("hidenihon_users_v1")).toBeNull();
  });
});
