import { ConnectionStatus } from "@/hooks/useRealtimeUpdates";
import { CircleDot, WifiOff, RefreshCcw } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

export function LiveIndicator({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <Tooltip content="Receiving live campus updates">
        <div 
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          role="status"
          aria-label="Real-time connected"
        >
          <CircleDot className="h-3.5 w-3.5 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
          <span className="hidden sm:inline">Live</span>
        </div>
      </Tooltip>
    );
  }

  if (status === "reconnecting") {
    return (
      <Tooltip content="Reconnecting to real-time updates...">
        <div 
          className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400"
          role="status"
          aria-label="Real-time reconnecting"
        >
          <RefreshCcw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span className="hidden sm:inline">Reconnecting</span>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="Real-time updates unavailable">
      <div 
        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500"
        role="status"
        aria-label="Real-time offline"
      >
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Offline</span>
      </div>
    </Tooltip>
  );
}
