"use client";

import { useState, useEffect } from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function Tooltip({ children, content, side = "top" }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-ink/80 border-l-transparent border-r-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-ink/80 border-l-transparent border-r-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-ink/80 border-t-transparent border-b-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-ink/80 border-t-transparent border-b-transparent",
  };

  const handleMouseEnter = () => !isMobile && setIsOpen(true);
  const handleMouseLeave = () => !isMobile && setIsOpen(false);
  const handleTap = (e: React.TouchEvent | React.MouseEvent) => {
    if (isMobile) {
      e.stopPropagation();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleTap}
        onTouchStart={handleTap}
      >
        {children}
      </div>

      {isOpen && (
        <div
          className={`fadeIn pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-ink/80 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg ${positionClasses[side]}`}
        >
          {content}
          <div className={`absolute border-4 ${arrowClasses[side]}`} />
        </div>
      )}
    </div>
  );
}
