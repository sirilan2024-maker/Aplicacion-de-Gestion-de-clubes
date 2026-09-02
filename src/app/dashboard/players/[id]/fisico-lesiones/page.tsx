import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PlayerFisicoLesionesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/club/jugador/${id}#seccion-lesiones`);
}
