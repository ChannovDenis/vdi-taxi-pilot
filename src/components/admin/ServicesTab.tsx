import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ───── Types ───── */

interface SlotAdmin {
  id: string;
  service_name: string;
  tier: string | null;
  category: string;
  category_accent: string;
  monthly_cost: number;
  url: string | null;
  login: string | null;
  password: string | null;
  chrome_profile: string | null;
  is_active: boolean;
}

/* ───── Const ───── */

const categories = ["Ресерч", "Google AI", "Reasoning", "Видео", "Код"];
const URL_REGEX = /^https?:\/\/.+/;

interface FormErrors {
  id?: string;
  service?: string;
  url?: string;
  login?: string;
  cost?: string;
}

/* ───── Component ───── */

const ServicesTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch slots from admin API
  const { data: services = [], isLoading } = useQuery<SlotAdmin[]>({
    queryKey: ["admin", "slots"],
    queryFn: () => api.get<SlotAdmin[]>("/admin/slots"),
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Form state
  const [form, setForm] = useState({
    id: "", service: "", tier: "", category: "Ресерч", url: "", login: "", password: "", cost: "", active: true,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: {
      id: string; service_name: string; tier?: string; category: string;
      monthly_cost: number; url?: string; login?: string; password?: string; is_active: boolean;
    }) => api.post<SlotAdmin>("/admin/slots", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "slots"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast({ title: "Сервис добавлен", description: form.service });
      setShowAdd(false);
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ slotId, body }: {
      slotId: string; body: {
        service_name?: string; tier?: string; category?: string;
        monthly_cost?: number; url?: string; login?: string; password?: string; is_active?: boolean;
      };
    }) => api.put<SlotAdmin>(`/admin/slots/${slotId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "slots"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast({ title: "Сохранено", description: form.service });
      setEditId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (s: SlotAdmin) => {
    setForm({
      id: s.id,
      service: s.service_name,
      tier: s.tier ?? "",
      category: s.category,
      url: s.url ?? "",
      login: s.login ?? "",
      password: s.password ?? "",
      cost: String(s.monthly_cost),
      active: s.is_active,
    });
    setShowPwd(false);
    setFormErrors({});
    setEditId(s.id);
  };

  const openAdd = () => {
    setForm({ id: "", service: "", tier: "", category: "Ресерч", url: "", login: "", password: "", cost: "", active: true });
    setShowPwd(false);
    setFormErrors({});
    setShowAdd(true);
  };

  const validateForm = (isNew: boolean): boolean => {
    const errs: FormErrors = {};
    if (isNew && !form.id.trim()) errs.id = "Введите ID слота (напр. ppx-1)";
    if (!form.service.trim()) errs.service = "Введите название";
    if (form.url && !URL_REGEX.test(form.url)) errs.url = "URL должен начинаться с http:// или https://";
    if (!form.cost.trim()) errs.cost = "Введите стоимость";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validateForm(false)) return;
    if (editId) {
      updateMutation.mutate({
        slotId: editId,
        body: {
          service_name: form.service,
          tier: form.tier || undefined,
          category: form.category,
          monthly_cost: parseFloat(form.cost) || 0,
          url: form.url || undefined,
          login: form.login || undefined,
          password: form.password || undefined,
          is_active: form.active,
        },
      });
    }
  };

  const handleAdd = () => {
    if (!validateForm(true)) return;
    createMutation.mutate({
      id: form.id,
      service_name: form.service,
      tier: form.tier || undefined,
      category: form.category,
      monthly_cost: parseFloat(form.cost) || 0,
      url: form.url || undefined,
      login: form.login || undefined,
      password: form.password || undefined,
      is_active: form.active,
    });
  };

  const toggleActive = (s: SlotAdmin) => {
    updateMutation.mutate({
      slotId: s.id,
      body: { is_active: !s.is_active },
    });
  };

  const modalOpen = editId !== null || showAdd;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const clearError = (field: keyof FormErrors) => {
    setFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const formUI = (
    <div className="space-y-4">
      {showAdd && (
        <div>
          <Label className="text-xs text-muted-foreground">ID слота</Label>
          <Input className="mt-1" value={form.id} onChange={(e) => { setForm({ ...form, id: e.target.value }); clearError("id"); }} placeholder="ppx-4" />
          {formErrors.id && <p className="mt-1 text-xs text-destructive">{formErrors.id}</p>}
        </div>
      )}
      <div>
        <Label className="text-xs text-muted-foreground">Название</Label>
        <Input className="mt-1" value={form.service} onChange={(e) => { setForm({ ...form, service: e.target.value }); clearError("service"); }} />
        {formErrors.service && <p className="mt-1 text-xs text-destructive">{formErrors.service}</p>}
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Тариф</Label>
        <Input className="mt-1" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} placeholder="Max / Pro / Ultra" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Категория</Label>
        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">URL</Label>
        <Input className="mt-1" value={form.url} onChange={(e) => { setForm({ ...form, url: e.target.value }); clearError("url"); }} placeholder="https://..." />
        {formErrors.url && <p className="mt-1 text-xs text-destructive">{formErrors.url}</p>}
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Логин</Label>
        <Input className="mt-1" value={form.login} onChange={(e) => { setForm({ ...form, login: e.target.value }); clearError("login"); }} />
        {formErrors.login && <p className="mt-1 text-xs text-destructive">{formErrors.login}</p>}
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Пароль</Label>
        <div className="relative mt-1">
          <Input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">$/мес</Label>
        <Input className="mt-1" value={form.cost} onChange={(e) => { setForm({ ...form, cost: e.target.value }); clearError("cost"); }} />
        {formErrors.cost && <p className="mt-1 text-xs text-destructive">{formErrors.cost}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        <Label className="text-sm">Активен</Label>
      </div>
    </div>
  );

  return (
    <div className="pt-4 space-y-4">
      <Button onClick={openAdd}>+ Добавить сервис</Button>

      {isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сервис</TableHead>
              <TableHead>Тариф</TableHead>
              <TableHead>$/мес</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.service_name}</TableCell>
                <TableCell>{s.tier ?? "—"}</TableCell>
                <TableCell>${s.monthly_cost}</TableCell>
                <TableCell className="text-muted-foreground">{s.category}</TableCell>
                <TableCell className={s.is_active ? "text-[hsl(var(--success))]" : "text-muted-foreground"}>
                  {s.is_active ? "Активен" : "Отключён"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(s)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="h-3.5 w-3.5" /> Редактировать
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                      <span className="text-xs text-muted-foreground">{s.is_active ? "Вкл" : "Выкл"}</span>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit / Add modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) { setEditId(null); setShowAdd(false); } }}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Редактировать сервис" : "Добавить сервис"}</DialogTitle>
          </DialogHeader>
          {formUI}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setEditId(null); setShowAdd(false); }}>Отмена</Button>
            <Button onClick={editId ? handleSave : handleAdd} disabled={!form.service || isPending}>
              {isPending ? "Сохраняю..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesTab;
