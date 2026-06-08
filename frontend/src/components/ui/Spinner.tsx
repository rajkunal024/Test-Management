interface SpinnerProps {
  className?: string;
}

export const Spinner = ({ className = "h-5 w-5" }: SpinnerProps) => (
  <span className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent align-middle ${className}`} />
);
