"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function FamilyDisciplinePage() {
  const params = useParams();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [stats, setStats] = useState({ yellow: 0, red: 0 });

  useEffect(() => {
    fetchDiscipline();
  }, [playerId]);

  const fetchDiscipline = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: pData, error: pError } = await supabase
        .from('players')
        .select('first_name, team_id')
        .eq('id', playerId)
        .single();
        
      if (pError) throw pError;
      setPlayerInfo(pData);

      // Fetch cards from convocatorias
      const { data: convData, error: convError } = await supabase
        .from('convocatorias')
        .select('yellow_cards, red_cards, partidos(fecha_hora, rival_nombre, lugar)')
        .eq('player_id', playerId)
        .or('yellow_cards.gt.0,red_cards.gt.0');

      if (convError) throw convError;

      const records = convData || [];
      let yellow = 0, red = 0;
      const allCards: any[] = [];

      records.forEach(r => {
        if (r.yellow_cards > 0) {
          yellow += r.yellow_cards;
          allCards.push({ type: 'yellow', count: r.yellow_cards, match: r.partidos });
        }
        if (r.red_cards > 0) {
          red += r.red_cards;
          allCards.push({ type: 'red', count: r.red_cards, match: r.partidos });
        }
      });

      // Sort by match date descending
      allCards.sort((a, b) => new Date(b.match?.fecha_hora || 0).getTime() - new Date(a.match?.fecha_hora || 0).getTime());

      setStats({ yellow, red });
      setCards(allCards);

    } catch (err: any) {
      toast.error("Error al cargar disciplina: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-red-100 text-red-600 rounded-xl">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disciplina</h1>
          <p className="text-gray-500 text-sm">Registro exclusivo de {playerInfo?.first_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
          <div className="w-12 h-16 bg-yellow-400 rounded-sm mb-3 shadow-sm border border-yellow-500 flex items-center justify-center">
            <span className="text-xl font-bold text-yellow-800">{stats.yellow}</span>
          </div>
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tarjetas Amarillas</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
          <div className="w-12 h-16 bg-red-500 rounded-sm mb-3 shadow-sm border border-red-600 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{stats.red}</span>
          </div>
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tarjetas Rojas</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <AlertTriangle size={18} className="text-gray-400" />
          <h2 className="font-bold text-gray-900">Historial de Sanciones</h2>
        </div>
        {!cards.length ? (
          <div className="p-8 text-center text-gray-500">No hay sanciones registradas. ¡Excelente comportamiento!</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {cards.map((card, i) => {
              const matchDate = card.match?.fecha_hora ? new Date(card.match.fecha_hora).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Fecha desconocida';
              const isHome = card.match?.lugar === 'Local';
              const matchTitle = card.match ? `${isHome ? 'vs' : '@'} ${card.match.rival_nombre}` : 'Partido Desconocido';
              
              return (
                <div key={i} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-bold text-gray-900 capitalize">{matchDate}</p>
                    <p className="text-sm text-gray-500">{matchTitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {card.type === 'yellow' ? (
                      <div className="w-8 h-10 bg-yellow-400 rounded-sm shadow-sm border border-yellow-500 flex items-center justify-center font-bold text-yellow-800 text-sm">
                        x{card.count}
                      </div>
                    ) : (
                      <div className="w-8 h-10 bg-red-500 rounded-sm shadow-sm border border-red-600 flex items-center justify-center font-bold text-white text-sm">
                        x{card.count}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
