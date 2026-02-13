import { useState, useEffect, useRef, useCallback } from "react";
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
import { Maximize2, Minimize2, WifiOff } from "lucide-react";

interface SlotFromApi {
  id: string;
  service_name: string;
  available: boolean;
  occupant_name: string | null;
  session_minutes: number | null;
}

interface OccupyData {
  session_id: number;
  slot_id: string;
  started_at: string;
  guacamole_url: string;
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [disconnected, setDisconnected] = useState(false);

  // Get guacamole_url from query cache (set by DashboardScreen occupy mutation)
  const cachedOccupy = queryClient.getQueryData<OccupyData>(["occupy", slotId]);
  const guacamoleUrl = cachedOccupy?.guacamole_url || `/guacamole/#/client/${slotId}`;

  // Fetch slot info for name and timer
  const { data: slots = [] } = useQuery<SlotFromApi[]>({
    queryKey: ["slots"],
    queryFn: () => api.get<SlotFromApi[]>("/slots"),
  });

  const slot = slots.find((s) => s.id === slotId);
  const slotName = slot?.service_name ?? slotId ?? "Unknown";

  // Initialize timer from session_minutes
  useEffect(() => {
    if (slot?.session_minutes != null) {
      setElapsed(slot.session_minutes * 60);
    }
  }, [slot?.session_minutes]);

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Release mutation
  const releaseMutation = useMutation({
    mutationFn: () => api.post<{ ok: boolean; session_id: number }>(`/slots/${slotId}/release`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      navigate(`/session/${slotId}/end?sid=${data.session_id}`);
    },
  });

  const handleRelease = () => releaseMutation.mutate();

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Detect iframe disconnect (check if iframe loads or errors)
  const handleIframeLoad = () => setDisconnected(false);
  const handleIframeError = () => setDisconnected(true);

  const handleReconnect = () => {
    setDisconnected(false);
    if (iframeRef.current) {
      iframeRef.current.src = guacamoleUrl;
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[hsl(220,20%,8%)]">
      {/* Top overlay bar */}
      <div className="flex h-14 md:h-12 items-center justify-between bg-background/80 px-4 backdrop-blur z-10">
        <div className="flex items-center gap-2 text-sm font-medium truncate max-w-[30%]">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--success))] animate-pulse-dot" />
          <span className="truncate">{slotName}</span>
        </div>
        <span className="font-mono text-sm text-muted-foreground">{formatElapsed(elapsed)}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={toggleFullscreen} className="md:h-9 h-12 w-12 md:w-auto px-2">
            {isFullscreen ? <Minimize2 className="h-5 w-5 md:h-4 md:w-4" /> : <Maximize2 className="h-5 w-5 md:h-4 md:w-4" />}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setShowConfirm(true)} className="md:h-9 h-12 text-base md:text-sm px-4 md:px-3 font-semibold">
            Освободить
          </Button>
        </div>
      </div>

      {/* Guacamole iframe */}
      <div className="relative flex-1">
        <iframe
          ref={iframeRef}
          src={guacamoleUrl}
          title="VDI Remote Desktop"
          className="absolute inset-0 h-full w-full border-0"
          allow="clipboard-read; clipboard-write"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />

        {/* Disconnect overlay */}
        {disconnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-20">
            <WifiOff className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Соединение потеряно</p>
            <p className="text-sm text-muted-foreground mb-4">Удалённый рабочий стол не отвечает</p>
            <Button onClick={handleReconnect}>Переподключиться</Button>
          </div>
        )}
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
