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
      <section className="w-full max-w-4xl rounded-md bg-white shadow-soft">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
          <Button aria-label="Close modal" variant="ghost" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="p-6">{children}</div>
        {footer ? <footer className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">{footer}</footer> : null}
      </section>
    </div>
  );
};
