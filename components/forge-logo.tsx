import Link from 'next/link';
import { cn } from '@/lib/utils';

export function ForgeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn('h-7 w-7', className)}
    >
      <rect width="32" height="32" rx="8" className="fill-foreground" />
      <path
        d="M10 23V9h12v3.2h-8.4v3.1H21v3.2h-7.4V23H10Z"
        className="fill-accent"
      />
    </svg>
  );
}

export function ForgeWordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2 group', className)}>
      <ForgeMark className="transition-transform duration-200 group-hover:-rotate-6" />
      <span className="text-lg font-bold tracking-tight">Forge</span>
    </Link>
  );
}
