import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function initialsOf(name: string | null | undefined, fallback = 'U'): string {
  const letters = (name ?? '')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return letters || fallback;
}

interface UserAvatarProps {
  /** Member id. When given (and link is not false) the picture links to their profile. */
  id?: string | null;
  name?: string | null;
  src?: string | null;
  /** Size and text classes for the circle, e.g. "h-12 w-12 text-base". */
  className?: string;
  link?: boolean;
  /** Called when the link is clicked, e.g. to close a dialog. */
  onNavigate?: () => void;
}

export function UserAvatar({ id, name, src, className, link = true, onNavigate }: UserAvatarProps) {
  const circle = (
    <Avatar className={cn('h-10 w-10', className)}>
      <AvatarImage src={src ?? undefined} alt="" />
      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );

  if (!id || !link) return circle;

  return (
    <Link
      href={`/u/${id}`}
      onClick={onNavigate}
      aria-label={`View ${name ?? 'member'}'s profile`}
      className="shrink-0 rounded-full outline-none ring-ring transition-opacity hover:opacity-80 focus-visible:ring-2"
    >
      {circle}
    </Link>
  );
}
