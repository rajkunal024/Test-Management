import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    const show = () => setVisible(true);
    const hide = () => setVisible(false);

    return (
      <label className="block">
        {label ? <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span> : null}
        <div className="relative">
          <input
            ref={ref}
            type={visible ? "text" : "password"}
            className={`h-12 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-4 pr-12 text-sm text-slate-800 dark:text-slate-200 outline-none transition placeholder:text-slate-350 dark:placeholder:text-slate-600 focus:border-primary-500 focus:ring-3 focus:ring-primary-100/50 ${className}`}
            {...props}
          />
          <button
            type="button"
            onMouseDown={show}
            onMouseUp={hide}
            onMouseLeave={hide}
            onTouchStart={show}
            onTouchEnd={hide}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none select-none p-1.5 cursor-pointer rounded-full hover:bg-slate-100/60 dark:hover:bg-slate-800 active:scale-95 transition"
            title="Press and hold to view password"
          >
            {visible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </div>
        {error ? <span className="mt-1 block text-xs font-medium text-rose-500">{error}</span> : null}
      </label>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
