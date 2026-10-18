import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Forge mark: an "F" drawn as a small network. Three people (nodes) joined
 * by one stem, which is what the product does: connect builders into a team.
 * The badge colour is fixed so the mark reads the same in light and dark mode.
 */
export function ForgeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn('h-7 w-7', className)}
    >
      <rect width="32" height="32" rx="8" fill="hsl(24 12% 8%)" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        stroke="hsl(40 20% 96% / 0.16)"
      />
      <path
        d="M11 23V9.5h10.5M11 16h7.5"
        stroke="hsl(76 85% 52%)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.5" cy="9.5" r="2.6" fill="hsl(22 92% 58%)" />
      <circle cx="19.5" cy="16" r="2.6" fill="hsl(22 92% 58%)" />
      <circle cx="11" cy="23" r="2.6" fill="hsl(22 92% 58%)" />
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
