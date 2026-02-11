import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface Props {
  slotName: string;
  onBack: () => void;
}

const SessionEndScreen = ({ slotName, onBack }: Props) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-[hsl(var(--success))]" />
        <h1 className="text-2xl font-bold">Сессия завершена</h1>

        {/* Details card */}
        <div className="rounded-xl border bg-card p-4 text-left text-sm space-y-1">
          <Row label="Сервис" value={slotName} />
          <Row label="Время" value="13:42 – 14:18 (36 мин)" />
          <Row label="Вкладок сохранено" value="4" />
          <Row label="Файлов" value="1" />
        </div>

        {/* Telegram message */}
        <div className="text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Отправлено в Telegram
          </p>
          <div className="rounded-xl bg-[hsl(217,33%,22%)] p-4 text-sm leading-relaxed text-foreground">
            🔚 Сессия завершена{"\n"}
            Сервис: {slotName}{"\n"}
            Время: 13:42–14:18 (36 мин){"\n"}
            📎 session_summary.md{"\n"}
            📁 Файлы: files.company.ru/s/anna/...
          </div>
        </div>

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
