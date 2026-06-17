"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Save } from "lucide-react"
import { updateMatchDetails, createPartidoAction, saveMatchReport } from "@/app/actions/match-actions"

interface ManageMatchModalProps {
  match: any;
  teamId?: string;
  teams?: any[];
  onClose: () => void;
  onSave: (updatedMatch: any) => void;
}

export function ManageMatchModal({ match, teamId, teams, onClose, onSave }: ManageMatchModalProps) {
  if (!match) return null;

  const defaultTeamId = match.equipo_id || teamId;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const formData = new FormData(e.currentTarget);
          
          const rivalStr = formData.get("rival") as string;
          const dateStr = formData.get("date") as string;
          const timeStr = formData.get("time") as string;
          const placeStr = formData.get("place") as string;
          const equipoIdStr = formData.get("equipo_id") as string || defaultTeamId;
          
          const golesPropiosStr = formData.get("resultado_propio") as string;
          const golesRivalStr = formData.get("resultado_rival") as string;
          const notasStr = formData.get("notas") as string;

          const golesPropios = golesPropiosStr !== "" ? parseInt(golesPropiosStr) : null;
          const golesRival = golesRivalStr !== "" ? parseInt(golesRivalStr) : null;
          
          // Determine status based on scores
          const estado = (golesPropios !== null && golesRival !== null) ? 'Finalizado' : 'Programado';
          
          if (dateStr && timeStr) {
            const combinedISO = new Date(`${dateStr}T${timeStr}`).toISOString();
            
            let updatedData = {
              fecha_hora: combinedISO,
              lugar: placeStr,
              rival_nombre: rivalStr,
              equipo_id: equipoIdStr,
              resultado_propio: golesPropios,
              resultado_rival: golesRival,
              estado: estado,
              coach_summary: notasStr
            };

            if (match.id === 'new') {
              const res = await createPartidoAction(equipoIdStr, updatedData);
              // Also save notes if any
              if (notasStr) {
                await saveMatchReport(res.match.id, { 
                  coach_rating: 0, coach_summary: notasStr, positive_aspects: '', improvement_aspects: '', attitude_notes: '' 
                });
              }
              onSave({...res.match, coach_summary: notasStr});
            } else {
              await updateMatchDetails(match.id, equipoIdStr, updatedData);
              if (notasStr !== match.coach_summary) {
                await saveMatchReport(match.id, { 
                  coach_rating: match.coach_rating || 0, 
                  coach_summary: notasStr, 
                  positive_aspects: match.positive_aspects || '', 
                  improvement_aspects: match.improvement_aspects || '', 
                  attitude_notes: match.attitude_notes || '' 
                });
              }
              
              onSave({ 
                ...match, 
                ...updatedData
              });
            }
            
            onClose();
          }
        }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
          <h3 className="text-xl font-black text-slate-800">Gestionar Partido</h3>
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] bg-slate-50/50">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Equipo Rival</label>
            <Input name="rival" defaultValue={match.rival_nombre} className="font-semibold text-slate-800 bg-white border-slate-200" required />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nuestro Equipo</label>
              {teams && teams.length > 0 ? (
                <select 
                  name="equipo_id" 
                  defaultValue={defaultTeamId} 
                  className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  required
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              ) : (
                <div className="h-10 rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500 flex items-center">
                  Equipo actual
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha y Hora</label>
              <div className="flex flex-row gap-2">
                <Input type="date" name="date" defaultValue={new Date(match.fecha_hora).toISOString().split('T')[0]} required className="font-semibold text-slate-800 bg-white border-slate-200 w-[60%]" />
                <Input type="time" name="time" defaultValue={new Date(match.fecha_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} required className="font-semibold text-slate-800 bg-white border-slate-200 px-2 w-[40%]" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lugar del Partido</label>
            <Input name="place" defaultValue={match.lugar} className="font-semibold text-slate-800 bg-white border-slate-200" required />
          </div>

          <div className="p-4 bg-slate-100/80 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Marcador Oficial (Dejar en blanco si aún no se ha jugado)</label>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Goles Sporting Saladar</label>
                <Input type="number" min="0" name="resultado_propio" defaultValue={match.resultado_propio ?? ''} className="font-bold text-slate-800 text-center bg-white border-slate-200" />
              </div>
              <span className="font-black text-slate-300 text-xl mt-4">-</span>
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Goles Rival</label>
                <Input type="number" min="0" name="resultado_rival" defaultValue={match.resultado_rival ?? ''} className="font-bold text-slate-800 text-center bg-white border-slate-200" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notas del Encuentro</label>
            <textarea 
              name="notas" 
              defaultValue={match.coach_summary} 
              rows={3}
              className="w-full flex rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 resize-none placeholder:text-slate-400"
              placeholder="Ej: Acta FFCV 26377336. Jornada 26..."
            ></textarea>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={(e) => { e.stopPropagation(); onClose(); }} className="font-bold text-slate-600 border-slate-200 hover:bg-slate-100">
            Cancelar
          </Button>
          <Button type="submit" className="gap-2 bg-[#22c55e] hover:bg-green-600 text-white font-bold shadow-md shadow-green-500/20">
            Guardar Partido
          </Button>
        </div>
      </form>
    </div>
  )
}
