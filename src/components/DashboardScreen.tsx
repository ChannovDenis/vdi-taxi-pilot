import { useState } from "react";
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
  Pencil, Search, Video, BarChart3, Menu, X, User,
} from "lucide-react";

/* ───── Data ───── */

interface Slot {
  id: string;
  name: string;
  available: boolean;
  occupant?: string;
  minutes?: number;
}

interface Category {
  title: string;
  accent: string;
  slots: Slot[];
}

const categories: Category[] = [
  {
    title: "РЕСЕРЧ",
    accent: "#3b82f6",
    slots: [
      { id: "ppx-1", name: "Perplexity Max #1", available: true },
      { id: "ppx-2", name: "Perplexity Max #2", available: false, occupant: "Иван", minutes: 12 },
      { id: "ppx-3", name: "Perplexity Max #3", available: true },
    ],
  },
  {
    title: "GOOGLE AI",
    accent: "#4285f4",
    slots: [
      { id: "gem-dt", name: "Gemini Ultra — Deep Think", available: true },
      { id: "nbp", name: "Nano Banana Pro", available: true },
      { id: "veo", name: "Veo + Flow (видео)", available: false, occupant: "Олег", minutes: 45 },
      { id: "nb-drive", name: "NotebookLM + Drive", available: true },
    ],
  },
  {
    title: "REASONING",
    accent: "#8b5cf6",
    slots: [
      { id: "gpt-1", name: "ChatGPT Pro — o3-pro", available: true },
    ],
  },
  {
    title: "ВИДЕО",
    accent: "#a855f7",
    slots: [
      { id: "hf-1", name: "Higgsfield Ultimate", available: true },
    ],
  },
  {
    title: "КОД",
    accent: "#f97316",
    slots: [
      { id: "lov-1", name: "Lovable Team", available: true },
    ],
  },
];

const allSlots = categories.flatMap((c) => c.slots);

interface Template {
  icon: React.ReactNode;
  name: string;
  description: string;
  slotNames: string[];
}

const templates: Template[] = [
  { icon: <Search className="h-5 w-5" />, name: "Ресерч конкурентов", description: "Perplexity Max + NotebookLM", slotNames: ["Perplexity Max #1", "NotebookLM + Drive"] },
  { icon: <Video className="h-5 w-5" />, name: "Создание видео", description: "Veo + Flow + Higgsfield", slotNames: ["Veo + Flow (видео)", "Higgsfield Ultimate"] },
  { icon: <BarChart3 className="h-5 w-5" />, name: "Подготовка презентации", description: "Gemini NB + Nano Banana Pro", slotNames: ["NotebookLM + Drive", "Nano Banana Pro"] },
];

const defaultFavorites = new Set(["ppx-1", "nb-drive"]);

const timeSlots = Array.from({ length: 19 }, (_, i) => {
  const h = Math.floor(i / 2) + 9;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

/* ───── Props ───── */

interface Props {
  onBook: (slotName: string) => void;
  onAdmin: () => void;
  onLogout: () => void;
  onProfile: () => void;
}

/* ───── Component ───── */

const DashboardScreen = ({ onBook, onAdmin, onLogout, onProfile }: Props) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [favorites, setFavorites] = useState<Set<string>>(new Set(defaultFavorites));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Booking modal state
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [bookingTime, setBookingTime] = useState("10:00");
  const [bookingDuration, setBookingDuration] = useState("60");

  // Tutorial modal state
  const [tutorialSlot, setTutorialSlot] = useState<string | null>(null);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleQueue = (name: string) => {
    toast({ title: "Вы в очереди", description: `Уведомим в Telegram когда ${name} освободится` });
  };

  const handleBookingConfirm = () => {
    toast({ title: "Бронь подтверждена", description: "Напомним в Telegram за 5 мин" });
    setBookingSlot(null);
  };

  const handleTemplateLaunch = (t: Template) => {
    toast({ title: `Занимаю ${t.slotNames.length} слота`, description: `${t.slotNames.join(" + ")}... Подключение...` });
    setTimeout(() => onBook(t.slotNames[0]), 600);
  };

  const favoriteSlots = allSlots.filter((s) => favorites.has(s.id));

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
            <span className="text-sm text-muted-foreground">Привет, Анна</span>
            <button onClick={onProfile} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground transition-opacity hover:opacity-80">
              А
            </button>
            <button onClick={onAdmin} className="text-muted-foreground transition-colors hover:text-foreground">
              <Settings className="h-5 w-5" />
            </button>
            <button onClick={onLogout} className="text-muted-foreground transition-colors hover:text-foreground">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>

      {/* Mobile menu */}
      {isMobile && mobileMenuOpen && (
        <div className="border-b bg-card px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">Привет, Анна</div>
          <button onClick={() => { onProfile(); setMobileMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent">
            <User className="h-4 w-4" /> Профиль
          </button>
          <button onClick={() => { onAdmin(); setMobileMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent">
            <Settings className="h-4 w-4" /> Админ-панель
          </button>
          <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive hover:bg-accent">
            <LogOut className="h-4 w-4" /> Выйти
          </button>
        </div>
      )}

      {/* Content */}
      <main className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">
        {/* Zone 1: Favorites */}
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
                  onClick={() => slot.available ? onBook(slot.name) : handleQueue(slot.name)}
                  className="flex h-20 w-[140px] shrink-0 flex-col items-start justify-between rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/50"
                >
                  <span className="text-xs font-medium text-foreground leading-tight line-clamp-2">{slot.name}</span>
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

        {/* Zone 2: Templates */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              📋 Шаблоны задач
            </h2>
            <button className="text-xs text-primary hover:underline">+ Создать шаблон</button>
          </div>
          <div className={cn("gap-4", isMobile ? "flex flex-col" : "flex overflow-x-auto pb-1")}>
            {templates.map((t) => (
              <div key={t.name} className="flex w-full shrink-0 flex-col justify-between rounded-xl border bg-card p-4 md:w-[220px]">
                <div>
                  <div className="mb-2 text-primary">{t.icon}</div>
                  <h3 className="font-medium text-foreground text-sm">{t.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                </div>
                <Button size="sm" className="mt-3 w-full" onClick={() => handleTemplateLaunch(t)}>
                  Запустить
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Zone 3: All Services */}
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
                      <h4 className="font-medium text-foreground text-sm">{slot.name}</h4>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleFavorite(slot.id)} className="p-1 text-muted-foreground transition-colors hover:text-yellow-400">
                          <Star className={cn("h-4 w-4", favorites.has(slot.id) && "fill-yellow-400 text-yellow-400")} />
                        </button>
                        {slot.available && (
                          <button onClick={() => { setBookingSlot(slot.name); setBookingDate(undefined); }} className="p-1 text-muted-foreground transition-colors hover:text-primary">
                            <CalendarDays className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => setTutorialSlot(slot.name)} className="p-1 text-muted-foreground transition-colors hover:text-primary">
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: slot.available ? "hsl(var(--success))" : "hsl(var(--destructive))" }} />
                      {slot.available ? (
                        <span className="text-[hsl(var(--success))]">Свободен</span>
                      ) : (
                        <span className="text-muted-foreground">Занято: {slot.occupant} — {slot.minutes} мин</span>
                      )}
                    </div>
                    <div className="mt-3">
                      {slot.available ? (
                        <Button size="sm" onClick={() => onBook(slot.name)}>Занять</Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => handleQueue(slot.name)}>В очередь</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Stats bar */}
        <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          Загрузка сегодня: <span className="text-foreground">PPX 62%</span> |{" "}
          <span className="text-foreground">Gemini 41%</span> |{" "}
          <span className="text-foreground">GPT 28%</span> |{" "}
          <span className="text-foreground">HF 11%</span>
        </div>
      </main>

      {/* Booking Modal */}
      <Dialog open={!!bookingSlot} onOpenChange={(o) => !o && setBookingSlot(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Забронировать {bookingSlot}</DialogTitle>
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
            <Button variant="ghost" onClick={() => setBookingSlot(null)}>Отмена</Button>
            <Button onClick={handleBookingConfirm}>Забронировать</Button>
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
