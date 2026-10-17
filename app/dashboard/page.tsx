import type { Metadata } from 'next';
import { Dashboard } from '@/components/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your listings and applications.',
};

export default function DashboardPage() {
  return <Dashboard />;
}
