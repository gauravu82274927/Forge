import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The ground rules for using Forge.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Terms</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
        <h2 className="pt-2 text-lg font-semibold text-foreground">Be genuine</h2>
        <p>
          Apply to teams you actually want to join, and post listings for
          projects you actually intend to build. No spam, no recruiting for
          unpaid commercial work disguised as collaboration.
        </p>
        <h2 className="pt-2 text-lg font-semibold text-foreground">Be respectful</h2>
        <p>
          Treat other builders well. Harassment, discrimination, or abuse leads
          to removal. Report problems through the contact page.
        </p>
        <h2 className="pt-2 text-lg font-semibold text-foreground">Your content</h2>
        <p>
          You own what you write. Listings and profiles you publish are visible
          to other Forge users.
        </p>
        <h2 className="pt-2 text-lg font-semibold text-foreground">The service</h2>
        <p>
          Forge is provided as-is while it is in development. Features may
          change as the product grows.
        </p>
      </div>
    </div>
  );
}
