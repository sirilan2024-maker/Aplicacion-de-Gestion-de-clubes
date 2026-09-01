import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { InjuryManagement } from '@/components/features/injuries/InjuryManagement';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PlayerFisicoLesionesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let playerInfo = {
    id,
    name: 'Marco Sánchez',
    number: '#8',
    position: 'Centrocampista',
    status: 'Lesionado',
    avatarUrl: undefined as string | undefined,
  };

  try {
    const { data: player } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal, posicion, avatar_url, status')
      .eq('id', id)
      .single();

    if (player) {
      playerInfo = {
        id: player.id,
        name: `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Marco Sánchez',
        number: player.dorsal ? `#${player.dorsal}` : '#8',
        position: player.posicion || 'Centrocampista',
        status: player.status || 'Lesionado',
        avatarUrl: player.avatar_url || undefined,
      };
    }
  } catch (err) {
    console.error('Error fetching player in fisico-lesiones page:', err);
  }

  return (
    <main className="min-h-screen bg-black text-slate-100 p-2 sm:p-6 flex flex-col justify-center items-center">
      <div className="w-full max-w-7xl">
        <div className="mb-3">
          <Link
            href={`/dashboard/club/jugador/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Volver a la ficha del jugador</span>
          </Link>
        </div>

        <InjuryManagement player={playerInfo} />
      </div>
    </main>
  );
}
