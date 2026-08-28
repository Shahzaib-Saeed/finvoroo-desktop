import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight section jump nav — no auto-scroll jank, minimal transitions.
 */
export function ReportSectionJumpNav({ sections = [], inline = false }) {
  const [activeId, setActiveId] = useState(sections[0]?.targetId ?? null);
  const navRef = useRef(null);

  useEffect(() => {
    if (!sections.length) return;

    const targets = sections
      .map((s) => document.getElementById(s.targetId))
      .filter(Boolean);

    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-140px 0px -50% 0px",
        threshold: [0.2],
      },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  const jumpTo = (targetId) => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setActiveId(targetId);
    el.scrollIntoView({ behavior: "auto", block: "start" });
  };

  return (
    <nav
      ref={navRef}
      aria-label="Jump to report section"
      className={cn(
        "min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        inline ? "flex-1" : "",
      )}
    >
      <div className="flex w-max items-center gap-1.5 pr-1">
        {sections.map((section) => {
          const isActive = activeId === section.targetId;

          return (
            <button
              key={`${section.targetId}-${section.label}`}
              type="button"
              data-section={section.targetId}
              onClick={() => jumpTo(section.targetId)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900",
              )}
            >
              {section.dot ? (
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    isActive ? "bg-white" : section.dot,
                  )}
                />
              ) : null}
              <span className="whitespace-nowrap">{section.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const REPORT_SECTION_SCROLL_CLASS = "scroll-mt-[10.5rem]";
