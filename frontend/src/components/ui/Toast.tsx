import { ReactNode, useEffect, useState } from "react";

export const Toast = ({
  children,
  tone = "success",
  duration = 2000,
  onClose
}: {
  children: ReactNode;
  tone?: "success" | "error";
  duration?: number;
  onClose?: () => void;
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [children, duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-md px-4 py-3 text-sm font-semibold shadow-soft ${
        tone === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
      }`}
    >
      {children}
    </div>
  );
};
