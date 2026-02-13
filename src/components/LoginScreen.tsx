import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Car } from "lucide-react";

const LoginScreen = () => {
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

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

        <div className="space-y-4 rounded-xl border bg-card p-6">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Логин</label>
            <Input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="anna@company.ru"
              className="bg-background"
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
          <Button className="w-full" onClick={() => navigate("/dashboard")}>
            Войти
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
