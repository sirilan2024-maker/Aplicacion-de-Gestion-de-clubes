"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserPlus, CheckCircle, XCircle, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

export function PendingRequestsReview() {
  const [requests, setRequests] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    const supabase = createClient()
    
    // Check if user is admin
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', authData.user.id)
      .single()
      
    if (profile?.role !== 'admin') {
      setLoading(false)
      return
    }

      try {
      const { data } = await supabase
        .from('player_requests')
        .select('*, teams(name, category)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      
      if (data) setRequests(data)

      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, category')
        .eq('club_id', profile.club_id)
        .order('name')
      
      if (teamsData) setTeams(teamsData)

    } catch (err) {
      console.error("Error fetching requests:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveConfirm = async () => {
    if (!selectedRequest) return
    setProcessingId(selectedRequest.id)
    const request = selectedRequest
    const supabase = createClient()
    
    try {
      console.log("Step 0: Starting approval process");
      
      // Get admin's club_id
      const { data: authData } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('id', authData.user?.id)
        .single()
        
      if (!profile?.club_id) throw new Error("Club ID no encontrado")
      console.log("Step 1: Admin club_id retrieved", profile.club_id);

      // Get active season
      const { data: activeSeason, error: seasonError } = await supabase
        .from('seasons')
        .select('id')
        .eq('club_id', profile.club_id)
        .eq('is_active', true)
        .single()
        
      if (seasonError) console.warn("No active season found or error", seasonError);
      console.log("Step 2: Active season checked", activeSeason?.id);

      // 1. Update request status
      const { error: reqError } = await supabase
        .from('player_requests')
        .update({ status: 'approved' })
        .eq('id', request.id)
        
      if (reqError) {
        console.error("Step 3 Failed: Error updating request status");
        throw reqError;
      }
      console.log("Step 3: Request status updated to approved");

      // Fetch parent data to share contact info across siblings
      const { data: parentProfile, error: parentError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', request.tutor_id)
        .single()
        
      if (parentError) console.warn("Step 4 Warning: Error fetching parent profile", parentError);
      console.log("Step 4: Parent data fetched");

      // 2. Insert into players
      const parentContactStr = parentProfile 
        ? `${parentProfile.first_name} ${parentProfile.last_name}${parentProfile.phone ? ' - ' + parentProfile.phone : ''}`
        : 'Registrado vía App Familiar';

      const medicalNotesStr = request.medical_notes ? ` (Notas médicas: ${request.medical_notes})` : '';

      console.log("Step 5: Inserting into players with data:", {
        first_name: request.first_name,
        last_name: request.last_name,
        birth_date: request.birth_date,
        team_id: selectedTeamId || null,
        club_id: profile.club_id,
        posicion: request.position || null,
        dorsal: request.dorsal || null,
        parent_contact: parentContactStr + medicalNotesStr
      });

      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          first_name: request.first_name,
          last_name: request.last_name,
          birth_date: request.birth_date,
          team_id: selectedTeamId || null,
          club_id: profile.club_id,
          posicion: request.position || null,
          dorsal: request.dorsal || null,
          parent_contact: parentContactStr + medicalNotesStr
        })
        .select()
        .single()

      if (playerError) {
         console.error("Step 5 Failed: Error inserting player");
         throw playerError;
      }
      console.log("Step 5: Player inserted, ID:", newPlayer.id);

      // 3. Link to parent in player_tutors
      const { error: tutorError } = await supabase
        .from('player_tutors')
        .insert({
          player_id: newPlayer.id,
          tutor_id: request.tutor_id
        })

      if (tutorError) {
         console.error("Step 6 Failed: Error linking tutor");
         throw tutorError;
      }
      console.log("Step 6: Tutor linked");

      // 4. Add to player_season_history so they appear in the team's plantilla
      if (selectedTeamId) {
        const { error: historyError } = await supabase
          .from('player_season_history')
          .insert({
            player_id: newPlayer.id,
            team_id: selectedTeamId,
            club_id: profile.club_id,
            season_id: activeSeason?.id || null,
            status: 'active'
          })
          
        if (historyError) {
           console.error("Step 7 Failed: Error inserting history");
           throw historyError;
        }
        console.log("Step 7: Season history added");
      }

      toast.success("Jugador aprobado y vinculado correctamente")
      setRequests(requests.filter(r => r.id !== request.id))
      setSelectedRequest(null)
      
    } catch (err: any) {
      console.error("Supabase Error Full Object:", err)
      console.error("Error Message:", err?.message)
      console.error("Error Details:", err?.details)
      console.error("Error Code:", err?.code)
      const errorMsg = err?.message || err?.details || err?.hint || JSON.stringify(err);
      toast.error(`Error: ${errorMsg}`)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from('player_requests')
        .update({ status: 'rejected' })
        .eq('id', id)
        
      if (error) throw error

      toast.success("Solicitud rechazada")
      setRequests(requests.filter(r => r.id !== id))
    } catch (err: any) {
      console.error(err)
      toast.error("Error al rechazar")
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) return null

  return (
    <div className="bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden mb-8">
      <div className="bg-blue-50 border-b border-blue-100 p-4 flex items-center justify-between">
        <h2 className="font-bold text-blue-900 flex items-center gap-2">
          <UserPlus size={20} className="text-blue-600" />
          Solicitudes de Nuevos Jugadores ({requests.length})
        </h2>
      </div>
      
      {requests.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <CheckCircle size={40} className="mx-auto text-emerald-400 mb-3 opacity-50" />
          <p className="font-medium text-gray-900">No hay solicitudes pendientes</p>
          <p className="text-sm mt-1">Todas las solicitudes de registro han sido gestionadas.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {requests.map(req => (
          <div key={req.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {req.first_name} {req.last_name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">Equipo sugerido:</span> {req.teams ? `${req.teams.name} (${req.teams.category})` : 'Sin equipo seleccionado (Asignar más tarde)'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>Nacimiento: {new Date(req.birth_date).toLocaleDateString()}</span>
                {req.position && <span>Posición: {req.position}</span>}
                {req.dorsal && <span>Dorsal: {req.dorsal}</span>}
              </div>
              {req.medical_notes && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2 border border-red-100">
                  <span className="font-bold">Alergias/Notas médicas:</span> {req.medical_notes}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button 
                onClick={() => handleReject(req.id)}
                disabled={processingId === req.id}
                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors disabled:opacity-50"
              >
                <XCircle size={18} /> Rechazar
              </button>
              <button 
                onClick={() => {
                  setSelectedRequest(req)
                  setSelectedTeamId(req.team_id || "")
                }}
                disabled={processingId === req.id}
                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                {processingId === req.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Aprobar Alta
              </button>
            </div>
          </div>
          ))}
        </div>
      )}

      {/* Modal de Aprobación */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-blue-600 p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle size={20} />
                Revisión y Aprobación
              </h3>
              <button onClick={() => setSelectedRequest(null)} className="text-white/80 hover:text-white transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Resumen de datos */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm space-y-3">
                <div>
                  <span className="text-gray-500 font-medium block">Jugador</span>
                  <span className="text-gray-900 font-bold text-lg">{selectedRequest.first_name} {selectedRequest.last_name}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 font-medium block">Fecha Nac.</span>
                    <span className="text-gray-900 font-medium">{new Date(selectedRequest.birth_date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium block">Posición</span>
                    <span className="text-gray-900 font-medium">{selectedRequest.position || '-'}</span>
                  </div>
                </div>

                {selectedRequest.medical_notes && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-100">
                    <span className="font-bold block mb-1">Alergias / Notas médicas:</span>
                    {selectedRequest.medical_notes}
                  </div>
                )}
              </div>

              {/* Selección de Equipo */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Asignar Equipo</label>
                <select 
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full border-gray-300 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                >
                  <option value="">Sin equipo (Asignar más tarde)</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Si dejas esto en blanco, el jugador entrará al club pero quedará en la lista de jugadores sin equipo asignado.
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setSelectedRequest(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleApproveConfirm}
                disabled={processingId === selectedRequest.id}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {processingId === selectedRequest.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Confirmar Alta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
