import { ReactNode } from "react";

export const PageWrapper = ({ children, compact = false }: { children: ReactNode; compact?: boolean }) => (
  <div className={`${compact ? "px-3 sm:px-5 py-3 sm:py-5 md:px-7" : "px-3.5 sm:px-6 py-4 sm:py-6 md:px-10"} mx-auto w-full max-w-[1280px] transition-all duration-300 ease-in-out`}>{children}</div>
);
