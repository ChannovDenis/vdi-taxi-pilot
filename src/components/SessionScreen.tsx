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
import { Maximize2, Minimize2, WifiOff, AlertTriangle } from "lucide-react";

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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const iframeLoadCount = useRef(0);

  // Fetch a fresh Guacamole auth token on every mount / reconnect
  const [guacamoleUrl, setGuacamoleUrl] = useState<string | null>(null);
  const [guacError, setGuacError] = useState<string | null>(null);

  const fetchGuacToken = useCallback(async () => {
    try {
      setGuacError(null);
      const data = await api.get<{ token: string; client_url: string }>(
        `/slots/guacamole-token?slot_id=${encodeURIComponent(slotId ?? "ppx-1")}`,
      );
      setGuacamoleUrl(data.client_url);
    } catch (err: any) {
      setGuacError(err?.message || "Не удалось получить токен Guacamole");
    }
  }, [slotId]);

  useEffect(() => {
    fetchGuacToken();
  }, [fetchGuacToken]);

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

  // Detect iframe disconnect and Guacamole connection errors
  const handleIframeLoad = useCallback(() => {
    setDisconnected(false);
    iframeLoadCount.current += 1;
    // Guacamole redirects to error page on connection failure, causing rapid reloads
    // or showing its own error page. Detect by checking for rapid re-loads.
    if (iframeLoadCount.current > 3) {
      setConnectionFailed(true);
      return;
    }
    // Also try to detect error page content (cross-origin safe check)
    try {
      const iframe = iframeRef.current;
      if (iframe?.contentDocument) {
        const body = iframe.contentDocument.body?.textContent || "";
        if (body.includes("error") || body.includes("refused") || body.includes("not found")) {
          setConnectionFailed(true);
        }
      }
    } catch {
      // Cross-origin — expected for Guacamole, ignore
    }
  }, []);

  const handleIframeError = () => {
    setConnectionFailed(true);
  };

  // Reset rapid-load counter every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      iframeLoadCount.current = 0;
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  const handleReconnect = async () => {
    setDisconnected(false);
    setConnectionFailed(false);
    iframeLoadCount.current = 0;
    // Get a fresh token before reconnecting
    await fetchGuacToken();
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
        {guacamoleUrl ? (
          <iframe
            ref={iframeRef}
            src={guacamoleUrl}
            title="VDI Remote Desktop"
            className="absolute inset-0 h-full w-full border-0"
            allow="clipboard-read; clipboard-write"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background">
            {guacError ? (
              <>
                <AlertTriangle className="h-14 w-14 text-yellow-500 mb-4" />
                <p className="text-lg font-semibold mb-2">Ошибка подключения</p>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-md px-4">{guacError}</p>
                <Button onClick={fetchGuacToken}>Попробовать снова</Button>
              </>
            ) : (
              <>
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Подключение к рабочему столу…</p>
              </>
            )}
          </div>
        )}

        {/* Connection failed overlay — VDI not configured */}
        {connectionFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 z-20">
            <AlertTriangle className="h-14 w-14 text-yellow-500 mb-4" />
            <p className="text-lg font-semibold mb-2">VM подключается...</p>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md px-4">
              Если ошибка повторяется — VDI-станции ещё не настроены.
              Обратитесь к администратору.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReconnect}>Попробовать снова</Button>
              <Button onClick={() => navigate("/dashboard")}>Вернуться на дашборд</Button>
            </div>
          </div>
        )}

        {/* Disconnect overlay — connection was active but lost */}
        {disconnected && !connectionFailed && (
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
