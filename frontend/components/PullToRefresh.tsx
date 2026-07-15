"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDrag } from "@use-gesture/react";
import { RefreshCw } from "lucide-react";
import { haptic } from "@/lib/haptics";

const THRESHOLD = 64;

// Wraps a list-heavy page in a native-feeling pull-to-refresh gesture. Only
// triggers when the drag starts at the top of the scroll container (or
// window, for pages without their own scroll container), so it never fights
// normal scrolling further down the page.
//
// onRefresh is optional so Server Component pages (which can't pass a plain
// function prop across the server/client boundary) can drop this in with no
// prop at all — it falls back to router.refresh(), Next's own re-fetch of
// server data for the current route.
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh?: () => Promise<void> | void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggeredRef = useRef(false);

  const bind = useDrag(
    ({ down, movement: [, my], first, last, cancel }) => {
      if (refreshing) {
        cancel();
        return;
      }
      const atTop = (containerRef.current?.scrollTop ?? window.scrollY) <= 0;
      if (first && !atTop) {
        cancel();
        return;
      }
      if (my < 0) {
        setPull(0);
        return;
      }

      if (down) {
        setPull(Math.min(my, THRESHOLD * 1.6));
        if (my > THRESHOLD && !triggeredRef.current) {
          triggeredRef.current = true;
          haptic(15);
        }
      }

      if (last) {
        if (my > THRESHOLD) {
          setRefreshing(true);
          setPull(THRESHOLD);
          Promise.resolve(onRefresh ? onRefresh() : router.refresh()).finally(() => {
            setRefreshing(false);
            setPull(0);
            triggeredRef.current = false;
          });
        } else {
          setPull(0);
          triggeredRef.current = false;
        }
      }
    },
    { axis: "y", filterTaps: true },
  );

  // Deliberately no touch-action override here (unlike SwipeableRow's
  // touch-pan-y): this div wraps the page's entire scrollable content, so
  // restricting touch-action would block normal vertical scrolling for
  // everything below the fold. The `atTop` check above is what scopes the
  // gesture to "already scrolled to the top" instead.
  return (
    <div ref={containerRef} {...bind()} className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 -top-10 flex justify-center"
        style={{ opacity: pull > 4 ? 1 : 0, transform: `translateY(${Math.min(pull, THRESHOLD)}px)` }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft">
          <RefreshCw
            className={`h-4 w-4 text-ink/40 ${refreshing ? "animate-spin" : ""}`}
            style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
          />
        </div>
      </div>
      <div style={{ transform: `translateY(${pull}px)`, transition: pull === 0 || refreshing ? "transform 0.25s ease" : "none" }}>
        {children}
      </div>
    </div>
  );
}
