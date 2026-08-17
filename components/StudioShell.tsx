import Link from 'next/link';
import { GearSix, House, Pulse } from '@phosphor-icons/react/dist/ssr';
import { Brand } from './Brand';
import { cn } from '@/lib/cn';

export function StudioShell({ active, children }: { active: 'home' | 'settings'; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border/15 bg-background/70 px-4 py-6 backdrop-blur-2xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-2"><Brand /></div>
        <p className="mb-2 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/65">Workspace</p>
        <nav className="space-y-1" aria-label="主导航">
          <ShellLink href="/" active={active === 'home'} icon={<House weight={active === 'home' ? 'fill' : 'regular'} />}>创作空间</ShellLink>
          <ShellLink href="/settings" active={active === 'settings'} icon={<GearSix weight={active === 'settings' ? 'fill' : 'regular'} />}>系统设置</ShellLink>
        </nav>
        <div className="mt-auto rounded-2xl border border-border/15 bg-card/70 p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <Pulse className="h-4 w-4 text-emerald-300" weight="bold" aria-hidden="true" />
            Local studio online
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground/70">模型、项目和渲染任务均运行在当前工作区。</p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between border-b border-border/15 bg-background/75 px-4 backdrop-blur-2xl sm:px-6 lg:px-8">
          <div className="lg:hidden"><Brand compact /></div>
          <div className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground lg:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,.75)]" /> Local studio online
          </div>
          <nav className="flex items-center gap-2 lg:hidden" aria-label="移动端导航">
            <Link className={cn('grid h-10 w-10 place-items-center rounded-xl border border-border/15 text-muted-foreground', active === 'home' && 'bg-primary/10 text-indigo-200')} href="/" aria-label="创作空间"><House className="h-[18px] w-[18px]" aria-hidden="true" /></Link>
            <Link className={cn('grid h-10 w-10 place-items-center rounded-xl border border-border/15 text-muted-foreground', active === 'settings' && 'bg-primary/10 text-indigo-200')} href="/settings" aria-label="系统设置"><GearSix className="h-[18px] w-[18px]" aria-hidden="true" /></Link>
          </nav>
          <div className="hidden h-10 w-10 place-items-center rounded-xl border border-primary/20 bg-gradient-to-br from-[#36456a] to-[#202a40] text-xs font-bold text-white lg:grid" aria-label="用户 TL">TL</div>
        </header>
        <main id="main-content" className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><div className="mx-auto w-full max-w-[1320px]">{children}</div></main>
      </div>
    </div>
  );
}

function ShellLink({ href, active, icon, children }: { href: string; active: boolean; icon: React.ReactElement<{ className?: string; 'aria-hidden'?: boolean }>; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-11 items-center gap-3 rounded-xl border border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active && 'border-primary/20 bg-primary/10 text-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]')}>
      {icon && <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]" aria-hidden="true">{icon}</span>}{children}
    </Link>
  );
}
