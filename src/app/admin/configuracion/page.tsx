"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Settings, Plus, Save, Trash2, CheckCircle2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface ClubMetric {
  id: string;
  name: string;
  unit: string;
  type: string;
  is_active: boolean;
}

export default function ConfiguracionClubPage() {
  const [metrics, setMetrics] = useState<ClubMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);

  // New metric form
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newType, setNewType] = useState("number");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    const supabase = createClient();
    
    // Get club_id from profile
    const { data: profile } = await supabase.from('profiles').select('club_id').single();
    if (!profile) {
      setLoading(false);
      return;
    }
    
    setClubId(profile.club_id);

    const { data, error } = await supabase
      .from('club_metrics')
      .select('*')
      .eq('club_id', profile.club_id)
      .order('created_at', { ascending: true });

    if (data) {
      setMetrics(data);
    }
    setLoading(false);
  };

  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !newName) return;
    
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('club_metrics').insert({
      club_id: clubId,
      name: newName,
      unit: newUnit || null,
      type: newType,
      is_active: true
    });

    setSubmitting(false);

    if (error) {
      toast.error("Error al crear métrica: " + error.message);
    } else {
      toast.success("Métrica añadida correctamente");
      setNewName("");
      setNewUnit("");
      setNewType("number");
      fetchMetrics();
    }
  };

  const toggleMetricStatus = async (id: string, currentStatus: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('club_metrics')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error("Error al actualizar estado");
    } else {
      fetchMetrics();
    }
  };

  const deleteMetric = async (id: string) => {
    if(!confirm("¿Seguro que quieres borrar esta métrica? Se perderán los datos históricos asociados a ella.")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('club_metrics')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Error al borrar métrica");
    } else {
      toast.success("Métrica borrada");
      fetchMetrics();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="bottom-right" />
      
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <Settings size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración del Club</h1>
          <p className="text-gray-500">Administra los parámetros y preferencias globales de tu club.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Métricas Físicas Dinámicas</h2>
          <p className="text-gray-500 text-sm">
            Define qué datos físicos quieres recopilar de los jugadores al finalizar cada entrenamiento. 
            Estas métricas aparecerán automáticamente en la pestaña de Asistencia.
          </p>
        </div>
        
        <div className="p-6 bg-gray-50/50">
          <form onSubmit={handleAddMetric} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre (ej: RPE, Peso)</label>
              <input 
                type="text" 
                required
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nombre de la métrica"
              />
            </div>
            <div className="w-full md:w-32">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Unidad (Opc.)</label>
              <input 
                type="text" 
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="ej: kg, %"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Dato</label>
              <select 
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="number">Numérico</option>
                <option value="text">Texto / Notas</option>
              </select>
            </div>
            <button 
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors h-[42px] disabled:opacity-70"
            >
              <Plus size={18} /> Añadir
            </button>
          </form>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando métricas...</div>
          ) : metrics.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No tienes ninguna métrica configurada.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-y border-gray-200 text-xs font-bold text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Unidad</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3 text-center">Estado</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{m.name}</td>
                    <td className="px-6 py-4 text-gray-500">{m.unit || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {m.type === 'number' ? 'Numérico' : 'Texto'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => toggleMetricStatus(m.id, m.is_active)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          m.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {m.is_active ? <><CheckCircle2 size={14}/> Activa</> : 'Inactiva'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteMetric(m.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Borrar métrica"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
