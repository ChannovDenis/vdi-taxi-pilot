import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ServiceRow {
  service: string;
  plan: string;
  cost: string;
  renewal: string;
  status: string;
  active: boolean;
  url: string;
  login: string;
  password: string;
  category: string;
}

const initialServices: ServiceRow[] = [
  { service: "Perplexity Max #1", plan: "Max", cost: "$200", renewal: "15 фев 2026", status: "Активен", active: true, url: "https://perplexity.ai", login: "user1@mail.com", password: "pass123", category: "Ресерч" },
  { service: "Perplexity Max #2", plan: "Max", cost: "$200", renewal: "15 фев 2026", status: "Активен", active: true, url: "https://perplexity.ai", login: "user2@mail.com", password: "pass123", category: "Ресерч" },
  { service: "Perplexity Max #3", plan: "Max", cost: "$200", renewal: "15 фев 2026", status: "Активен", active: true, url: "https://perplexity.ai", login: "user3@mail.com", password: "pass123", category: "Ресерч" },
  { service: "Gemini Ultra — Deep Think", plan: "Ultra", cost: "$250", renewal: "20 фев 2026", status: "Активен", active: true, url: "https://gemini.google.com", login: "admin@gmail.com", password: "gem456", category: "Google AI" },
  { service: "Nano Banana Pro", plan: "Pro", cost: "$200", renewal: "20 фев 2026", status: "Активен", active: true, url: "https://nanobanana.ai", login: "admin@gmail.com", password: "nb789", category: "Google AI" },
  { service: "Veo + Flow", plan: "Ultra", cost: "$250", renewal: "20 фев 2026", status: "Активен", active: true, url: "https://veo.google.com", login: "admin@gmail.com", password: "veo321", category: "Видео" },
  { service: "NotebookLM + Drive", plan: "Ultra", cost: "$250", renewal: "20 фев 2026", status: "Активен", active: true, url: "https://notebooklm.google.com", login: "admin@gmail.com", password: "nb654", category: "Google AI" },
  { service: "ChatGPT Pro — o3-pro", plan: "Pro", cost: "$200", renewal: "10 фев 2026", status: "Активен", active: true, url: "https://chatgpt.com", login: "admin@openai.com", password: "gpt987", category: "Reasoning" },
  { service: "Higgsfield Ultimate", plan: "Ultimate", cost: "$99", renewal: "01 мар 2026", status: "Активен", active: true, url: "https://higgsfield.ai", login: "user@hf.com", password: "hf111", category: "Видео" },
  { service: "Lovable Team", plan: "Team", cost: "$100", renewal: "01 мар 2026", status: "Активен", active: true, url: "https://lovable.dev", login: "team@lovable.dev", password: "lov222", category: "Код" },
];

const categories = ["Ресерч", "Google AI", "Reasoning", "Видео", "Код"];

const URL_REGEX = /^https?:\/\/.+/;

interface FormErrors {
  service?: string;
  url?: string;
  login?: string;
  cost?: string;
}

const ServicesTab = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Form state
  const [form, setForm] = useState({ service: "", category: "", url: "", login: "", password: "", cost: "", active: true });

  const openEdit = (i: number) => {
    const s = services[i];
    setForm({ service: s.service, category: s.category, url: s.url, login: s.login, password: s.password, cost: s.cost, active: s.active });
    setShowPwd(false);
    setFormErrors({});
    setEditIndex(i);
  };

  const openAdd = () => {
    setForm({ service: "", category: "Ресерч", url: "", login: "", password: "", cost: "", active: true });
    setShowPwd(false);
    setFormErrors({});
    setShowAdd(true);
  };

  const validateForm = (): boolean => {
    const errs: FormErrors = {};
    if (!form.service.trim()) errs.service = "Введите название";
    if (form.url && !URL_REGEX.test(form.url)) errs.url = "URL должен начинаться с http:// или https://";
    if (!form.login.trim()) errs.login = "Введите логин";
    if (!form.cost.trim()) errs.cost = "Введите стоимость";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    if (editIndex !== null) {
      setServices((prev) => prev.map((s, i) => i === editIndex ? { ...s, ...form } : s));
      toast({ title: "Сохранено", description: form.service });
      setEditIndex(null);
    }
  };

  const handleAdd = () => {
    if (!validateForm()) return;
    setServices((prev) => [...prev, { ...form, plan: "—", renewal: "—", status: form.active ? "Активен" : "Отключён" }]);
    toast({ title: "Сервис добавлен", description: form.service });
    setShowAdd(false);
  };

  const toggleActive = (i: number) => {
    setServices((prev) => prev.map((s, idx) => idx === i ? { ...s, active: !s.active, status: s.active ? "Отключён" : "Активен" } : s));
  };

  const modalOpen = editIndex !== null || showAdd;

  const clearError = (field: keyof FormErrors) => {
    setFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const formUI = (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Название</Label>
        <Input className="mt-1" value={form.service} onChange={(e) => { setForm({ ...form, service: e.target.value }); clearError("service"); }} />
        {formErrors.service && <p className="mt-1 text-xs text-destructive">{formErrors.service}</p>}
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
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сервис</TableHead>
              <TableHead>Тариф</TableHead>
              <TableHead>$/мес</TableHead>
              <TableHead>Следующее списание</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{s.service}</TableCell>
                <TableCell>{s.plan}</TableCell>
                <TableCell>{s.cost}</TableCell>
                <TableCell>{s.renewal}</TableCell>
                <TableCell className={s.active ? "text-[hsl(var(--success))]" : "text-muted-foreground"}>{s.status}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(i)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <Switch checked={s.active} onCheckedChange={() => toggleActive(i)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit / Add modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) { setEditIndex(null); setShowAdd(false); } }}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? "Редактировать сервис" : "Добавить сервис"}</DialogTitle>
          </DialogHeader>
          {formUI}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setEditIndex(null); setShowAdd(false); }}>Отмена</Button>
            <Button onClick={editIndex !== null ? handleSave : handleAdd} disabled={!form.service}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesTab;
