import { ReactNode } from "react";

type BadgeTone = "green" | "yellow" | "blue" | "slate" | "red";

const tones: Record<BadgeTone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  yellow: "border-amber-200 bg-amber-50 text-amber-700",
  blue: "border-primary-100 bg-primary-50 text-primary-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
  red: "border-rose-200 bg-rose-50 text-rose-700",
};

export const Badge = ({ tone = "slate", children }: { tone?: BadgeTone; children: ReactNode }) => (
  <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
    {children}
  </span>
);
