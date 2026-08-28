import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Subtle column-boundary handle for report tables.
 * Drag updates locally via onDrag; persist only on mouseup via onDragEnd.
 */
export function ReportColumnResizeHandle({
  columnKey,
  width,
  minWidth,
  maxWidth,
  onDrag,
  onDragEnd,
}) {
  const dragRef = useRef(null);

  useEffect(() => {
    return () => {
      if (dragRef.current) {
        window.removeEventListener("mousemove", dragRef.current.move);
        window.removeEventListener("mouseup", dragRef.current.up);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, []);

  function onMouseDown(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = width;
    let latest = startWidth;

    const move = (e) => {
      const next = Math.round(startWidth + (e.clientX - startX));
      const clamped = Math.min(maxWidth, Math.max(minWidth, next));
      latest = clamped;
      onDrag?.(columnKey, clamped);
    };

    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      dragRef.current = null;
      onDragEnd?.(columnKey, latest);
    };

    dragRef.current = { move, up };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      onMouseDown={onMouseDown}
      className={cn(
        "absolute inset-y-0 -right-px z-20 w-2.5 cursor-col-resize touch-none print:hidden",
        "after:absolute after:inset-y-0.5 after:right-[4px] after:w-px after:bg-slate-300",
        "hover:bg-slate-200/70 hover:after:w-0.5 hover:after:bg-slate-700",
        "group-hover/th:after:bg-slate-500",
      )}
    />
  );
}
