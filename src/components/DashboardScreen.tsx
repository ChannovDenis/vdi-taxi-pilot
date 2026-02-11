import { Button } from "@/components/ui/button";
import { Car, Settings, LogOut } from "lucide-react";

interface Slot {
  id: string;
  name: string;
  available: boolean;
  occupant?: string;
  minutes?: number;
}

const sections: { title: string; slots: Slot[] }[] = [
  {
    title: "РЕСЕРЧ",
    slots: [
      { id: "ppx-1", name: "Perplexity Max #1", available: true },
      { id: "ppx-2", name: "Perplexity Max #2", available: false, occupant: "Иван", minutes: 12 },
      { id: "ppx-3", name: "Perplexity Max #3", available: true },
    ],
  },
  {
    title: "ГЕНЕРАЦИЯ",
    slots: [
      { id: "gem-1", name: "Gemini Ultra — NB + Drive", available: true },
      { id: "gem-2", name: "Gemini Ultra — Veo + Flow", available: false, occupant: "Олег", minutes: 45 },
      { id: "gpt-1", name: "ChatGPT Pro", available: true },
    ],
  },
  {
    title: "ВИДЕО",
    slots: [
      { id: "hf-1", name: "Higgsfield Ultimate", available: true },
    ],
  },
];

interface Props {
  onBook: (slotName: string) => void;
  onAdmin: () => void;
  onLogout: () => void;
}

const DashboardScreen = ({ onBook, onAdmin, onLogout }: Props) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2 text-primary">
          <Car className="h-5 w-5" />
          <span className="text-lg font-bold text-foreground">VDI Такси</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Привет, Анна</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            А
          </div>
          <button onClick={onAdmin} className="text-muted-foreground transition-colors hover:text-foreground">
            <Settings className="h-5 w-5" />
          </button>
          <button onClick={onLogout} className="text-muted-foreground transition-colors hover:text-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl space-y-8 p-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {section.title}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.slots.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-xl border bg-card p-4"
                  style={{ borderLeftWidth: 4, borderLeftColor: slot.available ? "hsl(var(--success))" : "hsl(var(--destructive))" }}
                >
                  <h3 className="font-medium text-foreground">{slot.name}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-sm">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: slot.available ? "hsl(var(--success))" : "hsl(var(--destructive))" }}
                    />
                    {slot.available ? (
                      <span className="text-[hsl(var(--success))]">Свободен</span>
                    ) : (
                      <span className="text-muted-foreground">
                        Занято: {slot.occupant} — {slot.minutes} мин
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    {slot.available ? (
                      <Button size="sm" onClick={() => onBook(slot.name)}>
                        Занять
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" disabled>
                        Занято
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Stats bar */}
        <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          Загрузка сегодня: <span className="text-foreground">PPX 62%</span> |{" "}
          <span className="text-foreground">Gemini 41%</span> |{" "}
          <span className="text-foreground">GPT 28%</span> |{" "}
          <span className="text-foreground">HF 11%</span>
        </div>
      </main>
    </div>
  );
};

export default DashboardScreen;
