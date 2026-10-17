import type { Metadata } from 'next';
import { TeamsBrowser } from '@/components/teams-browser';

export const metadata: Metadata = {
  title: 'Discover Teams',
  description:
    'Browse open team listings for hackathons, side projects, and open-source work.',
};

export default function TeamsPage() {
  return <TeamsBrowser />;
}
