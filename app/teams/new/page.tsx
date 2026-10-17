import type { Metadata } from 'next';
import { ListingForm } from '@/components/listing-form';

export const metadata: Metadata = {
  title: 'Post a Listing',
  description: 'Publish a team listing and find collaborators for your project.',
};

export default function NewTeamPage() {
  return <ListingForm />;
}
