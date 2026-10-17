import type { Metadata } from 'next';
import { PublicProfile } from '@/components/public-profile';

export const metadata: Metadata = {
  title: 'Member profile',
  description: 'A Forge member profile.',
};

export default function MemberPage({ params }: { params: { id: string } }) {
  return <PublicProfile id={params.id} />;
}
