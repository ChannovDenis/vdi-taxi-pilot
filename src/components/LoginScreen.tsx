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
import { Car } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Введите логин"),
  password: z.string().min(4, "Пароль минимум 4 символа"),
  totp_code: z.string().optional(),
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
    defaultValues: { username: "", password: "", totp_code: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setApiError("");
    setLoading(true);
    try {
      const data = await api.post<LoginResponse>("/auth/login", {
        ...values,
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border bg-card p-6">
          {apiError && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {apiError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Логин</label>
            <Input
              {...register("username")}
              placeholder="admin"
              className="bg-background"
              autoFocus
            />
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Пароль</label>
            <Input
              type="password"
              {...register("password")}
              placeholder="••••••••"
              className="bg-background"
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
