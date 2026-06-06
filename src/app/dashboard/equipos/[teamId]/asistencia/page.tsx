"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, X, Stethoscope, Loader2, Calendar as CalendarIcon } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  dorsal: number | null;
}

export default function AsistenciaEquipoPage() {
  const params = useParams();
  const teamId = typeof params.teamId === 'string' ? params.teamId : '';

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date string YYYY-MM-DD
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Map player_id -> status ('Presente' | 'Ausente' | 'Lesionado')
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  
  // Track saving status per player to show subtle loading state on the button
  const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchData() {
      if (!teamId) return;
      const supabase = createClient();
      
      try {
        const { data: playersData, error } = await supabase
          .from("players")
          .select("id, first_name, last_name, dorsal")
          .eq("team_id", teamId)
          .order("last_name", { ascending: true });

        if (error) throw error;
        setPlayers(playersData || []);
        
        // Cargar asistencia de la fecha actual
        await fetchAttendanceForDate(date, playersData || []);
      } catch (err: any) {
        toast.error("Error al cargar datos: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [teamId]);
  
  const fetchAttendanceForDate = async (selectedDate: string, currentPlayers: Player[] = players) => {
    if (!teamId || currentPlayers.length === 0) return;
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('player_id, status')
        .eq('team_id', teamId)
        .eq('date', selectedDate);
        
      if (error) {
        if (error.code !== '42P01') throw error; 
        return;
      }
      
      const newAttendance: Record<string, string> = {};
      if (data && data.length > 0) {
        data.forEach(record => {
          newAttendance[record.player_id] = record.status;
        });
      }
      // Si no hay datos, newAttendance queda vacío, por lo que los botones salen en blanco.
      setAttendance(newAttendance);
    } catch (err: any) {
      toast.error("Error al cargar la asistencia previa: " + (err.message || "Error desconocido"));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    fetchAttendanceForDate(newDate);
  };

  const handleStatusChange = async (playerId: string, status: string) => {
    // 1. Optimistic UI update
    setAttendance(prev => ({ ...prev, [playerId]: status }));
    setSavingStatus(prev => ({ ...prev, [playerId]: true }));
    
    const supabase = createClient();
    try {
      // 2. Comprobar si ya existe un registro
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .eq('date', date)
        .single();
        
      if (existing) {
        // UPDATE
        const { error } = await supabase
          .from('attendance')
          .update({ status })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase
          .from('attendance')
          .insert({
            team_id: teamId,
            player_id: playerId,
            date: date,
            status: status
          });
        if (error) throw error;
      }
      
      toast.success("Asistencia guardada", { id: 'save-toast', duration: 1500 });
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
      // Revert if error
      setAttendance(prev => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
    } finally {
      setSavingStatus(prev => ({ ...prev, [playerId]: false }));
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="bottom-right" />
      
      {/* FILTER HEADER (Date selector) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-900">Historial Diario</h2>
        
        <div className="relative w-full sm:w-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input 
            type="date" 
            value={date}
            onChange={handleDateChange}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full font-medium"
          />
        </div>
      </div>

      {/* LISTA DE JUGADORES */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Cargando jugadores...</p>
          </div>
        ) : players.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No hay jugadores en la plantilla para pasar lista.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {players.map(player => (
              <div key={player.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  {player.dorsal ? (
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-sm border border-gray-200">
                      {player.dorsal}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center font-bold text-sm border border-gray-100">
                      -
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{player.first_name} {player.last_name}</p>
                  </div>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto relative">
                  <button
                    onClick={() => handleStatusChange(player.id, 'Presente')}
                    disabled={savingStatus[player.id]}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all disabled:opacity-50 ${
                      attendance[player.id] === 'Presente' 
                        ? 'bg-green-500 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {savingStatus[player.id] && attendance[player.id] === 'Presente' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4" />}
                    Presente
                  </button>
                  <button
                    onClick={() => handleStatusChange(player.id, 'Ausente')}
                    disabled={savingStatus[player.id]}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all disabled:opacity-50 ${
                      attendance[player.id] === 'Ausente' 
                        ? 'bg-red-500 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {savingStatus[player.id] && attendance[player.id] === 'Ausente' ? <Loader2 className="w-4 h-4 animate-spin"/> : <X className="w-4 h-4" />}
                    Ausente
                  </button>
                  <button
                    onClick={() => handleStatusChange(player.id, 'Lesionado')}
                    disabled={savingStatus[player.id]}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all disabled:opacity-50 ${
                      attendance[player.id] === 'Lesionado' 
                        ? 'bg-orange-500 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {savingStatus[player.id] && attendance[player.id] === 'Lesionado' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Stethoscope className="w-4 h-4" />}
                    Lesionado
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
