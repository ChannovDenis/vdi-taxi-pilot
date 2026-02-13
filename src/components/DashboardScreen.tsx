import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Car, Settings, LogOut, Star, CalendarDays, HelpCircle,
  Pencil, Menu, X, User, Trash2,
} from "lucide-react";

/* ───── Types ───── */

interface SlotFromApi {
  id: string;
  service_name: string;
  tier: string | null;
  category: string;
  category_accent: string;
  monthly_cost: number;
  available: boolean;
  occupant_name: string | null;
  session_minutes: number | null;
  queue_size: number;
}

interface Category {
  title: string;
  accent: string;
  slots: SlotFromApi[];
}

interface OccupyResponse {
  session_id: number;
  slot_id: string;
  started_at: string;
  guacamole_url: string;
}

interface ProfileData {
  id: number;
  name: string;
  favorites: string[];
}

interface BookingOut {
  id: number;
  slot_id: string;
  date: string;
  start_time: string;
  duration_min: number;
  status: string;
  created_at: string;
}

/* ───── Helpers ───── */

function groupByCategory(slots: SlotFromApi[]): Category[] {
  const map = new Map<string, Category>();
  for (const s of slots) {
    if (!map.has(s.category)) {
      map.set(s.category, { title: s.category, accent: s.category_accent, slots: [] });
    }
    map.get(s.category)!.slots.push(s);
  }
  return Array.from(map.values());
}

/* ───── Types (templates from API) ───── */

interface TemplateFromApi {
  id: number;
  name: string;
  icon: string;
  slot_ids: string[];
  url: string | null;
  usage_count: number;
}

const timeSlots = Array.from({ length: 19 }, (_, i) => {
  const h = Math.floor(i / 2) + 9;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

/* ───── Component ───── */

const DashboardScreen = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const userName = user?.name ?? "Пользователь";
  const userInitial = userName.charAt(0).toUpperCase();

  // Fetch slots from API
  const { data: slots = [], isLoading: slotsLoading } = useQuery<SlotFromApi[]>({
    queryKey: ["slots"],
    queryFn: () => api.get<SlotFromApi[]>("/slots"),
    refetchInterval: 30_000, // poll every 30s
  });

  const categories = groupByCategory(slots);

  // Fetch templates from API
  const { data: templates = [] } = useQuery<TemplateFromApi[]>({
    queryKey: ["templates"],
    queryFn: () => api.get<TemplateFromApi[]>("/templates"),
  });

  // Launch template mutation
  const launchTemplateMutation = useMutation({
    mutationFn: (templateId: number) => api.post<{ template_id: number; sessions: { slot_id: string; status: string }[] }>(`/templates/${templateId}/launch`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      const okSession = data.sessions.find((s) => s.status === "ok");
      if (okSession) {
        navigate(`/session/${okSession.slot_id}`);
      } else {
        toast({ title: "Все слоты шаблона заняты", variant: "destructive" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  // Occupy mutation
  const occupyMutation = useMutation({
    mutationFn: (slotId: string) => api.post<OccupyResponse>(`/slots/${slotId}/occupy`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      navigate(`/session/${data.slot_id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  // Fetch profile (favorites)
  const { data: profile } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: () => api.get<ProfileData>("/profile"),
  });
  const favorites = new Set(profile?.favorites ?? []);

  // Toggle favorite mutation
  const favMutation = useMutation({
    mutationFn: (newFavs: string[]) => api.put<ProfileData>("/profile", { favorites: newFavs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  // Fetch bookings
  const { data: bookings = [] } = useQuery<BookingOut[]>({
    queryKey: ["bookings"],
    queryFn: () => api.get<BookingOut[]>("/bookings"),
  });

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: (body: { slot_id: string; date: string; start_time: string; duration_min: number }) =>
      api.post<BookingOut>("/bookings", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast({ title: "Бронь подтверждена", description: "Напомним в Telegram за 5 мин" });
      setBookingSlotId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка бронирования", description: err.message, variant: "destructive" });
    },
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/bookings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast({ title: "Бронь отменена" });
    },
  });

  const onBook = (slotId: string) => {
    occupyMutation.mutate(slotId);
  };
  const onAdmin = () => navigate("/admin");
  const onLogout = () => { logout(); navigate("/login"); };
  const onProfile = () => navigate("/profile");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Booking modal state — now stores slot ID
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const bookingSlotName = bookingSlotId ? slots.find((s) => s.id === bookingSlotId)?.service_name ?? bookingSlotId : null;
  const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date());
  const [bookingTime, setBookingTime] = useState("10:00");
  const [bookingDuration, setBookingDuration] = useState("60");

  // Tutorial modal state
  const [tutorialSlot, setTutorialSlot] = useState<string | null>(null);

  const toggleFavorite = (id: string) => {
    const current = profile?.favorites ?? [];
    const next = current.includes(id) ? current.filter((f) => f !== id) : [...current, id];
    favMutation.mutate(next);
  };

  // Queue mutation
  const queueMutation = useMutation({
    mutationFn: (slotId: string) => api.post<{ slot_id: string; position: number; total_in_queue: number }>(`/slots/${slotId}/queue`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      const slotName = slots.find((s) => s.id === data.slot_id)?.service_name ?? data.slot_id;
      toast({ title: "Вы в очереди", description: `Позиция ${data.position} для ${slotName}. Уведомим в Telegram.` });
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  const handleQueue = (slotId: string) => {
    queueMutation.mutate(slotId);
  };

  const handleBookingConfirm = () => {
    if (!bookingSlotId || !bookingDate) return;
    bookingMutation.mutate({
      slot_id: bookingSlotId,
      date: format(bookingDate, "yyyy-MM-dd"),
      start_time: bookingTime,
      duration_min: parseInt(bookingDuration),
    });
  };

  const handleTemplateLaunch = (t: TemplateFromApi) => {
    toast({ title: `Запускаю "${t.name}"`, description: `Занимаю ${t.slot_ids.length} слотов...` });
    launchTemplateMutation.mutate(t.id);
  };

  const favoriteSlots = slots.filter((s) => favorites.has(s.id));

  // Stats: count available/total per category
  const statsText = categories
    .map((c) => {
      const total = c.slots.length;
      const used = c.slots.filter((s) => !s.available).length;
      const pct = total > 0 ? Math.round((used / total) * 100) : 0;
      return `${c.title} ${pct}%`;
    })
    .join(" | ");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
        <div className="flex items-center gap-2 text-primary">
          <Car className="h-5 w-5" />
          <span className="text-lg font-bold text-foreground">VDI Такси</span>
        </div>

        {isMobile ? (
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-muted-foreground">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Привет, {userName}</span>
            <button onClick={onProfile} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground transition-opacity hover:opacity-80">
              {userInitial}
            </button>
            {isAdmin && (
              <button onClick={onAdmin} className="text-muted-foreground transition-colors hover:text-foreground">
                <Settings className="h-5 w-5" />
              </button>
            )}
            <button onClick={onLogout} className="text-muted-foreground transition-colors hover:text-foreground">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>

      {/* Mobile menu */}
      {isMobile && mobileMenuOpen && (
        <div className="border-b bg-card px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">Привет, {userName}</div>
          <button onClick={() => { onProfile(); setMobileMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent">
            <User className="h-4 w-4" /> Профиль
          </button>
          {isAdmin && (
            <button onClick={() => { onAdmin(); setMobileMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent">
              <Settings className="h-4 w-4" /> Админ-панель
            </button>
          )}
          <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive hover:bg-accent">
            <LogOut className="h-4 w-4" /> Выйти
          </button>
        </div>
      )}

      {/* Content */}
      <main className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">
        {/* Loading */}
        {slotsLoading && (
          <div className="text-center text-sm text-muted-foreground py-8">Загрузка слотов...</div>
        )}

        {/* Zone 1: Favorites */}
        {!slotsLoading && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-current" /> Мои избранные
              </h2>
              <button onClick={onProfile} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Pencil className="h-3 w-3" /> Редактировать
              </button>
            </div>
            {favoriteSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Добавьте избранные сервисы нажав ★ на карточке</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {favoriteSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => slot.available ? onBook(slot.id) : handleQueue(slot.id)}
                    className="flex h-20 w-[140px] shrink-0 flex-col items-start justify-between rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/50"
                  >
                    <span className="text-xs font-medium text-foreground leading-tight line-clamp-2">{slot.service_name}</span>
                    <span className="flex items-center gap-1 text-[10px]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: slot.available ? "hsl(var(--success))" : "hsl(var(--destructive))" }} />
                      <span className={slot.available ? "text-[hsl(var(--success))]" : "text-muted-foreground"}>
                        {slot.available ? "Свободен" : "Занят"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Zone 2: Templates */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              📋 Шаблоны задач
            </h2>
            <button className="text-xs text-primary hover:underline">+ Создать шаблон</button>
          </div>
          <div className={cn("gap-4", isMobile ? "flex flex-col" : "flex overflow-x-auto pb-1")}>
            {templates.map((t) => {
              const slotNames = t.slot_ids.map((id) => slots.find((s) => s.id === id)?.service_name ?? id).join(" + ");
              return (
                <div key={t.id} className="flex w-full shrink-0 flex-col justify-between rounded-xl border bg-card p-4 md:w-[220px]">
                  <div>
                    <div className="mb-2 text-xl">{t.icon}</div>
                    <h3 className="font-medium text-foreground text-sm">{t.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{slotNames}</p>
                  </div>
                  <Button size="sm" className="mt-3 w-full" onClick={() => handleTemplateLaunch(t)}>
                    Запустить
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Zone 3: All Services */}
        {!slotsLoading && (
          <section className="space-y-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Все сервисы
            </h2>
            {categories.map((cat) => (
              <div key={cat.title}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: cat.accent }}>
                  {cat.title}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-xl border bg-card p-4"
                      style={{ borderLeftWidth: 4, borderLeftColor: slot.available ? "hsl(var(--success))" : "hsl(var(--destructive))" }}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-foreground text-sm">{slot.service_name}</h4>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleFavorite(slot.id)} className="p-1 text-muted-foreground transition-colors hover:text-yellow-400">
                            <Star className={cn("h-4 w-4", favorites.has(slot.id) && "fill-yellow-400 text-yellow-400")} />
                          </button>
                          {slot.available && (
                            <button onClick={() => { setBookingSlotId(slot.id); setBookingDate(new Date()); }} className="p-1 text-muted-foreground transition-colors hover:text-primary">
                              <CalendarDays className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => setTutorialSlot(slot.service_name)} className="p-1 text-muted-foreground transition-colors hover:text-primary">
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: slot.available ? "hsl(var(--success))" : "hsl(var(--destructive))" }} />
                        {slot.available ? (
                          <span className="text-[hsl(var(--success))]">Свободен</span>
                        ) : (
                          <span className="text-muted-foreground">
                            Занято: {slot.occupant_name} — {slot.session_minutes} мин
                            {slot.queue_size > 0 && ` · Очередь: ${slot.queue_size}`}
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        {slot.available ? (
                          <Button size="sm" onClick={() => onBook(slot.id)} disabled={occupyMutation.isPending}>
                            Занять
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => handleQueue(slot.id)}>
                            В очередь{slot.queue_size > 0 && ` (${slot.queue_size})`}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* My Bookings */}
        {bookings.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              📅 Мои бронирования
            </h2>
            <div className="space-y-2">
              {bookings.map((b) => {
                const slotName = slots.find((s) => s.id === b.slot_id)?.service_name ?? b.slot_id;
                return (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5">
                    <div className="text-sm">
                      <span className="font-medium text-foreground">{slotName}</span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{b.date} в {b.start_time}</span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{b.duration_min} мин</span>
                    </div>
                    <button
                      onClick={() => cancelBookingMutation.mutate(b.id)}
                      className="p-1 text-muted-foreground transition-colors hover:text-destructive"
                      title="Отменить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Stats bar */}
        {!slotsLoading && slots.length > 0 && (
          <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            Загрузка сегодня:{" "}
            {categories.map((c, i) => (
              <span key={c.title}>
                {i > 0 && " | "}
                <span className="text-foreground">
                  {c.title} {Math.round((c.slots.filter((s) => !s.available).length / c.slots.length) * 100)}%
                </span>
              </span>
            ))}
          </div>
        )}
      </main>

      {/* Booking Modal */}
      <Dialog open={!!bookingSlotId} onOpenChange={(o) => !o && setBookingSlotId(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Забронировать {bookingSlotName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Дата</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("mt-1 w-full justify-start text-left font-normal", !bookingDate && "text-muted-foreground")}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {bookingDate ? format(bookingDate, "dd.MM.yyyy") : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Время начала</Label>
              <Select value={bookingTime} onValueChange={setBookingTime}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Длительность</Label>
              <RadioGroup value={bookingDuration} onValueChange={setBookingDuration} className="mt-2 flex gap-4">
                {[{ v: "30", l: "30 мин" }, { v: "60", l: "1 час" }, { v: "120", l: "2 часа" }].map((d) => (
                  <div key={d.v} className="flex items-center gap-1.5">
                    <RadioGroupItem value={d.v} id={`dur-${d.v}`} />
                    <Label htmlFor={`dur-${d.v}`} className="text-sm cursor-pointer">{d.l}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <p className="text-xs text-muted-foreground">
              Бронь гарантирует слот на выбранное время. Если не подключитесь за 15 мин — бронь снимется.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setBookingSlotId(null)}>Отмена</Button>
            <Button onClick={handleBookingConfirm} disabled={bookingMutation.isPending}>
              {bookingMutation.isPending ? "Бронирую..." : "Забронировать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tutorial Modal */}
      <Dialog open={!!tutorialSlot} onOpenChange={(o) => !o && setTutorialSlot(null)}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Как использовать {tutorialSlot}</DialogTitle>
          </DialogHeader>
          <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
            <p className="text-muted-foreground text-sm">Видео: Как использовать {tutorialSlot}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardScreen;
