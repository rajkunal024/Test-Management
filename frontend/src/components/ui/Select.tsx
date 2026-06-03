import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", ...props }, ref) => (
    <label className="block">
      {label ? <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span> : null}
      <span className="relative block">
        <select
          ref={ref}
          className={`h-12 w-full appearance-none rounded-md border border-slate-300 bg-white px-4 pr-10 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-3 focus:ring-primary-100 ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </span>
      {error ? <span className="mt-1 block text-xs font-medium text-rose-500">{error}</span> : null}
    </label>
  ),
);

Select.displayName = "Select";
