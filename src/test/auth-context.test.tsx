import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // Mock fetch to prevent /api/auth/me calls
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }));
  });

  it("starts with null user when no stored data", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it("login stores token and user", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    act(() => {
      result.current.login("jwt-token-123", {
        id: 1,
        name: "Admin",
        telegram_id: null,
        is_admin: true,
        is_first_login: false,
      });
    });

    expect(result.current.user?.name).toBe("Admin");
    expect(result.current.token).toBe("jwt-token-123");
    expect(result.current.isAdmin).toBe(true);
    expect(localStorage.getItem("token")).toBe("jwt-token-123");
  });

  it("logout clears state and localStorage", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    act(() => {
      result.current.login("token", {
        id: 1,
        name: "User",
        telegram_id: null,
        is_admin: false,
        is_first_login: false,
      });
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("restores user from localStorage", () => {
    const storedUser = {
      id: 1,
      name: "Stored User",
      telegram_id: "@stored",
      is_admin: false,
      is_first_login: false,
    };
    localStorage.setItem("token", "stored-token");
    localStorage.setItem("user", JSON.stringify(storedUser));

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.user?.name).toBe("Stored User");
    expect(result.current.token).toBe("stored-token");
  });

  it("throws error when used outside provider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within AuthProvider");
  });
});
