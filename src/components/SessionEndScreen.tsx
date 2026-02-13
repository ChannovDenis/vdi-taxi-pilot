import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

interface SessionSummaryData {
  id: number;
  slot_id: string;
  service_name: string;
  started_at: string;
  ended_at: string | null;
  duration_min: number;
  end_reason: string | null;
  dump_sent: boolean;
  tabs_count: number;
  files_count: number;
  telegram_status: string;
}

function formatTimeRange(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
  return `${fmt(start)} – ${fmt(end)} (${diffMin} мин)`;
}

const SessionEndScreen = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("sid");

  const { data: summary, isLoading } = useQuery<SessionSummaryData>({
    queryKey: ["session-summary", sessionId],
    queryFn: () => api.get<SessionSummaryData>(`/sessions/${sessionId}/summary`),
    enabled: !!sessionId,
  });

  const onBack = () => navigate("/dashboard");

  const serviceName = summary?.service_name ?? slotId ?? "Unknown";
  const timeRange = summary ? formatTimeRange(summary.started_at, summary.ended_at) : "—";
  const telegramStatusText =
    summary?.telegram_status === "sent" ? "Отправлено в Telegram" :
    summary?.telegram_status === "pending" ? "Ожидает отправки" :
    summary?.telegram_status === "error" ? "Ошибка отправки" :
    "Telegram не привязан";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-[hsl(var(--success))]" />
        <h1 className="text-2xl font-bold">Сессия завершена</h1>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Details card */}
            <div className="rounded-xl border bg-card p-4 text-left text-sm space-y-1">
              <Row label="Сервис" value={serviceName} />
              <Row label="Время" value={timeRange} />
              <Row label="Вкладок сохранено" value={String(summary?.tabs_count ?? 0)} />
              <Row label="Файлов" value={String(summary?.files_count ?? 0)} />
            </div>

            {/* Telegram message */}
            <div className="text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {telegramStatusText}
              </p>
              <div className="rounded-xl bg-[hsl(217,33%,22%)] p-4 text-sm leading-relaxed text-foreground whitespace-pre-line">
                {"🔚 Сессия завершена\n"}
                {`Сервис: ${serviceName}\n`}
                {`Время: ${timeRange}\n`}
                {summary?.tabs_count ? `📎 Вкладок: ${summary.tabs_count}\n` : ""}
                {summary?.files_count ? `📁 Файлов: ${summary.files_count}` : ""}
              </div>
            </div>
          </>
        )}

        <Button onClick={onBack} className="w-full">
          Вернуться на дашборд
        </Button>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

export default SessionEndScreen;
