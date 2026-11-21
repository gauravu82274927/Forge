import type { Metadata } from 'next';
import { HackathonsHub } from '@/components/hackathons-hub';

export const metadata: Metadata = {
  title: 'Hackathons | Forge',
  description: 'Find students and teams building for the same hackathon.',
};

export default function HackathonsPage() {
  return <HackathonsHub />;
}
