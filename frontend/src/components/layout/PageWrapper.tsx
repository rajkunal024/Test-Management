import { ReactNode } from "react";

export const PageWrapper = ({ children, compact = false }: { children: ReactNode; compact?: boolean }) => (
  <div className={`${compact ? "px-4 py-5 md:px-7" : "px-5 py-7 md:px-10"} mx-auto w-full max-w-[1280px]`}>{children}</div>
);
