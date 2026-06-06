import { ReactNode } from "react";

type BadgeTone = "green" | "yellow" | "blue" | "slate" | "red";

const tones: Record<BadgeTone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400",
  yellow: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400",
  blue: "border-primary-100 bg-primary-50 text-primary-700 dark:border-primary-900/30 dark:bg-primary-950/20 dark:text-primary-400",
  slate: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
  red: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400",
};

export const Badge = ({ tone = "slate", children }: { tone?: BadgeTone; children: ReactNode }) => (
  <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
    {children}
  </span>
);
