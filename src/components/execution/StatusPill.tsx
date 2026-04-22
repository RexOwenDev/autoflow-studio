import {
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  RotateCcw,
  XCircle,
  XOctagon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ExecutionStatus } from "@/types/database";

const CONFIG: Record<
  ExecutionStatus,
  {
    variant: "default" | "success" | "warning" | "destructive" | "info" | "secondary";
    icon: typeof CheckCircle2;
    label: string;
  }
> = {
  success: { variant: "success", icon: CheckCircle2, label: "Success" },
  failed: { variant: "destructive", icon: XCircle, label: "Failed" },
  retrying: { variant: "warning", icon: RotateCcw, label: "Retrying" },
  running: { variant: "info", icon: Loader2, label: "Running" },
  queued: { variant: "warning", icon: Clock, label: "Queued" },
  cancelled: { variant: "secondary", icon: XOctagon, label: "Cancelled" },
};

export function StatusPill({
  status,
  compact = false,
}: {
  status: ExecutionStatus;
  compact?: boolean;
}) {
  const cfg = CONFIG[status] ?? {
    variant: "secondary",
    icon: CircleDashed,
    label: status,
  };
  const Icon = cfg.icon;
  const spin = status === "running" || status === "retrying";
  return (
    <Badge variant={cfg.variant} className={compact ? "text-[10px] px-1.5 py-0" : ""}>
      <Icon className={`w-3 h-3 mr-1 ${spin ? "animate-spin" : ""}`} />
      {cfg.label}
    </Badge>
  );
}
