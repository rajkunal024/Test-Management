import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#6c7df7] text-white hover:bg-primary-600 disabled:bg-slate-300",
  secondary: "bg-slate-50 text-primary-700 hover:bg-primary-50 disabled:text-slate-400",
  danger: "bg-rose-500 text-white hover:bg-rose-600 disabled:bg-rose-200",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 disabled:text-slate-400",
};

export const Button = ({ className = "", variant = "primary", icon, children, ...props }: ButtonProps) => (
  <button
    className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    {...props}
  >
    {icon}
    {children}
  </button>
);
