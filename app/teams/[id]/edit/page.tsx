import type { Metadata } from 'next';
import { ListingForm } from '@/components/listing-form';

export const metadata: Metadata = {
  title: 'Edit Listing',
};

export default function EditTeamPage({
  params,
}: {
  params: { id: string };
}) {
  return <ListingForm editId={params.id} />;
}
