import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const vms = [
  { name: "VM-1", online: true, occupant: "Анна — PPX#1", uptime: "4д 12ч", reboot: true },
  { name: "VM-2", online: true, occupant: "Иван — PPX#2", uptime: "2д 8ч", reboot: false },
  { name: "VM-3", online: true, occupant: "Свободна", uptime: "6д 1ч", reboot: false },
  { name: "VM-4", online: false, occupant: "—", uptime: "—", reboot: true },
  { name: "VM-5", online: true, occupant: "Свободна", uptime: "3д 5ч", reboot: false },
];

const services = [
  { name: "Perplexity #1", status: "ok" },
  { name: "Perplexity #2", status: "ok" },
  { name: "Perplexity #3", status: "ok" },
  { name: "Gemini DT", status: "ok" },
  { name: "Nano Banana", status: "ok" },
  { name: "Veo+Flow", status: "warn" },
  { name: "NotebookLM", status: "ok" },
  { name: "ChatGPT", status: "ok" },
  { name: "Higgsfield", status: "error" },
  { name: "Lovable", status: "ok" },
];

const statusLabel = (s: string) => {
  if (s === "ok") return { text: "Активна", color: "hsl(var(--success))", icon: <CheckCircle className="h-3.5 w-3.5" /> };
  if (s === "warn") return { text: "Cookie истекла", color: "hsl(45, 93%, 47%)", icon: <AlertTriangle className="h-3.5 w-3.5" /> };
  return { text: "Ошибка", color: "hsl(var(--destructive))", icon: <XCircle className="h-3.5 w-3.5" /> };
};

const HealthTab = () => {
  const { toast } = useToast();

  return (
    <div className="space-y-6 pt-4">
      {/* VM Cards */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-widest">Виртуальные машины</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {vms.map((vm) => (
            <div key={vm.name} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-foreground">{vm.name}</span>
                <span className="flex items-center gap-1 text-xs">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: vm.online ? "hsl(var(--success))" : "hsl(var(--destructive))" }} />
                  {vm.online ? "Online" : "Offline"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{vm.occupant}</p>
              <p className="text-xs text-muted-foreground">Uptime: {vm.uptime}</p>
              {vm.reboot && (
                <Button
                  size="sm"
                  variant={vm.online ? "outline" : "destructive"}
                  className="w-full gap-1"
                  onClick={() => toast({ title: "Перезагрузка", description: `${vm.name} перезагружается...` })}
                >
                  <RefreshCw className="h-3 w-3" /> Перезагрузить
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* VPN */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-widest">VPN</h3>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Wifi className="h-5 w-5 text-[hsl(var(--success))]" />
          <div>
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
              Connected
            </p>
            <p className="text-xs text-muted-foreground">IP: 185.156.xx.xx</p>
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-widest">Статус сервисов</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {services.map((s) => {
            const st = statusLabel(s.status);
            return (
              <div key={s.name} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5">
                <span className="text-sm text-foreground">{s.name}</span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: st.color }}>
                  {st.icon} {st.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HealthTab;
