import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = "", ...props }, ref) => (
  <label className="block">
    {label ? <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span> : null}
    <input
      ref={ref}
      className={`h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-primary-500 focus:ring-3 focus:ring-primary-100 ${className}`}
      {...props}
    />
    {error ? <span className="mt-1 block text-xs font-medium text-rose-500">{error}</span> : null}
  </label>
));

Input.displayName = "Input";
