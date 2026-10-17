import type { Metadata } from 'next';
import { ProfileEditor } from '@/components/profile-editor';

export const metadata: Metadata = {
  title: 'Your Profile',
  description: 'Create and edit your Forge student profile.',
};

export default function ProfilePage() {
  return <ProfileEditor />;
}
