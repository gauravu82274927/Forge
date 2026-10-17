import Link from 'next/link';
import { ForgeWordmark } from '@/components/forge-logo';

const columns = [
  {
    heading: 'Product',
    links: [
      { href: '/teams', label: 'Discover Teams' },
      { href: '/teams/new', label: 'Post a Listing' },
      { href: '/dashboard', label: 'Dashboard' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { href: '/login', label: 'Sign In' },
      { href: '/signup', label: 'Create Account' },
      { href: '/profile', label: 'Your Profile' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <ForgeWordmark />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Find your people. Build something real. Forge helps students
              discover teams and turn ideas into projects.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold">{col.heading}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Forge. A student collaboration platform.</p>
          <p>Built for students, by students.</p>
        </div>
      </div>
    </footer>
  );
}
