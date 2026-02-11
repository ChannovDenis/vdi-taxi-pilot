import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface Props {
  onBack: () => void;
}

const loadData = [
  { id: "ppx-1", pct: 78 },
  { id: "ppx-2", pct: 61 },
  { id: "ppx-3", pct: 42 },
  { id: "gem-1", pct: 33 },
  { id: "gem-2", pct: 22 },
  { id: "gpt-1", pct: 51 },
  { id: "hf-1", pct: 11 },
];

const subscriptions = [
  { service: "Perplexity Max #1", plan: "Max", cost: "$200", renewal: "15 фев 2026", status: "Активен" },
  { service: "Perplexity Max #2", plan: "Max", cost: "$200", renewal: "15 фев 2026", status: "Активен" },
  { service: "Perplexity Max #3", plan: "Max", cost: "$200", renewal: "15 фев 2026", status: "Активен" },
  { service: "Gemini Ultra — NB + Drive", plan: "Ultra", cost: "$250", renewal: "20 фев 2026", status: "Активен" },
  { service: "Gemini Ultra — Veo + Flow", plan: "Ultra", cost: "$250", renewal: "20 фев 2026", status: "Активен" },
  { service: "ChatGPT Pro", plan: "Pro", cost: "$200", renewal: "10 фев 2026", status: "Активен" },
  { service: "Higgsfield Ultimate", plan: "Ultimate", cost: "$99", renewal: "01 мар 2026", status: "Активен" },
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

const barColor = (pct: number) =>
  pct > 70 ? "hsl(var(--destructive))" : pct >= 30 ? "hsl(45, 93%, 47%)" : "hsl(var(--success))";

const AdminScreen = ({ onBack }: Props) => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Назад к дашборду
        </Button>

        <h1 className="text-2xl font-bold">Админ-панель</h1>

        <Tabs defaultValue="load">
          <TabsList className="bg-card">
            <TabsTrigger value="load">Загрузка</TabsTrigger>
            <TabsTrigger value="subs">Подписки</TabsTrigger>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
          </TabsList>

          {/* Load tab */}
          <TabsContent value="load" className="space-y-4 pt-4">
            <div className="space-y-3">
              {loadData.map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="w-16 text-right text-sm text-muted-foreground">{d.id}</span>
                  <div className="flex-1 rounded-full bg-card h-5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${d.pct}%`, backgroundColor: barColor(d.pct) }}
                    />
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

          {/* Subscriptions tab */}
          <TabsContent value="subs" className="pt-4">
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сервис</TableHead>
                    <TableHead>Тариф</TableHead>
                    <TableHead>$/мес</TableHead>
                    <TableHead>Следующее списание</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.service}</TableCell>
                      <TableCell>{s.plan}</TableCell>
                      <TableCell>{s.cost}</TableCell>
                      <TableCell>{s.renewal}</TableCell>
                      <TableCell className="text-[hsl(var(--success))]">{s.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Users tab */}
          <TabsContent value="users" className="pt-4">
            <div className="rounded-xl border bg-card">
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
        </Tabs>
      </div>
    </div>
  );
};

export default AdminScreen;
