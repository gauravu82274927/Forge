import type { Metadata } from 'next';
import { ApplicationsManager } from '@/components/applications-manager';

export const metadata: Metadata = {
  title: 'Manage Applications',
};

export default function ApplicationsPage() {
  return <ApplicationsManager />;
}
