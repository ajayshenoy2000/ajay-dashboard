"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

// Despite the name (kept for import stability), this now renders a CENTERED
// modal card rather than a bottom-anchored sheet: the old bottom sheet could
// render partly below the fold / under the keyboard on mobile, forcing a
// scroll to reach its controls. Centering + an internal max-height scroll
// guarantees the whole dialog is always on-screen.
export function BottomSheet({ open, onClose, title, children, maxWidthClass = "max-w-md" }: BottomSheetProps) {
  // Lock body scroll while open so the backdrop doesn't scroll behind the modal.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      style={{ paddingBottom: "max(1rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[85vh] overflow-y-auto overscroll-contain rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(24,33,31,0.28)]`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalPop 0.22s cubic-bezier(0.34,1.4,0.64,1) both" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          {title ? <h2 className="text-lg font-bold">{title}</h2> : <span />}
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/40 transition hover:bg-mist hover:text-ink/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
