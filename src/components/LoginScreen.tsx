import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Car, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Введите логин"),
  password: z.string().min(4, "Пароль минимум 4 символа"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
    mode: "onTouched",
  });

  const onSubmit = async (values: LoginFormValues) => {
    setApiError("");
    setLoading(true);
    try {
      const data = await api.post<LoginResponse>("/auth/login", {
        username: values.username,
        password: values.password,
        totp_code: otp || "",
      });

      login(data.token, data.user);

      if (data.user.is_first_login) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message);
      } else {
        setApiError("Ошибка соединения с сервером");
      }
    } finally {
      setLoading(false);
    }
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-border/60 bg-[hsl(217,33%,20%)] p-6 shadow-lg">
          {apiError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {apiError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm text-foreground/80">Логин</label>
            <Input
              {...register("username")}
              placeholder="admin"
              className="bg-background"
              autoFocus
            />
            {errors.username && (
              <p className="flex items-center gap-1 text-sm text-red-400 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.username.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-foreground/80">Пароль</label>
            <Input
              type="password"
              {...register("password")}
              placeholder="••••••••"
              className="bg-background"
            />
            {errors.password && (
              <p className="flex items-center gap-1 text-sm text-red-400 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Код 2FA <span className="text-xs opacity-60">(если подключён)</span>
            </label>
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
