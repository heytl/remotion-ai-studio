import { Play } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/cn';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-[#8d77ff] via-[#5d76ff] to-[#27d6e9] text-white shadow-glow">
        <span className="absolute inset-[7px] rounded-full border-2 border-white/75" aria-hidden="true" />
        <Play className="relative ml-0.5 h-3.5 w-3.5" weight="fill" aria-hidden="true" />
      </span>
      <span className={cn('min-w-0', compact && 'hidden sm:block')}>
        <strong className="block truncate text-sm font-bold tracking-[0.12em] text-foreground">MOTION LAB</strong>
        <span className="block text-[9px] font-semibold tracking-[0.17em] text-muted-foreground">AI VIDEO STUDIO</span>
      </span>
    </div>
  );
}
