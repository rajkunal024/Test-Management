import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}

export const Modal = ({ open, title, children, onClose, footer }: ModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section className="w-full max-w-4xl rounded-md bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-soft text-slate-800 dark:text-slate-100">
        <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
          <button 
            aria-label="Close modal" 
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="p-6">{children}</div>
        {footer ? <footer className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4">{footer}</footer> : null}
      </section>
    </div>
  );
};
