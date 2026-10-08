// Adapted from DavidHDev/react-bits SpotlightCard. See THIRD_PARTY_NOTICES.md.
import { useRef, type PropsWithChildren, type MouseEvent } from "react";
import { useReducedMotion } from "@/hooks/useMotion";
export function SpotlightCard({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  function move(event: MouseEvent<HTMLDivElement>) {
    if (!ref.current || reduced) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty(
      "--mouse-x",
      `${event.clientX - rect.left}px`,
    );
    ref.current.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
  }
  return (
    <div ref={ref} onMouseMove={move} className={`spotlight-card ${className}`}>
      {children}
    </div>
  );
}
