import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * Edge-of-screen swipe-back gesture for the mobile PWA.
 * Starts on a touch within 24px of the left edge; if the user drags right
 * past the threshold (or with enough velocity), navigates back.
 * Skips while inside an open input, a horizontally-scrollable element,
 * or any element marked data-noswipe.
 */
export function SwipeBackProvider() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;
    let overlay: HTMLDivElement | null = null;

    const isScrollable = (el: Element | null): boolean => {
      let n: Element | null = el;
      while (n && n !== document.body) {
        const cs = getComputedStyle(n);
        if (
          (cs.overflowX === "auto" || cs.overflowX === "scroll") &&
          (n as HTMLElement).scrollWidth > (n as HTMLElement).clientWidth
        ) return true;
        if ((n as HTMLElement).dataset?.noswipe != null) return true;
        n = n.parentElement;
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (t.clientX > 24) return; // edge swipe only
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (isScrollable(e.target as Element)) return;
      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
      tracking = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0]; if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) { tracking = false; return; }
      if (dx <= 0) return;
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.18);z-index:9999;pointer-events:none;transition:opacity .12s;";
        document.body.appendChild(overlay);
      }
      const f = Math.min(dx / window.innerWidth, 0.4);
      overlay.style.opacity = String(f);
    };
    const cleanupOverlay = () => {
      if (overlay) { overlay.remove(); overlay = null; }
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking) { cleanupOverlay(); return; }
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t ? t.clientX - startX : 0;
      const dt = Date.now() - startT;
      cleanupOverlay();
      const fast = dx > 30 && dt > 0 && dx / dt > 0.4;
      if (dx > 80 || fast) {
        try { router.history.back(); } catch {}
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", () => { tracking = false; cleanupOverlay(); }, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      cleanupOverlay();
    };
  }, [router]);

  return null;
}