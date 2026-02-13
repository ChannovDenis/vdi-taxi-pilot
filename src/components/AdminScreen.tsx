import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import HealthTab from "@/components/admin/HealthTab";
import ServicesTab from "@/components/admin/ServicesTab";

interface Props {
  onBack: () => void;
}

const loadData = [
  { id: "ppx-1", pct: 78 },
  { id: "ppx-2", pct: 61 },
  { id: "ppx-3", pct: 42 },
  { id: "gem-dt", pct: 33 },
  { id: "nbp", pct: 25 },
  { id: "veo", pct: 22 },
  { id: "nb-drive", pct: 38 },
  { id: "gpt-1", pct: 51 },
  { id: "hf-1", pct: 11 },
  { id: "lov-1", pct: 15 },
];

const users = [
  { name: "Анна", tg: "@anna", sessions: 12, hours: 6.5 },
  { name: "Иван", tg: "@ivan", sessions: 8, hours: 4.2 },
  { name: "Олег", tg: "@oleg", sessions: 10, hours: 5.1 },
  { name: "Мария", tg: "@maria", sessions: 6, hours: 3.0 },
  { name: "Дмитрий", tg: "@dmitry", sessions: 4, hours: 2.3 },
  { name: "Елена", tg: "@elena", sessions: 9, hours: 4.8 },
  { name: "Сергей", tg: "@sergey", sessions: 3, hours: 1.5 },
  { name: "Наталья", tg: "@natasha", sessions: 7, hours: 3.7 },
];

const templateRows = [
  { name: "Ресерч конкурентов", slots: "PPX + NB", creator: "Админ", usage: 14 },
  { name: "Создание видео", slots: "Veo + HF", creator: "Админ", usage: 6 },
  { name: "Подготовка презентации", slots: "Gemini + NBP", creator: "Админ", usage: 9 },
];

const allServiceNames = [
  "Perplexity Max #1", "Perplexity Max #2", "Perplexity Max #3",
  "Gemini Ultra — Deep Think", "Nano Banana Pro", "Veo + Flow",
  "NotebookLM + Drive", "ChatGPT Pro — o3-pro", "Higgsfield Ultimate", "Lovable Team",
];

const iconOptions = ["🔍", "📊", "🎬", "📝", "💡", "🎯"];

const barColor = (pct: number) =>
  pct > 70 ? "hsl(var(--destructive))" : pct >= 30 ? "hsl(45, 93%, 47%)" : "hsl(var(--success))";

const AdminScreen = ({ onBack }: Props) => {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplIcon, setTplIcon] = useState("🔍");
  const [tplSlots, setTplSlots] = useState<Set<string>>(new Set());
  const [tplUrl, setTplUrl] = useState("");

  const toggleSlot = (s: string) => {
    setTplSlots((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const handleCreate = () => {
    toast({ title: "Шаблон создан", description: tplName });
    setShowCreate(false);
    setTplName("");
    setTplSlots(new Set());
    setTplUrl("");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Назад к дашборду
        </Button>

        <h1 className="text-2xl font-bold">Админ-панель</h1>

        <Tabs defaultValue="load">
          <TabsList className="bg-card flex-wrap">
            <TabsTrigger value="load">Загрузка</TabsTrigger>
            <TabsTrigger value="subs">Сервисы</TabsTrigger>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="templates">Шаблоны</TabsTrigger>
            <TabsTrigger value="health">Здоровье</TabsTrigger>
          </TabsList>

          {/* Load tab */}
          <TabsContent value="load" className="space-y-4 pt-4">
            <div className="space-y-3">
              {loadData.map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="w-20 text-right text-sm text-muted-foreground truncate">{d.id}</span>
                  <div className="flex-1 rounded-full bg-card h-5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: barColor(d.pct) }} />
                  </div>
                  <span className="w-10 text-sm font-medium">{d.pct}%</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Рекомендация: <span className="text-[hsl(var(--destructive))]">ppx-1 &gt; 70%</span> → рассмотреть ppx-4
            </p>
            <p className="text-sm text-muted-foreground">Очереди за неделю: 4 (avg 6 мин)</p>
          </TabsContent>

          {/* Services tab */}
          <TabsContent value="subs">
            <ServicesTab />
          </TabsContent>

          {/* Users tab */}
          <TabsContent value="users" className="pt-4">
            <div className="rounded-xl border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Telegram</TableHead>
                    <TableHead>Сессий за неделю</TableHead>
                    <TableHead>Часов</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.tg}</TableCell>
                      <TableCell>{u.sessions}</TableCell>
                      <TableCell>{u.hours}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Templates tab */}
          <TabsContent value="templates" className="pt-4 space-y-4">
            <div className="rounded-xl border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Слоты</TableHead>
                    <TableHead>Создатель</TableHead>
                    <TableHead>Использований/нед</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateRows.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground">{t.slots}</TableCell>
                      <TableCell>{t.creator}</TableCell>
                      <TableCell>{t.usage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button onClick={() => setShowCreate(true)}>+ Создать шаблон</Button>
          </TabsContent>

          {/* Health tab */}
          <TabsContent value="health">
            <HealthTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create template modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Создать шаблон</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Название</Label>
              <Input className="mt-1" value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Мой шаблон" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Иконка</Label>
              <Select value={tplIcon} onValueChange={setTplIcon}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {iconOptions.map((ic) => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Слоты</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {allServiceNames.map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={tplSlots.has(s)} onCheckedChange={() => toggleSlot(s)} />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">URL (опционально)</Label>
              <Input className="mt-1" value={tplUrl} onChange={(e) => setTplUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!tplName}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminScreen;
