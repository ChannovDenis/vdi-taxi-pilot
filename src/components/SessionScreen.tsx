import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SlotFromApi {
  id: string;
  service_name: string;
  available: boolean;
  occupant_name: string | null;
  session_minutes: number | null;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SessionScreen = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Fetch slot info to get service name and session start
  const { data: slots = [] } = useQuery<SlotFromApi[]>({
    queryKey: ["slots"],
    queryFn: () => api.get<SlotFromApi[]>("/slots"),
  });

  const slot = slots.find((s) => s.id === slotId);
  const slotName = slot?.service_name ?? slotId ?? "Unknown";

  // Initialize timer from session_minutes when slot data arrives
  useEffect(() => {
    if (slot?.session_minutes != null) {
      setElapsed(slot.session_minutes * 60);
    }
  }, [slot?.session_minutes]);

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Release mutation
  const releaseMutation = useMutation({
    mutationFn: () => api.post(`/slots/${slotId}/release`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      navigate(`/session/${slotId}/end`);
    },
  });

  const handleRelease = () => {
    releaseMutation.mutate();
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[hsl(220,20%,8%)]">
      {/* Overlay bar */}
      <div className="flex h-12 items-center justify-between bg-background/80 px-4 backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[hsl(var(--success))] animate-pulse-dot" />
          {slotName}
        </div>
        <span className="font-mono text-sm text-muted-foreground">{formatElapsed(elapsed)}</span>
        <Button size="sm" variant="destructive" onClick={() => setShowConfirm(true)} className="md:h-9 h-12">
          Освободить
        </Button>
      </div>

      {/* Desktop placeholder */}
      <div className="flex flex-1 items-center justify-center">
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <p className="text-lg">Удалённый рабочий стол</p>
          <p className="mt-1 text-sm">Chrome с залогиненным {slotName.split(" —")[0]}</p>
        </div>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Завершить сессию?</AlertDialogTitle>
            <AlertDialogDescription>Артефакты будут отправлены в Telegram</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleRelease} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Да, завершить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SessionScreen;
