import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How Forge handles your data.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Privacy</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
        <h2 className="pt-2 text-lg font-semibold text-foreground">What we collect</h2>
        <p>
          Forge stores the information you put in your profile (name, university,
          skills, links) and the listings and applications you create. That is
          all.
        </p>
        <h2 className="pt-2 text-lg font-semibold text-foreground">What stays private</h2>
        <p>
          Your email address is never shown publicly. Team owners see your
          profile and your application intro — nothing else.
        </p>
        <h2 className="pt-2 text-lg font-semibold text-foreground">What you control</h2>
        <p>
          You can edit or clear your profile at any time. Deleting your account
          removes your listings and applications.
        </p>
        <h2 className="pt-2 text-lg font-semibold text-foreground">Questions</h2>
        <p>
          Reach us through the contact page and we will answer promptly.
        </p>
      </div>
    </div>
  );
}
