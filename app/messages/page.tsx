import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Chat } from '@/components/chat';

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Chat with your Forge friends.',
};

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-5xl animate-pulse rounded-xl bg-secondary" />}>
      <Chat />
    </Suspense>
  );
}
