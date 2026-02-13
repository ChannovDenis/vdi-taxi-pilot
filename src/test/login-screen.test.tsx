import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import LoginScreen from "@/components/LoginScreen";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderLogin() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <LoginScreen />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("LoginScreen", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // Prevent AuthContext from calling /api/auth/me
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }));
  });

  it("renders login form", () => {
    renderLogin();
    expect(screen.getByText("VDI Такси")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("admin")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByText("Войти")).toBeInTheDocument();
  });

  it("shows validation error for empty username", async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Войти"));

    await waitFor(() => {
      expect(screen.getByText("Введите логин")).toBeInTheDocument();
    });
  });

  it("shows validation error for short password", async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("admin"), "testuser");
    await user.type(screen.getByPlaceholderText("••••••••"), "12");
    await user.click(screen.getByText("Войти"));

    await waitFor(() => {
      expect(screen.getByText("Пароль минимум 4 символа")).toBeInTheDocument();
    });
  });

  it("calls API on valid submit", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          token: "jwt-abc",
          user: {
            id: 1,
            name: "Admin",
            username: "admin",
            telegram_id: null,
            is_admin: true,
            is_first_login: false,
          },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("admin"), "admin");
    await user.type(screen.getByPlaceholderText("••••••••"), "admin123");
    await user.click(screen.getByText("Войти"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("shows API error on failed login", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ detail: "Неверный логин или пароль" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("admin"), "admin");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrong");
    await user.click(screen.getByText("Войти"));

    await waitFor(() => {
      expect(screen.getByText("Неверный логин или пароль")).toBeInTheDocument();
    });
  });

  it("shows loading state while submitting", async () => {
    // Make fetch hang indefinitely
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("admin"), "admin");
    await user.type(screen.getByPlaceholderText("••••••••"), "admin123");
    await user.click(screen.getByText("Войти"));

    await waitFor(() => {
      expect(screen.getByText("Вход...")).toBeInTheDocument();
    });
  });
});
