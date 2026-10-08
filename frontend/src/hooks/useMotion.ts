import { useEffect, useRef, useSyncExternalStore } from "react";
import gsap from "gsap";
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(motionQuery).matches,
    () => true,
  );
}
export function useEntrance(dependency: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const targets = ref.current?.querySelectorAll("[data-reveal]");
      if (targets?.length)
        gsap.fromTo(
          targets,
          { opacity: 0, y: 9 },
          {
            opacity: 1,
            y: 0,
            duration: 0.38,
            stagger: 0.055,
            ease: "power2.out",
            clearProps: "all",
          },
        );
    });
    return () => media.revert();
  }, [dependency]);
  return ref;
}
