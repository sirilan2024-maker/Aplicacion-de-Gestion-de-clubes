"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { X, CheckCircle2 } from "lucide-react"

interface AddPlayerRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPlayerRequestModal({ open, onClose, onSuccess }: AddPlayerRequestModalProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [teamId, setTeamId] = useState("");
  const [position, setPosition] = useState("Portero");
  const [dorsal, setDorsal] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open && teams.length === 0) {
      fetchTeams();
    }
  }, [open]);

  const fetchTeams = async () => {
    setLoadingTeams(true);
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('teams')
        .select('id, name, category')
        .order('name');
      
      if (data) setTeams(data);
    } catch (err) {
      console.error("Error fetching teams", err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !birthDate) {
      setError("Por favor, rellena los campos obligatorios.");
      return;
    }

    setSubmitting(true);
    setError("");

    const supabase = createClient();
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");

      const { error: insertError } = await supabase
        .from('player_requests')
        .insert({
          tutor_id: userData.user.id,
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
          team_id: teamId || null,
          position: position,
          dorsal: dorsal ? parseInt(dorsal) : null,
          medical_notes: medicalNotes,
          status: 'pending'
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ha ocurrido un error al enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setBirthDate("");
    setTeamId("");
    setPosition("Portero");
    setDorsal("");
    setMedicalNotes("");
    setSuccess(false);
    setError("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Añadir Jugador</h2>
            <p className="text-sm text-gray-500 mt-1">Solicita la vinculación de un nuevo hijo</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {success ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Solicitud Enviada</h3>
              <p className="text-gray-500">El administrador del club revisará la solicitud y validará el alta pronto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nombre *</label>
                  <input required value={firstName} onChange={e => setFirstName(e.target.value)} type="text" className="w-full border-gray-300 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Apellidos *</label>
                  <input required value={lastName} onChange={e => setLastName(e.target.value)} type="text" className="w-full border-gray-300 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Nacimiento *</label>
                <input required value={birthDate} onChange={e => setBirthDate(e.target.value)} type="date" className="w-full border-gray-300 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Equipo (Opcional)</label>
                <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                  <option value="">Decidir más adelante (Asignará el club)</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
                {loadingTeams && <p className="text-xs text-blue-500 mt-1">Cargando equipos...</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Posición</label>
                  <select value={position} onChange={e => setPosition(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                    <option>Portero</option>
                    <option>Defensa</option>
                    <option>Medio</option>
                    <option>Delantero</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Dorsal</label>
                  <input value={dorsal} onChange={e => setDorsal(e.target.value)} type="number" min={1} max={99} className="w-full border-gray-300 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ej. 10" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Alergias o Notas Médicas</label>
                <textarea value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)} rows={3} className="w-full border-gray-300 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Especifique si hay alguna consideración médica importante..."></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? "Enviando solicitud..." : "Enviar Solicitud al Club"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
