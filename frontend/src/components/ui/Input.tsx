import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = "", ...props }, ref) => (
  <label className="block">
    {label ? <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span> : null}
    <input
      ref={ref}
      className={`h-12 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-800 dark:text-slate-200 outline-none transition placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-primary-500 focus:ring-3 focus:ring-primary-100/50 ${className}`}
      {...props}
    />
    {error ? <span className="mt-1 block text-xs font-medium text-rose-500">{error}</span> : null}
  </label>
));

Input.displayName = "Input";
