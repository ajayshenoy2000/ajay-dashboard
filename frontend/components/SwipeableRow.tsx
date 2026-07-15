"use client";

import { useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";
import { Check, Trash2 } from "lucide-react";
import { haptic } from "@/lib/haptics";

const THRESHOLD = 80;

// Generic swipe-right-to-complete / swipe-left-to-delete row, used by
// TaskItem. Either action is optional — pass just one to get a one-directional
// swipe (e.g. delete-only lists).
export function SwipeableRow({
  onComplete,
  onDelete,
  children,
}: {
  onComplete?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const triggeredRef = useRef(false);

  const bind = useDrag(
    ({ down, movement: [mx], last, cancel }) => {
      if (!onComplete && mx > 0) {
        cancel();
        return;
      }
      if (!onDelete && mx < 0) {
        cancel();
        return;
      }
      setDragging(down);
      if (down) {
        setDx(mx);
        if (Math.abs(mx) > THRESHOLD && !triggeredRef.current) {
          triggeredRef.current = true;
          haptic(15);
        }
      }
      if (last) {
        if (mx > THRESHOLD && onComplete) onComplete();
        else if (mx < -THRESHOLD && onDelete) onDelete();
        setDx(0);
        triggeredRef.current = false;
      }
    },
    { axis: "x", filterTaps: true, threshold: 8 },
  );

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-0 flex items-center justify-between rounded-xl bg-mist px-4">
        <span className={`flex items-center gap-1.5 text-xs font-bold text-sage transition-opacity ${dx > 20 ? "opacity-100" : "opacity-0"}`}>
          <Check className="h-4 w-4" /> Complete
        </span>
        <span className={`flex items-center gap-1.5 text-xs font-bold text-coral transition-opacity ${dx < -20 ? "opacity-100" : "opacity-0"}`}>
          Delete <Trash2 className="h-4 w-4" />
        </span>
      </div>
      <div
        {...bind()}
        className="relative touch-pan-y bg-white"
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? "none" : "transform 0.2s ease" }}
      >
        {children}
      </div>
    </div>
  );
}
