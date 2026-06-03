export const Logo = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex items-center gap-1 text-primary-700" aria-label="PrepRoute">
    <span className="relative h-7 w-8">
      <span className="absolute left-0 top-1 h-4 w-4 rounded-sm border-2 border-primary-600 bg-primary-500" />
      <span className="absolute left-2 top-0 h-2 w-7 rounded-full border-t-2 border-slate-950" />
      <span className="absolute left-4 top-1 h-3 w-9 rounded-full border-t-2 border-slate-950" />
      <span className="absolute left-1.5 top-2.5 h-1.5 w-1.5 rounded-full bg-white" />
    </span>
    {!compact ? <span className="text-3xl font-extrabold leading-none tracking-normal">PrepRoute</span> : null}
  </div>
);
