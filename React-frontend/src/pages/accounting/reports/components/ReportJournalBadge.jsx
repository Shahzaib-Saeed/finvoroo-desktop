import { cn } from "@/lib/utils";
import { getJournalTypeMeta } from "../journal-type-codes";

/** Theme-aware pill styles per classic journal code. */
const BADGE_TONE = {
  CRJ: "border-primary/20 bg-primary/10 text-primary",
  CDJ: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  SJ: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-300",
  PJ: "border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-300",
  GJ: "border-border bg-muted/60 text-muted-foreground",
  IJ: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  FAJ: "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  PRJ: "border-orange-500/25 bg-orange-500/10 text-orange-800 dark:text-orange-300",
};

function badgeToneClass(code) {
  return BADGE_TONE[code] || BADGE_TONE.GJ;
}

export function ReportJournalBadge({ journalType, hints, className, title }) {
  const meta = getJournalTypeMeta(journalType, hints);
  const label = title || meta.label;

  return (
    <span
      title={label}
      className={cn(
        "inline-flex min-w-[2.25rem] items-center justify-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-wide",
        badgeToneClass(meta.code),
        className,
      )}
    >
      {meta.code}
    </span>
  );
}
