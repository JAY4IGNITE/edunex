import type { ConnectionStatus } from "@/hooks/useRealtimeUpdates";
import { CircleDot, WifiOff, RefreshCcw } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

const states = {
  connected: { label: "Live", description: "Receiving live campus updates", icon: CircleDot },
  reconnecting: { label: "Reconnecting", description: "Reconnecting to live updates. You can continue browsing.", icon: RefreshCcw },
  offline: { label: "Offline", description: "Real-time updates unavailable", icon: WifiOff },
};

export function LiveIndicator({ status }: { status: ConnectionStatus }) {
  const { label, description, icon: Icon } = states[status];
  return (
    <Tooltip content={description}>
      <div className="live-indicator" data-status={status} role="status" aria-label={`Real-time ${status}`} tabIndex={0}>
        <Icon size={15} aria-hidden="true" />
        <span>{label}</span>
      </div>
    </Tooltip>
  );
}
