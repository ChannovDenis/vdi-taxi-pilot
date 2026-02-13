import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Car } from "lucide-react";

interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    username: string;
    telegram_id: string | null;
    is_admin: boolean;
    is_first_login: boolean;
  };
}

const LoginScreen = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!username.trim()) {
      setError("Введите логин");
      return;
    }
    if (!password) {
      setError("Введите пароль");
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<LoginResponse>("/auth/login", {
        username: username.trim(),
        password,
        totp_code: otp,
      });

      login(data.token, data.user);

      if (data.user.is_first_login) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Ошибка соединения с сервером");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) handleLogin();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Car className="h-8 w-8" />
            <span className="text-3xl font-bold tracking-tight text-foreground">VDI Такси</span>
          </div>
          <p className="text-sm text-muted-foreground">Портал бронирования AI-сервисов</p>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-6" onKeyDown={handleKeyDown}>
          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Логин</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="bg-background"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Пароль</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Код 2FA</label>
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
