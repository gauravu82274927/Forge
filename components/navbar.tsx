import Link from 'next/link';
import { ForgeWordmark } from '@/components/forge-logo';
import { NavbarUser } from '@/components/navbar-user';

const links = [
  { href: '/teams', label: 'Discover Teams' },
  { href: '/#how-it-works', label: 'How It Works' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <ForgeWordmark />
          <nav className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <NavbarUser />
      </div>
    </header>
  );
}
