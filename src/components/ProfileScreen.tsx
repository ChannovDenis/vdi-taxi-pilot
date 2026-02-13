import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SlotFromApi {
  id: string;
  service_name: string;
}

interface SessionHistoryItem {
  id: number;
  slot_id: string;
  service_name: string;
  started_at: string;
  ended_at: string | null;
  duration_min: number;
  end_reason: string | null;
  dump_path: string | null;
}

interface ProfileData {
  id: number;
  name: string;
  username: string;
  telegram_id: string | null;
  is_admin: boolean;
  is_first_login: boolean;
  favorites: string[];
}

const videos = [
  { title: "Как работает VDI Такси", duration: "2 мин" },
  { title: "Perplexity Spaces: организация ресерча", duration: "1 мин" },
  { title: "Nano Banana Pro: генерация картинок", duration: "1 мин" },
  { title: "NotebookLM: загрузка источников", duration: "1 мин" },
  { title: "Veo + Flow: создание видео", duration: "1 мин" },
];

const TG_REGEX = /^@[a-zA-Z0-9_]{5,32}$/;

const ProfileScreen = () => {
  const navigate = useNavigate();
  const onBack = () => navigate("/dashboard");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [tgError, setTgError] = useState("");

  // Fetch profile from API
  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: () => api.get<ProfileData>("/profile"),
  });

  // Fetch slots from API
  const { data: slots = [] } = useQuery<SlotFromApi[]>({
    queryKey: ["slots"],
    queryFn: () => api.get<SlotFromApi[]>("/slots"),
  });

  // Fetch session history
  const { data: sessionHistory = [] } = useQuery<SessionHistoryItem[]>({
    queryKey: ["profile-sessions"],
    queryFn: () => api.get<SessionHistoryItem[]>("/profile/sessions"),
  });

  // Local state for editing (initialized from profile when available)
  const [localTelegram, setLocalTelegram] = useState<string | null>(null);
  const [localFavorites, setLocalFavorites] = useState<string[] | null>(null);

  // Use local state if user has started editing, otherwise use profile data
  const telegram = localTelegram ?? profile?.telegram_id ?? "";
  const checked = new Set(localFavorites ?? profile?.favorites ?? []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (body: { telegram_id?: string; favorites?: string[] }) =>
      api.put<ProfileData>("/profile", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Сохранено" });
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  const toggle = (id: string) => {
    const current = localFavorites ?? profile?.favorites ?? [];
    const next = current.includes(id) ? current.filter((f) => f !== id) : [...current, id];
    setLocalFavorites(next);
  };

  const handleSaveTelegram = () => {
    if (!telegram) {
      setTgError("Введите Telegram username");
      return;
    }
    if (!TG_REGEX.test(telegram)) {
      setTgError("Формат: @username (5–32 символа, буквы, цифры, _)");
      return;
    }
    setTgError("");
    saveMutation.mutate({ telegram_id: telegram });
    setLocalTelegram(null);
  };

  const handleSaveFavorites = () => {
    saveMutation.mutate({ favorites: Array.from(checked) });
    setLocalFavorites(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <Button variant="ghost" onClick={onBack} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Назад к дашборду
        </Button>

        <h1 className="text-2xl font-bold">Профиль</h1>

        {/* Contact details */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Контактные данные</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Telegram username</label>
              <input
                className="mt-1 flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="@username"
                value={telegram}
                onChange={(e) => { setLocalTelegram(e.target.value); setTgError(""); }}
              />
              {tgError && <p className="mt-1 text-xs text-destructive">{tgError}</p>}
            </div>
            <Button size="sm" onClick={handleSaveTelegram} disabled={saveMutation.isPending}>
              Сохранить
            </Button>
          </div>
        </section>

        {/* Favorites */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">★ Мои избранные сервисы</h2>
          <div className="space-y-3">
            {slots.map((s) => (
              <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={checked.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                <span className="text-sm text-foreground">{s.service_name}</span>
              </label>
            ))}
          </div>
          <Button className="mt-4" size="sm" onClick={handleSaveFavorites} disabled={saveMutation.isPending}>
            Сохранить
          </Button>
        </section>

        {/* Session History */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">История сессий</h2>
          {sessionHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет завершённых сессий</p>
          ) : (
            <div className="space-y-2">
              {sessionHistory.map((s) => {
                const date = new Date(s.started_at);
                const dateStr = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
                const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.service_name}</p>
                        <p className="text-xs text-muted-foreground">{dateStr}, {timeStr} — {s.duration_min} мин</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.dump_path && (
                        <FileText className="h-4 w-4 text-muted-foreground" title="Дамп доступен" />
                      )}
                      <span className="text-xs text-muted-foreground">{s.end_reason === "manual" ? "Завершено" : s.end_reason === "kicked" ? "Отключён" : s.end_reason ?? ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Training */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Обучение</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {videos.map((v) => (
              <button
                key={v.title}
                onClick={() => setVideoModal(v.title)}
                className="flex w-[200px] shrink-0 flex-col rounded-xl border bg-card overflow-hidden text-left transition-colors hover:border-primary/50"
              >
                <div className="flex aspect-video items-center justify-center bg-muted">
                  <span className="text-xs text-muted-foreground">▶</span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-foreground leading-tight">{v.title}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{v.duration}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={!!videoModal} onOpenChange={(o) => !o && setVideoModal(null)}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{videoModal}</DialogTitle>
          </DialogHeader>
          <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
            <p className="text-muted-foreground text-sm">Видео: {videoModal}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileScreen;
