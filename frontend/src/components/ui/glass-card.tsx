import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({
  variant = "default",
  className,
  ...props
}: ComponentProps<"div"> & {
  variant?:
    "default" | "elevated" | "interactive" | "highlight" | "danger" | "success";
}) {
  return (
    <div
      className={cn("panel glass-card", `glass-${variant}`, className)}
      {...props}
    />
  );
}
