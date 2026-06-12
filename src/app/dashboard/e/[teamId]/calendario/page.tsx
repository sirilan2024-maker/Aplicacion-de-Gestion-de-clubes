"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarIcon, MapPin, Clock, Trophy, Shield } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CalendarioEquipoPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);

  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");

  useEffect(() => {
    async function fetchData() {
      if (!teamId) return;
      const supabase = createClient();
      
      // 1. Obtener el nombre del equipo desde 'equipos' (tabla del Coach Dashboard)
      const { data: equipoCoach } = await supabase
        .from('equipos')
        .select('name')
        .eq('id', teamId)
        .single();
        
      if (!equipoCoach) {
        setLoading(false);
        return;
      }
      
      const tName = equipoCoach.name;
      setTeamName(tName);

      // 2. Buscar TODOS los equivalentes en tabla teams
      const { data: globalTeams } = await supabase
        .from('teams')
        .select('id')
        .ilike('name', tName)

      const globalTeamIds = globalTeams?.map(t => t.id) || [];
      if (!globalTeamIds.includes(teamId)) {
        globalTeamIds.push(teamId);
      }

      // 3. Obtener los partidos
      const { data: matches, error } = await supabase
        .from('partidos')
        .select('*')
        .in('equipo_id', globalTeamIds)
        .order('fecha_hora', { ascending: true });

      if (!error && matches) {
        setPartidos(matches);
      }
      setLoading(false);
    }
    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (partidos.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <CalendarIcon size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No hay partidos programados</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          El calendario está vacío. Pide al administrador que importe los calendarios de la FFCV o añade partidos manualmente.
        </p>
      </div>
    );
  }

  // Separar en próximos y pasados
  const now = new Date();
  const proximos = partidos.filter(p => new Date(p.fecha_hora) >= now);
  const pasados = partidos.filter(p => new Date(p.fecha_hora) < now).reverse();

  const MatchCard = ({ partido, isPast }: { partido: any, isPast: boolean }) => {
    const fecha = new Date(partido.fecha_hora);
    const isLocal = partido.lugar === 'Local';
    
    // Nombres para mostrar
    const localName = isLocal ? teamName : partido.rival_nombre;
    const awayName = isLocal ? partido.rival_nombre : teamName;

    return (
      <div className={`bg-white rounded-xl shadow-sm border ${isPast ? 'border-slate-200 opacity-75' : 'border-blue-100 hover:border-blue-300'} overflow-hidden transition-all duration-200 hover:shadow-md`}>
        <div className={`px-4 py-2 flex justify-between items-center text-xs font-bold uppercase tracking-wider ${isPast ? 'bg-slate-50 text-slate-500' : 'bg-blue-50/50 text-blue-700'}`}>
          <div className="flex items-center gap-2">
            <Clock size={14} />
            {format(fecha, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </div>
          <div>{format(fecha, "HH:mm")}</div>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
                <Shield size={28} className={isLocal ? 'text-blue-600' : 'text-slate-400'} />
              </div>
              <h4 className={`font-bold ${isLocal ? 'text-slate-900' : 'text-slate-600'}`}>
                {localName}
              </h4>
              {isLocal && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">Local</span>}
            </div>
            
            <div className="px-6 text-center flex flex-col items-center">
              {isPast && partido.resultado_propio !== null ? (
                <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-mono text-2xl font-bold tracking-widest shadow-sm">
                  {isLocal ? partido.resultado_propio : partido.resultado_rival} - {isLocal ? partido.resultado_rival : partido.resultado_propio}
                </div>
              ) : (
                <div className="text-slate-300 font-bold text-2xl">VS</div>
              )}
            </div>
            
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
                <Shield size={28} className={!isLocal ? 'text-blue-600' : 'text-slate-400'} />
              </div>
              <h4 className={`font-bold ${!isLocal ? 'text-slate-900' : 'text-slate-600'}`}>
                {awayName}
              </h4>
              {!isLocal && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">Visitante</span>}
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 bg-slate-50 py-2 rounded-lg border border-slate-100">
            <MapPin size={16} />
            <span>{partido.lugar === 'Local' ? 'En Casa' : 'Fuera de Casa'}</span>
            <span className="text-slate-300 mx-1">|</span>
            <span className="font-medium text-slate-600">{partido.estado}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b pb-4">
        <CalendarIcon className="text-blue-500" size={32} />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Eventos</h1>
          <p className="text-slate-500">Planifica entrenamientos, eventos y revisa el horario del equipo.</p>
        </div>
      </div>

      {/* Próximos Partidos */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <CalendarIcon size={18} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Próximos Partidos</h2>
          <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold ml-2">
            {proximos.length}
          </span>
        </div>
        
        {proximos.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {proximos.map(p => <MatchCard key={p.id} partido={p} isPast={false} />)}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-slate-500">No hay próximos partidos programados.</p>
          </div>
        )}
      </section>

      {/* Partidos Pasados */}
      {pasados.length > 0 && (
        <section className="pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Trophy size={18} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Histórico de Partidos</h2>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {pasados.map(p => <MatchCard key={p.id} partido={p} isPast={true} />)}
          </div>
        </section>
      )}
    </div>
  );
}
