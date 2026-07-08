import { redirect } from 'next/navigation';

export default async function TeamIndexPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  redirect(`/dashboard/equipos/${teamId}/partidos`);
}
