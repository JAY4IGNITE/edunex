// Origin UI (legacy MIT snapshot), adapted for CampusPulse controls.
// Source: origin-space/originui/apps/origin/registry/default/ui/select-native.tsx
import { ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function SelectNative({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <div className="relative flex w-full">
      <select
        className={cn(
          "peer inline-flex w-full cursor-pointer appearance-none items-center rounded-md border border-input text-foreground text-sm shadow-xs transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 h-9 ps-3 pe-8",
          className,
        )}
        data-slot="select-native"
        {...props}
      >
        {children}
      </select>
      {!props.multiple && (
        <span className="pointer-events-none absolute inset-y-0 end-0 flex h-full w-6 items-center justify-center text-muted-foreground/80 peer-disabled:opacity-50">
          <ChevronDownIcon aria-hidden="true" size={13} />
        </span>
      )}
    </div>
  );
}
