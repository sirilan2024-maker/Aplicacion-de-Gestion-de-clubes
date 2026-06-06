import { redirect } from 'next/navigation';

export default function TeamIndexPage({ params }: { params: { teamId: string } }) {
  redirect(`/dashboard/equipos/${params.teamId}/plantilla`);
}
