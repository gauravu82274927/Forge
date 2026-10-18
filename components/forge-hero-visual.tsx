'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface NodeSpec {
  x: number;
  y: number;
  label: string;
  tx: number;
  ty: number;
  icon: string;
}

const NODES: NodeSpec[] = [
  { x: 8, y: 18, label: 'React', tx: 46, ty: 46, icon: 'M' },
  { x: 14, y: 74, label: 'Python', tx: 48, ty: 52, icon: 'P' },
  { x: 50, y: 6, label: 'Swift', tx: 50, ty: 44, icon: 'S' },
  { x: 88, y: 22, label: 'Figma', tx: 54, ty: 47, icon: 'F' },
  { x: 92, y: 68, label: 'Rust', tx: 52, ty: 53, icon: 'R' },
  { x: 55, y: 88, label: 'PyTorch', tx: 50, ty: 55, icon: 'T' },
];

export function ForgeHeroVisual() {
  const [mounted, setMounted] = React.useState(false);
  const [spot, setSpot] = React.useState({ x: 55, y: 40 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const onMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const lines = NODES.map((n, i) => ({ n, i }));

  return (
    <div
      ref={containerRef}
      onPointerMove={onMove}
      className="relative aspect-square w-full max-w-lg select-none"
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          // Soft circular fade instead of a hard rounded-full clip, so the
          // edge of the spotlight area blends into the page.
          WebkitMaskImage:
            'radial-gradient(circle closest-side, black 35%, transparent 100%)',
          maskImage:
            'radial-gradient(circle closest-side, black 35%, transparent 100%)',
          background: `radial-gradient(340px circle at ${spot.x}% ${spot.y}%, hsl(76 85% 60% / 0.28), transparent 70%)`,
        }}
      />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {lines.map(({ n, i }) => (
          <line
            key={`l-${i}`}
            x1={n.x}
            y1={n.y}
            x2={n.tx}
            y2={n.ty}
            className="stroke-foreground/25"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            style={{
              transition: `all 1.1s cubic-bezier(0.22, 1, 0.36, 1) ${i * 90}ms`,
              opacity: mounted ? 1 : 0,
              strokeDashoffset: mounted ? 0 : 40,
            }}
          />
        ))}
      </svg>
      {NODES.map((n, i) => (
        <div
          key={`n-${i}`}
          className="absolute"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            transform: `translate(-50%, -50%) translate(${mounted ? (n.tx - n.x) * 0.28 : 0}%, ${mounted ? (n.ty - n.y) * 0.28 : 0}%)`,
            transition: `transform 1.1s cubic-bezier(0.22, 1, 0.36, 1) ${i * 90}ms`,
          }}
        >
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-all duration-300',
              'hover:scale-110 hover:border-accent hover:shadow-lg'
            )}
            style={{
              transitionDelay: `${i * 90 + 400}ms`,
            }}
          >
            <span className="text-sm font-bold text-foreground/80">{n.icon}</span>
          </div>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-muted-foreground">
            {n.label}
          </span>
        </div>
      ))}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
        style={{
          transform: `translate(-50%, -50%) scale(${mounted ? 1 : 0.6})`,
          opacity: mounted ? 1 : 0,
          transitionDelay: '700ms',
        }}
      >
        <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-2 border-accent bg-accent shadow-[0_0_60px_-12px_hsl(76_85%_52%),0_20px_60px_-20px_hsl(22_92%_56%)]">
          <span className="text-xl font-black tracking-tight text-accent-foreground">Forge</span>
        </div>
      </div>
    </div>
  );
}
