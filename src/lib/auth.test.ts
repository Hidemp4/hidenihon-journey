import { describe, expect, it, vi } from "vitest";
import { DEFAULT_DISPLAY_NAME, mapSession, signUpWithPassword } from "./auth";

const signUpMock = vi.fn();

vi.mock("./supabase", () => ({
  requireSupabase: () => ({
    auth: {
      signUp: signUpMock,
    },
  }),
}));

describe("supabase authentication mapping", () => {
  it("maps a Supabase session to the app session shape", () => {
    const session = {
      access_token: "access-token",
      user: {
        id: "user-id",
        email: "student@example.com",
        user_metadata: { name: "Aluno" },
      },
    } as never;

    expect(mapSession(session)).toEqual({
      token: "access-token",
      user: {
        id: "user-id",
        name: "Aluno",
        email: "student@example.com",
      },
    });
  });

  it("uses the default display name when signing up without a name", async () => {
    signUpMock.mockResolvedValueOnce({ data: { user: { identities: [{}] }, session: null }, error: null });

    await expect(signUpWithPassword(" STUDENT@EXAMPLE.COM ", "Password1", "  ")).resolves.toBeNull();

    expect(signUpMock).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "Password1",
      options: {
        data: { name: DEFAULT_DISPLAY_NAME },
        emailRedirectTo: "http://localhost:3000/login",
      },
    });
  });

  it("rejects signup when Supabase returns no new identity", async () => {
    signUpMock.mockResolvedValueOnce({ data: { user: { identities: [] }, session: null }, error: null });

    await expect(signUpWithPassword("student@example.com", "Password1", "Aluno")).rejects.toThrow(
      "Este e-mail já está cadastrado.",
    );
  });
});
