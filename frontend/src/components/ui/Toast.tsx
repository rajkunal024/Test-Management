import { ReactNode } from "react";

export const Toast = ({ children, tone = "success" }: { children: ReactNode; tone?: "success" | "error" }) => (
  <div
    className={`fixed bottom-6 right-6 z-50 rounded-md px-4 py-3 text-sm font-semibold shadow-soft ${
      tone === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
    }`}
  >
    {children}
  </div>
);
