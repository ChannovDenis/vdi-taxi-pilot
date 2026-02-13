import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VmInfo {
  vm_id: string;
  is_healthy: boolean;
  active_user: string | null;
  active_slot: string | null;
  uptime: string | null;
}

interface ServiceStatus {
  slot_id: string;
  service_name: string;
  status: string;
  detail: string | null;
}

interface VpnStatus {
  connected: boolean;
  ip: string | null;
  interface: string;
}

interface HealthData {
  vms: VmInfo[];
  services: ServiceStatus[];
  vpn: VpnStatus;
}

const statusLabel = (s: string) => {
  if (s === "ok") return { text: "Активна", color: "hsl(var(--success))", icon: <CheckCircle className="h-3.5 w-3.5" /> };
  if (s === "warn") return { text: "Cookie истекла", color: "hsl(45, 93%, 47%)", icon: <AlertTriangle className="h-3.5 w-3.5" /> };
  return { text: "Ошибка", color: "hsl(var(--destructive))", icon: <XCircle className="h-3.5 w-3.5" /> };
};

const HealthTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { data: health, isLoading, isFetching } = useQuery<HealthData>({
    queryKey: ["admin-health"],
    queryFn: async () => {
      const data = await api.get<HealthData>("/admin/health");
      setLastRefresh(new Date());
      return data;
    },
    refetchInterval: 30_000, // Refresh every 30s
  });

  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-health"] });
  };

  const rebootMutation = useMutation({
    mutationFn: (vmId: string) => api.post<{ ok: boolean; message: string }>(`/admin/vm/${vmId}/reboot`),
    onSuccess: (data) => {
      toast({
        title: "Перезагрузка",
        description: data.message || "Команда отправлена",
      });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось перезагрузить VM" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const vms = health?.vms ?? [];
  const services = health?.services ?? [];
  const vpn = health?.vpn ?? { connected: false, ip: null, interface: "wg0" };

  const refreshTimeStr = lastRefresh.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="space-y-6 pt-4">
      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Обновлено: {refreshTimeStr} · Авто-обновление каждые 30с
        </span>
        <Button size="sm" variant="outline" onClick={handleManualRefresh} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} /> Обновить
        </Button>
      </div>

      {/* VM Cards */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-widest">Виртуальные машины</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {vms.map((vm) => (
            <div key={vm.vm_id} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-foreground">{vm.vm_id}</span>
                <span className="flex items-center gap-1 text-xs">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: vm.is_healthy ? "hsl(var(--success))" : "hsl(var(--destructive))" }}
                  />
                  {vm.is_healthy ? "Online" : "Offline"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {vm.active_user ? `${vm.active_user}${vm.active_slot ? ` — ${vm.active_slot}` : ""}` : "Свободна"}
              </p>
              {vm.uptime && <p className="text-xs text-muted-foreground">Uptime: {vm.uptime}</p>}
              {!vm.is_healthy && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full gap-1"
                  disabled={rebootMutation.isPending}
                  onClick={() => rebootMutation.mutate(vm.vm_id)}
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
          {vpn.connected ? (
            <Wifi className="h-5 w-5 text-[hsl(var(--success))]" />
          ) : (
            <WifiOff className="h-5 w-5 text-[hsl(var(--destructive))]" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: vpn.connected ? "hsl(var(--success))" : "hsl(var(--destructive))" }}
              />
              {vpn.connected ? "Connected" : "Disconnected"}
            </p>
            {vpn.ip && <p className="text-xs text-muted-foreground">IP: {vpn.ip}</p>}
            <p className="text-xs text-muted-foreground">Interface: {vpn.interface}</p>
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
              <div key={s.slot_id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5">
                <div>
                  <span className="text-sm text-foreground">{s.service_name}</span>
                  {s.detail && <p className="text-xs text-muted-foreground">{s.detail}</p>}
                </div>
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
