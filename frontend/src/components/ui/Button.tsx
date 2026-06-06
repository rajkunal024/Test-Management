import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#6c7df7] text-white hover:bg-primary-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500",
  secondary: "bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600",
  danger: "bg-rose-500 text-white hover:bg-rose-600 disabled:bg-rose-200 dark:disabled:bg-rose-950/20",
  ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600",
};

export const Button = ({ className = "", variant = "primary", icon, children, ...props }: ButtonProps) => (
  <button
    className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    {...props}
  >
    {icon}
    {children}
  </button>
);
