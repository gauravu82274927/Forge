'use client';

import { useState } from 'react';
import { Mail, MessageSquare } from 'lucide-react';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const email = 'hello@forge.students';

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Contact</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        Questions, feedback, or a bug to report? We read everything.
      </p>
      <div className="mt-8 space-y-4">
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
          <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">Email</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {email} — for general questions and support.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
          <MessageSquare className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">Feedback</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us what works and what does not. Feature requests are welcome
              — especially from students using Forge for real projects.
            </p>
          </div>
        </div>
      </div>
      {sent && (
        <p className="mt-6 text-sm text-[hsl(150_55%_28%)]">
          Thanks for reaching out — we will get back to you soon.
        </p>
      )}
    </div>
  );
}
