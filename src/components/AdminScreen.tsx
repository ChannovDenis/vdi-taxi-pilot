import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
import { ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import HealthTab from "@/components/admin/HealthTab";
import ServicesTab from "@/components/admin/ServicesTab";

/* ───── Types ───── */

interface SlotFromApi {
  id: string;
  service_name: string;
}

interface TemplateFromApi {
  id: number;
  name: string;
  icon: string;
  slot_ids: string[];
  url: string | null;
  usage_count: number;
  created_by: number | null;
}

interface StatsData {
  slot_id: string;
  pct: number;
  recommendation: string | null;
}

interface UserData {
  name: string;
  telegram_id: string | null;
  sessions_week: number;
  hours_week: number;
}

/* ───── Static ───── */

const iconOptions = ["🔍", "📊", "🎬", "📝", "💡", "🎯"];

const barColor = (pct: number) =>
  pct > 70 ? "hsl(var(--destructive))" : pct >= 30 ? "hsl(45, 93%, 47%)" : "hsl(var(--success))";

/* ───── Component ───── */

const AdminScreen = () => {
  const navigate = useNavigate();
  const onBack = () => navigate("/dashboard");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplIcon, setTplIcon] = useState("🔍");
  const [tplSlots, setTplSlots] = useState<Set<string>>(new Set());
  const [tplUrl, setTplUrl] = useState("");

  // Fetch slots for template creation
  const { data: slots = [] } = useQuery<SlotFromApi[]>({
    queryKey: ["slots"],
    queryFn: () => api.get<SlotFromApi[]>("/slots"),
  });

  // Fetch templates
  const { data: templates = [] } = useQuery<TemplateFromApi[]>({
    queryKey: ["templates"],
    queryFn: () => api.get<TemplateFromApi[]>("/templates"),
  });

  // Fetch stats
  const { data: stats = [] } = useQuery<StatsData[]>({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<StatsData[]>("/admin/stats"),
  });

  // Fetch users
  const { data: users = [] } = useQuery<UserData[]>({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<UserData[]>("/admin/users"),
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (body: { name: string; icon: string; slot_ids: string[]; url?: string }) =>
      api.post<TemplateFromApi>("/templates", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Шаблон создан", description: tplName });
      setShowCreate(false);
      setTplName("");
      setTplSlots(new Set());
      setTplUrl("");
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Шаблон удалён" });
    },
  });

  const toggleSlot = (s: string) => {
    setTplSlots((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const handleCreate = () => {
    createTemplateMutation.mutate({
      name: tplName,
      icon: tplIcon,
      slot_ids: Array.from(tplSlots),
      url: tplUrl || undefined,
    });
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
              {stats.map((d) => (
                <div key={d.slot_id} className="flex items-center gap-3">
                  <span className="w-20 text-right text-sm text-muted-foreground truncate">{d.slot_id}</span>
                  <div className="flex-1 rounded-full bg-card h-5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: barColor(d.pct) }} />
                  </div>
                  <span className="w-10 text-sm font-medium">{d.pct}%</span>
                </div>
              ))}
            </div>
            {stats.filter((d) => d.recommendation).map((d) => (
              <p key={d.slot_id} className="text-sm text-muted-foreground">
                Рекомендация: <span className="text-[hsl(var(--destructive))]">{d.recommendation}</span>
              </p>
            ))}
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
                      <TableCell className="text-muted-foreground">{u.telegram_id ?? "—"}</TableCell>
                      <TableCell>{u.sessions_week}</TableCell>
                      <TableCell>{u.hours_week}</TableCell>
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
                    <TableHead>Использований</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.icon} {t.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.slot_ids.map((id) => slots.find((s) => s.id === id)?.service_name ?? id).join(", ")}
                      </TableCell>
                      <TableCell>{t.usage_count}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => deleteTemplateMutation.mutate(t.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
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
                {slots.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={tplSlots.has(s.id)} onCheckedChange={() => toggleSlot(s.id)} />
                    <span className="text-sm">{s.service_name}</span>
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
            <Button onClick={handleCreate} disabled={!tplName || tplSlots.size === 0 || createTemplateMutation.isPending}>
              {createTemplateMutation.isPending ? "Создаю..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminScreen;
