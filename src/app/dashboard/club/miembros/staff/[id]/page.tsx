"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { updateUserRoleAction, updateUserRolesAction, updateStaffProfileAction, assignStaffToTeamAction, removeStaffFromClubAction } from "@/app/actions/club-actions"
import { getClubStaffAction } from "@/app/actions/player-actions"
import toast, { Toaster } from "react-hot-toast"
import { Loader2, ArrowLeft, Shield, Save, User as UserIcon, Phone, CreditCard, Calendar, Award, Camera, Trash2 } from "lucide-react"
import Link from "next/link"

export default function StaffProfilePage() {
  const router = useRouter()
  const params = useParams()
  const staffId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [staff, setStaff] = useState<any>(null)
  
  // Admin Check
  const [isAdmin, setIsAdmin] = useState(false)

  // Edit states for permissions
  const [activeRole, setActiveRole] = useState("")
  const [assignedRoles, setAssignedRoles] = useState<string[]>([])
  const [teamIds, setTeamIds] = useState<string[]>([])
  
  // Edit states for Ficha (Extended Info)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [dni, setDni] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")

  const [teams, setTeams] = useState<any[]>([])

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: currentUser } = await supabase
        .from("profiles")
        .select("club_id, role")
        .eq("id", user.id)
        .single()

      if (!currentUser?.club_id) throw new Error("Sin club")
      
      setIsAdmin(currentUser.role === "admin")

      // Fetch Staff info
      const res = await getClubStaffAction(currentUser.club_id)
      if (!res.success || !res.data) throw new Error("No se pudo cargar el staff")
      
      const foundStaff = res.data.find(s => s.id === staffId)
      if (!foundStaff) throw new Error("Staff no encontrado")

      const assignedTeams = Array.isArray(foundStaff.teams) ? foundStaff.teams : (foundStaff.teams ? [foundStaff.teams] : [])
      const assignedTeamIds = assignedTeams.map((t: any) => t?.id).filter(Boolean) as string[]
      
      setStaff({
        ...foundStaff,
        team_ids: assignedTeamIds
      })

      // Permissions
      setActiveRole(foundStaff.role || "entrenador")
      setAssignedRoles(foundStaff.roles && foundStaff.roles.length > 0 ? foundStaff.roles : [foundStaff.role || "entrenador"])
      setTeamIds(assignedTeamIds)

      // Ficha data
      setFirstName(foundStaff.first_name || "")
      setLastName(foundStaff.last_name || "")
      setEmail(foundStaff.email || "")
      setPhone(foundStaff.phone || "")
      setDni(foundStaff.dni || "")
      setBirthDate(foundStaff.birth_date || "")
      setLicenseNumber(foundStaff.license_number || "")

      // Fetch Teams
      const { data: clubTeams } = await supabase
        .from("teams")
        .select("id, name")
        .eq("club_id", currentUser.club_id)
        .order("name")

      if (clubTeams) setTeams(clubTeams)

    } catch (err: any) {
      toast.error(err.message)
      router.push("/dashboard/club/miembros")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (staffId) fetchData()
  }, [staffId])

  const handleSave = async () => {
    setSubmitting(true)
    try {
      // 1. Guardar Permisos (Rol) - SOLO ADMIN
      const hasRolesChanged = () => {
        const originalRoles = staff.roles || [staff.role || "entrenador"];
        if (assignedRoles.length !== originalRoles.length) return true;
        const sortedSelected = [...assignedRoles].sort();
        const sortedOriginal = [...originalRoles].sort();
        const rolesListEqual = sortedSelected.every((r, idx) => r === sortedOriginal[idx]);
        return !rolesListEqual || activeRole !== staff.role;
      }

      if (isAdmin && hasRolesChanged()) {
        if (assignedRoles.length === 0) {
          throw new Error("Debe seleccionar al menos un rol asignado.")
        }
        if (!assignedRoles.includes(activeRole)) {
          throw new Error("El rol activo debe estar entre los roles asignados.")
        }
        const resRole = await updateUserRolesAction(staffId, activeRole, assignedRoles)
        if (!resRole.success) throw new Error(resRole.error)
      }

      // 2. Guardar Equipos Asignados - SOLO ADMIN
      const hasTeamsChanged = () => {
        const originalIds = staff.team_ids || [];
        if (teamIds.length !== originalIds.length) return true;
        const sortedSelected = [...teamIds].sort();
        const sortedOriginal = [...originalIds].sort();
        return !sortedSelected.every((id, idx) => id === sortedOriginal[idx]);
      }

      if (isAdmin && hasTeamsChanged()) {
        const resTeam = await assignStaffToTeamAction(staffId, teamIds)
        if (!resTeam.success) throw new Error(resTeam.error)
      }

      // 3. Guardar Datos de la Ficha
      const profileData = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        dni,
        birth_date: birthDate,
        license_number: licenseNumber
      }
      
      const resProfile = await updateStaffProfileAction(staffId, profileData)
      if (!resProfile.success) throw new Error(resProfile.error)

      toast.success("Ficha guardada correctamente")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveStaff = async () => {
    if (!confirm(`¿Estás seguro de que deseas dar de baja a ${staff.first_name} del club? Perderá el acceso y se desasignará de cualquier equipo.`)) return;
    
    setSubmitting(true)
    try {
      const res = await removeStaffFromClubAction(staffId)
      if (!res.success) throw new Error(res.error)
      
      toast.success("Miembro dado de baja correctamente")
      router.push("/dashboard/club/miembros")
    } catch (err: any) {
      toast.error(err.message || "Error al dar de baja")
      setSubmitting(false)
    }
  }

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const toastId = toast.loading("Subiendo foto...");
    const supabase = createClient();
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${staff.id}-${Math.random()}.${fileExt}`;
      const filePath = `jugadores/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', staff.id);

      if (updateError) throw updateError;

      setStaff({ ...staff, avatar_url: publicUrl });
      toast.success("Foto actualizada", { id: toastId });
    } catch (error: any) {
      toast.error("Error al subir la foto: " + error.message, { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!staff) return null
  
  const inputClass = "w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Toaster />
      
      <Link href="/dashboard/club/miembros" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Volver a Miembros
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Ficha */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative group flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/30 overflow-hidden shadow-lg">
              {staff.avatar_url ? (
                <img src={staff.avatar_url} alt="Staff" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
              )}
              
              <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={20} className="mb-0.5" />
                <span className="text-[10px] font-bold leading-tight">Foto</span>
                <input type="file" className="hidden" accept="image/*" onChange={uploadPhoto} />
              </label>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">{staff.first_name} {staff.last_name}</h1>
              <p className="text-blue-100 mt-1 flex items-center gap-2 text-sm sm:text-base">
                <Shield className="w-4 h-4" />
                Ficha Técnica / Directiva
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <button 
              onClick={handleSave}
              disabled={submitting}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 sm:py-2.5 text-blue-700 hover:bg-blue-50 transition-colors font-bold shadow-sm disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Ficha
            </button>
          </div>
        </div>

        {/* Contenido Ficha */}
        <div className="p-8">
          <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
            
            {/* Columna Izquierda: Información Personal */}
            <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-8`}>
              
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  Datos Personales
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                    <input 
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2.5 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Apellidos</label>
                    <input 
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2.5 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email (Usuario)</label>
                    <input 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2.5 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-4 h-4 text-slate-400" /> Teléfono
                    </label>
                    <input 
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+34 600 000 000"
                      className={inputClass} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <CreditCard className="w-4 h-4 text-slate-400" /> DNI / Pasaporte
                    </label>
                    <input 
                      value={dni}
                      onChange={e => setDni(e.target.value)}
                      placeholder="12345678A"
                      className={inputClass} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-slate-400" /> Fecha de Nacimiento
                    </label>
                    <input 
                      type="date"
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      className={inputClass} 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  Información Deportiva
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nº Licencia / Nivel</label>
                    <input 
                      value={licenseNumber}
                      onChange={e => setLicenseNumber(e.target.value)}
                      placeholder="Ej: Nivel 2, UEFA Pro"
                      className={inputClass} 
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Columna Derecha: Permisos y Asignaciones (SOLO ADMIN) */}
            {isAdmin && (
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Ajustes del Club
                  </h3>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-2">Roles Asignados</label>
                      <div className="flex flex-wrap gap-3 p-3 bg-white rounded-lg border border-blue-200">
                        {[
                          { val: 'admin', label: 'Admin' },
                          { val: 'coordinador', label: 'Coordinador' },
                          { val: 'entrenador', label: 'Entrenador' },
                          { val: 'jugador', label: 'Jugador' },
                          { val: 'tutor', label: 'Padre/Madre/Tutor' },
                          { val: 'utillero', label: 'Utillero' },
                          { val: 'directivo', label: 'Directivo' },
                          { val: 'secretario', label: 'Secretario' },
                          { val: 'tesorero', label: 'Tesorero' },
                          { val: 'delegado', label: 'Delegado' }
                        ].map(r => {
                          const checked = assignedRoles.includes(r.val);
                          return (
                            <label key={r.val} className="flex items-center gap-2 p-1 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  let newRoles = [...assignedRoles];
                                  if (e.target.checked) {
                                    if (!newRoles.includes(r.val)) newRoles.push(r.val);
                                  } else {
                                    newRoles = newRoles.filter(roleVal => roleVal !== r.val);
                                  }
                                  setAssignedRoles(newRoles);
                                  if (activeRole === r.val && !e.target.checked) {
                                    if (newRoles.length > 0) {
                                      setActiveRole(newRoles[0]);
                                    } else {
                                      setActiveRole("");
                                    }
                                  } else if (newRoles.length > 0 && !newRoles.includes(activeRole)) {
                                    setActiveRole(newRoles[0]);
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-slate-700">{r.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {assignedRoles.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">Rol Activo Inicial</label>
                        <select 
                          value={activeRole} 
                          onChange={e => setActiveRole(e.target.value)} 
                          className="w-full border border-blue-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white capitalize"
                        >
                          {assignedRoles.map(r => (
                            <option key={r} value={r}>
                              {r === 'admin' ? 'Admin' : 
                               r === 'coordinador' ? 'Coordinador' :
                               r === 'coach' || r === 'entrenador' ? 'Entrenador' : 
                               r === 'jugador' ? 'Jugador' : 
                               r === 'tutor' ? 'Padre/Madre/Tutor' : 
                               r === 'utillero' ? 'Utillero' :
                               r === 'directivo' ? 'Directivo' :
                               r === 'secretario' ? 'Secretario' :
                               r === 'tesorero' ? 'Tesorero' :
                               r === 'delegado' ? 'Delegado' : r}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-2">Equipos Asignados</label>
                      <div className="border border-blue-200 rounded-lg max-h-48 overflow-y-auto p-3 bg-white space-y-2">
                        {teams.length === 0 && <p className="text-sm text-gray-500">No hay equipos disponibles</p>}
                        {teams.map(t => (
                          <label key={t.id} className="flex items-center hover:bg-slate-50 p-1.5 rounded cursor-pointer transition-colors">
                            <input 
                              type="checkbox" 
                              checked={teamIds.includes(t.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTeamIds([...teamIds, t.id]);
                                } else {
                                  setTeamIds(teamIds.filter(id => id !== t.id));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm text-slate-700 font-medium">{t.name}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-blue-700/80 mt-2 leading-relaxed">
                        Selecciona todos los equipos en los que este miembro del staff/entrenador participa.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded-xl p-6 border border-red-100 mt-6">
                  <h3 className="text-lg font-bold text-red-900 mb-2 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Atención
                  </h3>
                  <p className="text-sm text-red-700/80 mb-4 leading-relaxed">
                    Al dar de baja a este miembro, perderá el acceso a la plataforma del club y se desasignará de cualquier equipo al que esté vinculado. Su cuenta no se eliminará del sistema global, pero ya no formará parte de tu club.
                  </p>
                  <button 
                    onClick={handleRemoveStaff}
                    disabled={submitting}
                    className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    Dar de baja del club
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
