import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, ApiError } from "@/lib/api";

describe("api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("sends GET request to correct URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "test" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.get("/slots");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/slots",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("includes auth token from localStorage", async () => {
    localStorage.setItem("token", "test-jwt-token");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.get("/auth/me");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-jwt-token",
        }),
      })
    );
  });

  it("sends POST with JSON body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ token: "abc" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.post("/auth/login", { username: "admin", password: "123" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "admin", password: "123" }),
      })
    );
  });

  it("throws ApiError on non-ok response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ detail: "Invalid credentials" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(api.post("/auth/login", {})).rejects.toThrow(ApiError);
    try {
      await api.post("/auth/login", {});
    } catch (err) {
      expect((err as ApiError).status).toBe(401);
      expect((err as ApiError).message).toBe("Invalid credentials");
    }
  });

  it("sends DELETE request", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.delete("/bookings/1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/bookings/1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("sends PUT with body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await api.put("/profile", { telegram_id: "@test" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/profile",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ telegram_id: "@test" }),
      })
    );
  });
});
