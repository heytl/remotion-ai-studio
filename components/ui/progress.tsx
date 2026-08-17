import { cn } from '@/lib/cn';

export function Progress({ value, className }: { value: number; className?: string }) {
  const percentage = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percentage)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-transform duration-300 motion-reduce:transition-none"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}
