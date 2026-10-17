import { cn } from '@/lib/utils';
import { Badge, badgeVariants } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const categoryColors: Record<string, string> = {
  'AI / ML': 'border-transparent bg-[hsl(150_45%_92%)] text-[hsl(150_60%_24%)]',
  'Web App': 'border-transparent bg-[hsl(200_60%_92%)] text-[hsl(200_65%_28%)]',
  'Mobile App': 'border-transparent bg-[hsl(35_85%_92%)] text-[hsl(35_80%_28%)]',
  'Open Source': 'border-transparent bg-[hsl(76_70%_90%)] text-[hsl(76_80%_20%)]',
  Sustainability: 'border-transparent bg-[hsl(160_50%_90%)] text-[hsl(160_55%_22%)]',
  'Developer Tools': 'border-transparent bg-[hsl(220_40%_92%)] text-[hsl(220_45%_30%)]',
  'Game Dev': 'border-transparent bg-[hsl(10_70%_93%)] text-[hsl(10_65%_30%)]',
  Other: 'border-transparent bg-secondary text-secondary-foreground',
};

export function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge className={cn('font-medium', categoryColors[category] ?? categoryColors.Other)}>
      {category}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'border-transparent bg-[hsl(150_60%_90%)] text-[hsl(150_60%_24%)]',
    closed: 'border-transparent bg-secondary text-muted-foreground',
    pending: 'border-transparent bg-[hsl(35_90%_90%)] text-[hsl(35_80%_28%)]',
    accepted: 'border-transparent bg-[hsl(150_60%_90%)] text-[hsl(150_60%_24%)]',
    rejected: 'border-transparent bg-[hsl(0_70%_93%)] text-[hsl(0_65%_32%)]',
    withdrawn: 'border-transparent bg-secondary text-muted-foreground',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge className={cn('font-medium', styles[status] ?? styles.closed)}>
      {label}
    </Badge>
  );
}

export function SkillTag({ skill }: { skill: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground/80">
      {skill}
    </span>
  );
}

export function SkillOverflow({ skills, max = 4 }: { skills: string[]; max?: number }) {
  const visible = skills.slice(0, max);
  const rest = skills.length - visible.length;
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map((s) => (
          <SkillTag key={s} skill={s} />
        ))}
        {rest > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn(badgeVariants({ variant: 'outline' }), 'cursor-default')}>
                +{rest}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{skills.slice(max).join(', ')}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export { badgeVariants };
