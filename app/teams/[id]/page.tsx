import type { Metadata } from 'next';
import { TeamDetails } from '@/components/team-details';

export const metadata: Metadata = {
  title: 'Team Details',
};

export default function TeamDetailsPage() {
  return <TeamDetails />;
}
