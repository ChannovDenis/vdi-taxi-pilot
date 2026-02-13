import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

const SessionScreen = () => {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const slotName = slotId || "Unknown";
  const onEnd = () => navigate(`/session/${slotId}/end`);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col bg-[hsl(220,20%,8%)]">
      {/* Overlay bar */}
      <div className="flex h-12 items-center justify-between bg-background/80 px-4 backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[hsl(var(--success))] animate-pulse-dot" />
          {slotName}
        </div>
        <span className="font-mono text-sm text-muted-foreground">00:14:32</span>
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
            <AlertDialogAction onClick={onEnd} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Да, завершить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SessionScreen;
