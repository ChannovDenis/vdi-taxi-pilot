import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const allServices = [
  { id: "ppx-1", name: "Perplexity Max #1" },
  { id: "ppx-2", name: "Perplexity Max #2" },
  { id: "ppx-3", name: "Perplexity Max #3" },
  { id: "gem-dt", name: "Gemini Ultra — Deep Think" },
  { id: "nbp", name: "Nano Banana Pro" },
  { id: "veo", name: "Veo + Flow (видео)" },
  { id: "nb-drive", name: "NotebookLM + Drive" },
  { id: "gpt-1", name: "ChatGPT Pro — o3-pro" },
  { id: "hf-1", name: "Higgsfield Ultimate" },
];

const defaultChecked = new Set(["ppx-1", "nb-drive"]);

const videos = [
  { title: "Как работает VDI Такси", duration: "2 мин" },
  { title: "Perplexity Spaces: организация ресерча", duration: "1 мин" },
  { title: "Nano Banana Pro: генерация картинок", duration: "1 мин" },
  { title: "NotebookLM: загрузка источников", duration: "1 мин" },
  { title: "Veo + Flow: создание видео", duration: "1 мин" },
];

const ProfileScreen = () => {
  const navigate = useNavigate();
  const onBack = () => navigate("/dashboard");
  const { toast } = useToast();
  const [checked, setChecked] = useState<Set<string>>(new Set(defaultChecked));
  const [videoModal, setVideoModal] = useState<string | null>(null);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
                defaultValue="@anna"
              />
            </div>
            <Button size="sm" onClick={() => toast({ title: "Сохранено", description: "Контактные данные обновлены" })}>
              Сохранить
            </Button>
          </div>
        </section>

        {/* Favorites */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">★ Мои избранные сервисы</h2>
          <div className="space-y-3">
            {allServices.map((s) => (
              <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={checked.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                <span className="text-sm text-foreground">{s.name}</span>
              </label>
            ))}
          </div>
          <Button className="mt-4" size="sm" onClick={() => toast({ title: "Сохранено", description: "Избранные обновлены" })}>
            Сохранить
          </Button>
        </section>

        {/* Training */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">📚 Обучение</h2>
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
