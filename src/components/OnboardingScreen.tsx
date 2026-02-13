import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const TG_REGEX = /^@[a-zA-Z0-9_]{5,32}$/;

const OnboardingScreen = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [tg, setTg] = useState("");
  const [tgError, setTgError] = useState("");

  // Save Telegram username to profile
  const saveTelegramMutation = useMutation({
    mutationFn: (telegramId: string) =>
      api.put("/profile", { telegram_id: telegramId }),
    onSuccess: () => setStep(1),
    onError: () => setTgError("Ошибка сохранения. Попробуйте снова."),
  });

  // Complete onboarding
  const completeMutation = useMutation({
    mutationFn: () => api.put("/auth/onboarding-complete"),
    onSuccess: () => navigate("/dashboard"),
  });

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
    saveTelegramMutation.mutate(tg);
  };

  const handleComplete = () => {
    completeMutation.mutate();
  };

  const isSaving = saveTelegramMutation.isPending || completeMutation.isPending;

  const steps = [
    {
      title: "Привяжите Telegram",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Мы будем уведомлять вас о статусе сессий и бронирований через Telegram.
          </p>
          <div>
            <Label className="text-xs text-muted-foreground">Telegram username</Label>
            <Input
              className="mt-1"
              placeholder="@username"
              value={tg}
              onChange={(e) => { setTg(e.target.value); setTgError(""); }}
            />
            {tgError && <p className="mt-1 text-xs text-destructive">{tgError}</p>}
          </div>
          <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground space-y-1">
            <p>После привязки напишите нашему боту:</p>
            <p className="font-mono text-foreground">/start {tg ? tg.replace("@", "") : "ваш_логин"}</p>
            <p>чтобы получать уведомления в Telegram.</p>
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
          <p className="text-sm text-muted-foreground">
            Нажмите <strong>⋮</strong> → <strong>Установить приложение</strong> в браузере,
            чтобы добавить VDI Такси на рабочий стол.
          </p>
          <div className="rounded-xl border bg-card p-6 text-center space-y-2">
            <p className="text-3xl">📱</p>
            <p className="text-sm text-muted-foreground">Chrome → ⋮ → Установить приложение</p>
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
          <p className="text-sm text-muted-foreground">
            Краткая инструкция по использованию VDI Такси:
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 items-start">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
              <p className="text-muted-foreground">Выберите сервис на дашборде и нажмите <strong>Занять</strong></p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
              <p className="text-muted-foreground">Работайте в удалённом браузере как обычно</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
              <p className="text-muted-foreground">Нажмите <strong>Освободить</strong> — артефакты сессии придут в Telegram</p>
            </div>
          </div>
        </div>
      ),
      button: "Начать работу",
      action: handleComplete,
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

        <Button className="w-full" onClick={current.action} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {current.button}
        </Button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
