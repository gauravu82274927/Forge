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
          skills, links) and the listings and applications you create, plus the
          messages you send to friends. Beyond that we collect basic usage
          analytics, described below.
        </p>
        <h2 className="pt-2 text-lg font-semibold text-foreground">Analytics</h2>
        <p>
          We use PostHog, a third-party analytics service, to count visits and
          see which features get used. It records page views and a short list
          of actions such as signing up, posting a listing, applying or sending
          a friend request. It does not receive the text of your messages, what
          you type into search, or the questions you ask the assistant. Anything
          after a ? or # in a page address is removed before it is sent. If you
          are signed in, your activity is linked to an internal account ID, not
          to your name or email. We do not record sessions, and we switch
          analytics off if your browser sends a Do Not Track signal.
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
