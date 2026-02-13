import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TG_REGEX = /^@[a-zA-Z0-9_]{5,32}$/;

const OnboardingScreen = () => {
  const navigate = useNavigate();
  const onComplete = () => navigate("/dashboard");
  const [step, setStep] = useState(0);
  const [tg, setTg] = useState("");
  const [tgError, setTgError] = useState("");

  const handleStep0Next = () => {
    if (!tg) {
      setTgError("Введите Telegram username");
      return;
    }
    if (!TG_REGEX.test(tg)) {
      setTgError("Формат: @username (5–32 символа, буквы, цифры, _)");
      return;
    }
    setTgError("");
    setStep(1);
  };

  const steps = [
    {
      title: "Привяжите Telegram",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Мы будем уведомлять вас о статусе сессий и бронирований через Telegram.</p>
          <div>
            <Label className="text-xs text-muted-foreground">Telegram username</Label>
            <Input className="mt-1" placeholder="@username" value={tg} onChange={(e) => { setTg(e.target.value); setTgError(""); }} />
            {tgError && <p className="mt-1 text-xs text-destructive">{tgError}</p>}
          </div>
        </div>
      ),
      button: "Далее",
      action: handleStep0Next,
    },
    {
      title: "Добавьте на рабочий стол",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Нажмите <strong>⋮</strong> → <strong>Установить приложение</strong> в браузере, чтобы добавить VDI Такси на рабочий стол.</p>
          <div className="flex aspect-video items-center justify-center rounded-xl bg-muted">
            <span className="text-muted-foreground text-sm">Инструкция (скриншот)</span>
          </div>
        </div>
      ),
      button: "Далее",
      action: () => setStep(2),
    },
    {
      title: "Как это работает",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Посмотрите короткий видео-тур по платформе.</p>
          <div className="flex aspect-video items-center justify-center rounded-xl bg-muted">
            <span className="text-muted-foreground text-sm">Видео-тур (2 мин)</span>
          </div>
        </div>
      ),
      button: "Начать работу",
      action: onComplete,
    },
  ];

  const current = steps[step];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full transition-colors"
              style={{ backgroundColor: i === step ? "hsl(var(--primary))" : "hsl(var(--muted))" }}
            />
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">Шаг {step + 1}/3</p>

        <h1 className="text-center text-2xl font-bold text-foreground">{current.title}</h1>

        {current.content}

        <Button className="w-full" onClick={current.action}>{current.button}</Button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
