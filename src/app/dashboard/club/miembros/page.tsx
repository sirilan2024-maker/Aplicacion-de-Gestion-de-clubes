"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Users, Search, Loader2, Mail, Shield, User as UserIcon, Archive } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import { archivePlayerAction, updatePlayerPositionAction, exportRgpdAction, createFamilyAndPlayerAction, getClubStaffAction } from "@/app/actions/player-actions"
import { updateUserRoleAction, updateUserRolesAction, generateStaffInviteAction, assignStaffToTeamAction, cancelStaffInvitationAction } from "@/app/actions/club-actions"
import Link from "next/link"
import { PendingRequestsReview } from "@/components/features/admin/PendingRequestsReview"
import { X, Copy, Check, Link as LinkIcon, Edit3, XCircle } from "lucide-react"

// --- Modal para Invitar Miembro (Jugador) ---
function InviteMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/inscripcion` : '';

  if (!open) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Enlace copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`¡Únete a nuestro club! Completa la inscripción aquí: ${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent("Inscripción en el Club");
    const body = encodeURIComponent(`Hola,\n\nPara inscribirte en nuestro club, por favor completa el siguiente formulario:\n\n${inviteLink}\n\n¡Te esperamos!`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Invitar a Miembro</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200">
            <X className="h-5 w-5 text-gray-800" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">
          Comparte el enlace de inscripción pública con las familias para que puedan registrar a sus hijos.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input readOnly value={inviteLink} className="flex-1 border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-sm outline-none" />
            <button 
              onClick={copyToClipboard}
              className="p-2.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex-shrink-0"
              title="Copiar enlace"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={shareWhatsApp}
              className="bg-[#25D366] text-white font-medium py-2.5 rounded-lg hover:bg-[#22bf5b] transition-colors flex items-center justify-center gap-2"
            >
              WhatsApp
            </button>
            <button 
              onClick={shareEmail}
              className="bg-gray-800 text-white font-medium py-2.5 rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
            >
              Email
            </button>
          </div>

          <button 
            onClick={onClose} 
            className="w-full bg-gray-100 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-colors mt-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Modal para Alta Manual Asistida (Plan B) ---
function AltaAsistidaModal({ open, onClose, clubId }: { open: boolean; onClose: () => void; clubId: string }) {
  const [email, setEmail] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Usaremos una server action para crear el usuario y enviar el Magic Link
      const { altaAsistidaAction } = await import("@/app/actions/secretaria-actions");
      const res = await altaAsistidaAction({ email, playerName, clubId });
      
      if (!res.success) {
        throw new Error(res.error);
      }
      
      toast.success("Alta asistida completada. Se ha enviado el enlace al tutor.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar el alta asistida");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-gray-900">Alta Manual Asistida</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200">
            <X className="h-5 w-5 text-gray-800" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">
          Utiliza esta opción exclusiva de Secretaría para familias con dificultades técnicas. Se creará la ficha sin consentimiento LOPDGDD y se enviará un enlace de verificación al correo del tutor para que firme legalmente.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre completo del Jugador</label>
            <input 
              required
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Ej. Martín García"
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Correo electrónico del Padre/Tutor</label>
            <input 
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 bg-white text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
            <button type="submit" disabled={submitting || !email || !playerName} className="flex-1 bg-amber-600 text-white py-2.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Edit3 size={18} />}
              Procesar Alta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Modal para Invitar Staff ---
function InviteStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [role, setRole] = useState("entrenador");
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const res = await generateStaffInviteAction(role);
      if (res.success && res.token) {
        // En desarrollo o producción, construir el link completo
        const baseUrl = window.location.origin;
        setInviteLink(`${baseUrl}/register/staff/${res.token}`);
      } else {
        toast.error(res.error || "Error al generar enlace");
      }
    } catch (err: any) {
      toast.error("Error al generar la invitación");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Enlace copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" aria-labelledby="invite-staff-title">
      <div className="animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 id="invite-staff-title" className="text-xl font-bold text-gray-900">Invitar Staff</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200">
            <X className="h-5 w-5 text-gray-800" />
          </button>
        </div>

        {!inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Selecciona el rol para el nuevo miembro del staff. Se generará un enlace que podrás enviarle por WhatsApp o email.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol a asignar</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="entrenador">Entrenador</option>
                <option value="coordinador">Coordinador</option>
                <option value="admin">Administrador</option>
                <option value="secretario">Secretario</option>
                <option value="tesorero">Tesorero</option>
                <option value="delegado">Delegado</option>
              </select>
            </div>
            <button 
              onClick={handleGenerate} 
              disabled={submitting}
              className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 mt-4 transition-colors"
            >
              {submitting ? "Generando..." : "Generar Enlace de Invitación"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
              ¡Enlace generado correctamente! Compártelo con la persona que deseas invitar. El enlace es de un solo uso.
            </div>
            <div className="flex items-center gap-2">
              <input readOnly value={inviteLink} className="flex-1 border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-sm outline-none" />
              <button 
                onClick={copyToClipboard}
                className="p-2.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex-shrink-0"
                title="Copiar enlace"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <button 
              onClick={onClose} 
              className="w-full bg-gray-100 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-colors mt-2"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Modal para Añadir Jugador (Miembro) ---
function AddPlayerModal({ open, onClose, onSuccess, clubId, teams }: { open: boolean; onClose: () => void; onSuccess: () => void; clubId: string; teams: {id: string, name: string}[] }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  
  const [teamId, setTeamId] = useState("");
  const [posicionPrincipal, setPosicionPrincipal] = useState("Jugador");
  const [dorsal, setDorsal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createFamilyAccount, setCreateFamilyAccount] = useState(false);
  const [familyPassword, setFamilyPassword] = useState("");
  
  // Success state
  const [successData, setSuccessData] = useState<{linkCode: string, email: string, password?: string} | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    if (createFamilyAccount && (!email || !familyPassword)) {
      toast.error("Para crear la cuenta familiar, el email y la contraseña son obligatorios");
      setSubmitting(false);
      return;
    }

    try {
      const playerData = {
        first_name: firstName,
        last_name: lastName,
        dni: dni || null,
        birth_date: birthDate || null,
        phone: phone || null,
        email: email || null,
        status: 'active',
        posicion_principal: posicionPrincipal,
        dorsal: dorsal ? parseInt(dorsal) : null,
        team_id: teamId || null
      };

      const familyAuthData = createFamilyAccount ? {
        email,
        password: familyPassword
      } : null;

      const result = await createFamilyAndPlayerAction(playerData, familyAuthData);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Jugador añadido correctamente");
      onSuccess();
      
      // If we created a family account or just generated the RGPD link, show success screen
      if (result.linkCode) {
        setSuccessData({
          linkCode: result.linkCode,
          email: email,
          password: (createFamilyAccount && result.familyCreated) ? familyPassword : undefined
        });
      } else {
        onClose();
      }
    } catch (err: any) {
      toast.error("Error al añadir jugador: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!successData) return;
    const baseUrl = window.location.origin;
    const rgpdLink = `${baseUrl}/rgpd/${successData.linkCode}`;
    
    let textToCopy = `Hola! Aquí tienes el enlace para firmar la Política de Privacidad del club:\n${rgpdLink}`;
    if (successData.password) {
      textToCopy += `\n\nAdemás, hemos creado tu cuenta de acceso a la App del club.\nEmail: ${successData.email}\nContraseña temporal: ${successData.password}\n\nPor favor, inicia sesión y cambia tu contraseña.`;
    }
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Mensaje copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAndClose = () => {
    setFirstName(""); setLastName(""); setDni(""); setBirthDate(""); setPhone(""); setEmail("");
    setTeamId(""); setPosicionPrincipal("Jugador"); setDorsal("");
    setCreateFamilyAccount(false); setFamilyPassword(""); setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" aria-labelledby="add-player-title">
      <div className="animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
          <h2 id="add-player-title" className="text-xl font-bold text-gray-900">Alta de Jugador</h2>
          <button onClick={resetAndClose} className="rounded-full p-1 hover:bg-gray-200">
            <X className="h-5 w-5 text-gray-800" />
          </button>
        </div>
        
        {successData ? (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-emerald-800">¡Alta Completada!</h3>
              <p className="text-emerald-600 mt-1">El jugador se ha registrado correctamente.</p>
            </div>

            {successData.password && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-900 mb-2">Credenciales de la Familia</h4>
                <p className="text-sm text-gray-600 mb-1">Pásale estos datos al padre/madre para que pueda acceder a la app:</p>
                <div className="mt-3 bg-white border border-gray-200 rounded p-3">
                  <p className="text-sm"><span className="font-medium text-gray-700">Email:</span> {successData.email}</p>
                  <p className="text-sm"><span className="font-medium text-gray-700">Contraseña:</span> {successData.password}</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2"><LinkIcon size={16} /> Enlace de Protección de Datos (RGPD)</h4>
              <p className="text-sm text-blue-700 mb-3">
                El tutor legal debe aceptar la Política de Privacidad. Puedes copiar el siguiente mensaje y enviarlo por WhatsApp.
              </p>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={`${window.location.origin}/rgpd/${successData.linkCode}`} 
                  className="w-full bg-white border border-blue-200 text-blue-800 rounded-lg px-3 py-2 text-sm outline-none"
                />
                <button 
                  onClick={copyToClipboard}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 flex-shrink-0 text-sm font-medium"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  Copiar Todo
                </button>
              </div>
            </div>

            <button 
              onClick={resetAndClose}
              className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cerrar y volver al Directorio
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECCIÓN: Datos Personales */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Datos Personales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Nombre" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                <input required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Apellidos" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DNI / NIE</label>
                <input value={dni} onChange={e => setDni(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="12345678A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
          </div>

          {/* SECCIÓN: Contacto */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Contacto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="+34 600 000 000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Principal (Jugador o Tutor)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="correo@ejemplo.com" />
              </div>
            </div>
          </div>

          {/* SECCIÓN: Datos Deportivos */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Datos Deportivos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Posición Principal</label>
                <select value={posicionPrincipal} onChange={e => setPosicionPrincipal(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="Portero">Portero</option>
                  <option value="Defensa">Defensa</option>
                  <option value="Medio">Medio</option>
                  <option value="Delantero">Delantero</option>
                  <option value="Jugador">Jugador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dorsal</label>
                <input type="number" min="1" max="99" value={dorsal} onChange={e => setDorsal(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Ej: 10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a Equipo</label>
                <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">-- Sin equipo --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN: Cuenta Familiar */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-2">
            <div className="flex items-start gap-3">
              <div className="pt-1">
                <input 
                  type="checkbox" 
                  id="createFamily" 
                  checked={createFamilyAccount}
                  onChange={e => setCreateFamilyAccount(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="createFamily" className="text-sm font-bold text-blue-900 cursor-pointer block">
                  Crear cuenta de acceso para la familia ahora
                </label>
                <p className="text-xs text-blue-700 mt-1">
                  Activa esto si quieres que los padres puedan entrar a la App inmediatamente. Necesitarás introducir un Email Principal arriba y una contraseña inicial aquí abajo.
                </p>
                
                {createFamilyAccount && (
                  <div className="mt-4 pt-4 border-t border-blue-200 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña Inicial *</label>
                    <input 
                      required={createFamilyAccount}
                      type="text" 
                      value={familyPassword} 
                      onChange={e => setFamilyPassword(e.target.value)} 
                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                      placeholder="Ej: DNI o contraseña genérica" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Esta contraseña se la comunicarás al padre. Podrá cambiarla luego desde su perfil.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex gap-3 justify-end">
            <button 
              type="button"
              onClick={resetAndClose}
              className="bg-gray-100 text-gray-700 font-medium px-6 py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button 
              disabled={submitting} 
              type="submit" 
              className="bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Guardando..." : "Finalizar Alta"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
// --- Modal para Gestionar Staff ---
function ManageStaffModal({ open, onClose, member, teams, onSuccess }: { open: boolean; onClose: () => void; member: Member | null; teams: {id: string, name: string}[]; onSuccess: () => void }) {
  const [activeRole, setActiveRole] = useState("");
  const [assignedRoles, setAssignedRoles] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (member) {
      setActiveRole(member.role || "entrenador");
      const initialRoles = member.roles && member.roles.length > 0 
        ? member.roles 
        : [member.role || "entrenador"];
      setAssignedRoles(initialRoles);
      
      if (member.teams && member.teams.length > 0) {
        setTeamIds(member.teams.map(t => t.id));
      } else if (member.team_id) {
        setTeamIds([member.team_id]);
      } else {
        setTeamIds([]);
      }
    }
  }, [member]);

  if (!open || !member) return null;

  const handleSave = async () => {
    setSubmitting(true);
    try {
      if (assignedRoles.length === 0) {
        throw new Error("Debe seleccionar al menos un rol asignado.");
      }
      if (!assignedRoles.includes(activeRole)) {
        throw new Error("El rol activo debe estar entre los roles asignados.");
      }

      const resRole = await updateUserRolesAction(member.id, activeRole, assignedRoles);
      if (!resRole.success) throw new Error(resRole.error);
      
      const resTeam = await assignStaffToTeamAction(member.id, teamIds);
      if (!resTeam.success) throw new Error(resTeam.error);
      
      toast.success("Staff actualizado correctamente");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-in fade-in-0 zoom-in-95 duration-300 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Gestionar Staff</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-200">
            <X className="h-5 w-5 text-gray-800" />
          </button>
        </div>
        
        <div className="mb-6 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <span className="block text-lg font-bold text-gray-900 mb-1">{member.first_name} {member.last_name}</span>
          
          {member.email?.includes('/register/staff/') ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                <strong>Pendiente de confirmación</strong><br/>
                Copia este enlace y envíaselo por WhatsApp o correo para que complete su registro. Al hacerlo, se unirá automáticamente a su equipo.
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input readOnly value={member.email || ''} className="flex-1 border border-gray-300 rounded-lg p-2.5 bg-white text-sm outline-none text-gray-600" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(member.email || '');
                    setCopied(true);
                    toast.success("Enlace copiado al portapapeles");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex-shrink-0"
                  title="Copiar enlace"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          ) : (
            <span className="text-gray-500">{member.email}</span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles Asignados</label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {[
                { val: 'admin', label: 'Admin' },
                { val: 'coordinador', label: 'Coordinador' },
                { val: 'entrenador', label: 'Entrenador' },
                { val: 'jugador', label: 'Jugador' },
                { val: 'tutor', label: 'Padre/Madre/Tutor' }
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
                    <span className="text-sm font-medium text-gray-700">{r.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {assignedRoles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol Activo Inicial</label>
              <select 
                value={activeRole} 
                onChange={e => setActiveRole(e.target.value)} 
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 capitalize"
              >
                {assignedRoles.map(r => (
                  <option key={r} value={r}>
                    {r === 'admin' ? 'Admin' : r === 'coach' || r === 'entrenador' ? 'Entrenador' : r === 'coordinador' ? 'Coordinador' : r === 'jugador' ? 'Jugador' : r === 'tutor' ? 'Padre/Madre/Tutor' : r}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Asignar a Equipo(s)</label>
            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 bg-white">
              {teams.length === 0 && <p className="text-sm text-gray-500 p-2">No hay equipos disponibles</p>}
              {teams.map(t => (
                <label key={t.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
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
                  <span className="ml-3 text-sm text-gray-700">{t.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Al asignar un equipo, este miembro será el responsable principal de dicho equipo.</p>
          </div>
          
          <div className="pt-2 flex gap-3">
            <button 
              onClick={handleSave} 
              disabled={submitting} 
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Guardando..." : "Guardar Cambios"}
            </button>
            <button 
              onClick={onClose} 
              className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2.5 text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


interface Member {
  id: string
  first_name: string
  last_name: string
  email: string | null
  role: string
  roles?: string[]
  team_name?: string | null
  team_color?: string | null
  team_id?: string | null
  teams?: {id: string, name: string, color?: string}[]
  type: 'staff' | 'player'
}

export default function GlobalMembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [teamFilter, setTeamFilter] = useState("all")
  const [archivingId, setArchivingId] = useState<string | null>(null)
  
  // Stats
  const [stats, setStats] = useState({ total: 0, staff: 0, players: 0 })
  const [clubId, setClubId] = useState<string>("")
  const [allTeams, setAllTeams] = useState<{id: string, name: string}[]>([])

  // Modal States
  const [showInviteStaff, setShowInviteStaff] = useState(false)
  const [showInviteMember, setShowInviteMember] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAltaAsistida, setShowAltaAsistida] = useState(false);
  const [managingMember, setManagingMember] = useState<Member | null>(null)
  const [exportingRgpd, setExportingRgpd] = useState(false)

  const handleExportRgpd = async () => {
    if (!clubId) return
    setExportingRgpd(true)
    const result = await exportRgpdAction(clubId)
    if (result.success && result.csv) {
      const blob = new Blob(["\uFEFF" + result.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `auditoria_rgpd_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Certificado descargado correctamente")
    } else {
      toast.error("Error al descargar: " + result.error)
    }
    setExportingRgpd(false)
  }

  const fetchMembers = async () => {
      setLoading(true)
      const supabase = createClient()

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("No autenticado")

        const { data: profile } = await supabase
          .from("profiles")
          .select("club_id, role")
          .eq("id", user.id)
          .single()

        if (!profile?.club_id) throw new Error("Usuario sin club asignado")
        
        const role = profile?.role?.toLowerCase() || '';
        if (role === 'jugador' || role === 'tutor' || role === 'familiar' || role === 'family' || role === 'familia') {
          toast.error("No tienes permisos para ver el directorio del club");
          router.push("/dashboard/mi-perfil");
          return;
        }
        
        setClubId(profile.club_id)

        // 1. Fetch Staff (profiles) using Server Action to bypass RLS recursion bugs
        const staffRes = await getClubStaffAction(profile.club_id)
        const staffData = staffRes.success ? staffRes.data : null
        
        console.log("[Miembros] staffData:", staffData?.length, "profiles found, error:", staffRes.error || "none")

        // Get Active Season
        const { data: activeSeason } = await supabase
          .from("seasons")
          .select("id")
          .eq("club_id", profile.club_id)
          .eq("is_active", true)
          .single()

        // 2. Fetch all players for this club directly from players table
        let playersData: any[] = []
        
        // Fetch all teams for the club to pass to the modal
        const { data: clubTeams } = await supabase
          .from("teams")
          .select("id, name")
          .eq("club_id", profile.club_id)
          .order("name")
        
        if (clubTeams) setAllTeams(clubTeams)

        // Fetch all players for the club
        const { data: rawPlayers } = await supabase
          .from("players")
          .select(`
            id, first_name, last_name, parent1_email, posicion_principal, team_id, registration_status, status,
            teams (name, color, club_id)
          `)
          .eq("club_id", profile.club_id)
          .in("status", ["active", "activo", "pending"])
          
        if (rawPlayers) {
          playersData = rawPlayers.map((p: any) => ({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.parent1_email,
            posicion: p.posicion_principal,
            team_id: p.team_id,
            equipos: Array.isArray(p.teams) ? p.teams[0] : p.teams
          }))
        }

        const allMembers: Member[] = []
        let staffCount = 0;
        let playersCount = 0;

        if (staffData) {
          staffData.forEach((s: any) => {
            const teamsArray = Array.isArray(s.teams) ? s.teams : [];
            const primaryTeam = teamsArray[0];
            allMembers.push({
              id: s.id,
              first_name: s.first_name || '',
              last_name: s.last_name || '',
              email: s.email,
              role: s.role || 'staff',
              roles: s.roles || [s.role || 'staff'],
              team_id: primaryTeam?.id,
              team_name: primaryTeam?.name,
              team_color: primaryTeam?.color,
              teams: teamsArray,
              type: 'staff'
            })
            staffCount++;
          })
        }

        // 1.5 Fetch Staff Invitations (Pending) via Server Action
        const { getPendingStaffInvitationsAction } = await import('@/app/actions/club-actions')
        const invRes = await getPendingStaffInvitationsAction(profile.club_id)
        const invitations = invRes.success ? invRes.data : null

        if (invitations && Array.isArray(invitations)) {
          invitations.forEach((inv: any) => {
            const teamInfo = Array.isArray(inv.teams) ? inv.teams[0] : inv.teams;
            allMembers.push({
              id: inv.id,
              first_name: inv.name || 'Staff Invitado',
              last_name: '(Pendiente de registro)',
              email: `${window.location.origin}/register/staff/${inv.token}`,
              role: inv.role || 'entrenador',
              team_id: inv.team_id,
              team_name: teamInfo?.name,
              team_color: teamInfo?.color,
              type: 'staff'
            })
            staffCount++;
          })
        }

        if (playersData) {
          playersData.forEach(p => {
            const isCoach = p.posicion?.toLowerCase().includes('entrenador') || p.posicion?.toLowerCase().includes('delegado') || p.posicion?.toLowerCase().includes('técnico');
            const determinedRole = isCoach ? 'entrenador' : 'jugador';
            
            if (isCoach) {
              staffCount++;
            } else {
              playersCount++;
            }

            allMembers.push({
              id: p.id,
              first_name: p.first_name || '',
              last_name: p.last_name || '',
              email: p.email,
              role: determinedRole,
              team_id: p.team_id,
              team_name: p.equipos?.name,
              team_color: p.equipos?.color,
              type: 'player'
            })
          })
        }

        // Sort: Members without a team first, then alphabetical by last name
        allMembers.sort((a, b) => {
          const aNoTeam = !a.team_id;
          const bNoTeam = !b.team_id;
          
          if (aNoTeam && !bNoTeam) return -1;
          if (!aNoTeam && bNoTeam) return 1;
          
          return a.last_name.localeCompare(b.last_name);
        })
        setMembers(allMembers)
        
        setStats({
          total: allMembers.length,
          staff: staffCount,
          players: playersCount
        })

      } catch (err: any) {
        console.error(err)
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const handleRoleChange = async (member: Member, newRole: string) => {
    if (member.role === newRole) return;

    // Advertencia si es una ficha deportiva (player) pero le van a poner un rol administrativo
    const adminRoles = ['admin', 'coordinador', 'staff'];
    if (member.type === 'player' && adminRoles.includes(newRole.toLowerCase())) {
      const confirm = window.confirm(`ATENCIÓN:\n\nEste miembro es una ficha deportiva (no tiene cuenta de acceso con contraseña).\n\nCambiar su etiqueta a "${newRole}" NO le dará acceso a la aplicación. Si quieres darle derechos administrativos reales, debes usar el botón azul de "Invitar Staff" para que cree su cuenta.\n\n¿Quieres cambiar la etiqueta de todas formas?`);
      if (!confirm) return;
    }

    const toastId = toast.loading("Actualizando rol...");
    try {
      if (member.type === 'staff') {
        const res = await updateUserRoleAction(member.id, newRole);
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await updatePlayerPositionAction(member.id, newRole);
        if (!res.success) throw new Error(res.error?.message || "Error desconocido");
      }
      
      // Update local state to reflect change instantly
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
      toast.success("Rol actualizado correctamente", { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  }

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm("¿Seguro que quieres archivar a este miembro? Desaparecerá de las listas pero podrás restaurarlo desde el Archivo Histórico.")) return
    
    setArchivingId(id)
    const result = await archivePlayerAction(id, true)
    
    if (result.success) {
      toast.success("Miembro archivado correctamente")
      setMembers(members.filter(m => m.id !== id))
      setStats(prev => ({...prev, total: prev.total - 1, players: prev.players - 1}))
    } else {
      toast.error(result.error?.message || "Error al archivar")
    }
    setArchivingId(null)
  }

  const handleDeleteInvitation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm("¿Seguro que quieres cancelar esta invitación? El enlace dejará de funcionar.")) return
    
    setArchivingId(id)
    const result = await cancelStaffInvitationAction(id)
    
    if (result.success) {
      toast.success("Invitación cancelada correctamente")
      setMembers(members.filter(m => m.id !== id))
    } else {
      toast.error(result.error || "Error al cancelar la invitación")
    }
    setArchivingId(null)
  }

  const filteredMembers = members.filter(m => {
    const searchMatch = `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    let roleMatch = false;
    if (roleFilter === 'all') roleMatch = true;
    else if (roleFilter === 'staff') roleMatch = m.type === 'staff';
    else roleMatch = m.role === roleFilter;

    let teamMatch = false;
    if (teamFilter === 'all') teamMatch = true;
    else if (teamFilter === 'unassigned') teamMatch = !m.team_name;
    else teamMatch = m.team_name === teamFilter;

    return searchMatch && roleMatch && teamMatch;
  })

  // Sort so Staff is always at the top, then players without team, then alphabetically by first name
  filteredMembers.sort((a, b) => {
    if (a.type === 'staff' && b.type !== 'staff') return -1;
    if (a.type !== 'staff' && b.type === 'staff') return 1;
    
    if (a.type === 'player' && b.type === 'player') {
      const aSinEquipo = !a.team_name;
      const bSinEquipo = !b.team_name;
      if (aSinEquipo && !bSinEquipo) return -1;
      if (!aSinEquipo && bSinEquipo) return 1;
    }

    return (a.first_name || '').localeCompare(b.first_name || '');
  });

  // Extract unique teams for the dropdown
  const uniqueTeams = Array.from(new Set(members.map(m => m.team_name).filter(Boolean))) as string[];
  uniqueTeams.sort((a, b) => a.localeCompare(b));

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">Administrador</span>
      case 'coach':
      case 'entrenador':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Entrenador</span>
      case 'jugador':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Jugador</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 capitalize">{role}</span>
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Toaster />
      
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Directorio del Club</h1>
          <p className="text-gray-500 mt-1">Gestión global de todos los miembros y permisos.</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          <button
            onClick={handleExportRgpd}
            disabled={exportingRgpd}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md bg-red-600 border border-transparent px-2 py-2 sm:px-4 sm:py-2.5 text-white hover:bg-red-700 transition-colors shadow-sm text-[11px] sm:text-sm font-medium"
          >
            <Shield size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="truncate">{exportingRgpd ? "Exportando..." : "Auditoría RGPD"}</span>
          </button>
          <Link href="/dashboard/club/miembros/archivo" className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md bg-yellow-500 border border-transparent px-2 py-2 sm:px-4 sm:py-2.5 text-white hover:bg-yellow-600 transition-colors shadow-sm text-[11px] sm:text-sm font-medium">
            <Archive size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="truncate">Archivo Histórico</span>
          </Link>
          <button 
            onClick={() => setShowAltaAsistida(true)}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md bg-orange-600 px-2 py-2 sm:px-4 sm:py-2.5 text-white hover:bg-orange-700 transition-colors shadow-sm text-[11px] sm:text-sm font-medium"
          >
            <Edit3 size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="truncate">Alta Manual</span>
          </button>
          <button 
            onClick={() => setShowAddPlayer(true)}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md bg-emerald-600 px-2 py-2 sm:px-4 sm:py-2.5 text-white hover:bg-emerald-700 transition-colors shadow-sm text-[11px] sm:text-sm font-medium"
          >
            <UserIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="truncate">Añadir Jugador</span>
          </button>
          <button 
            onClick={() => setShowInviteMember(true)}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md bg-purple-600 px-2 py-2 sm:px-4 sm:py-2.5 text-white hover:bg-purple-700 transition-colors shadow-sm text-[11px] sm:text-sm font-medium"
          >
            <LinkIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="truncate">Invitar Miembro</span>
          </button>
          <button 
            onClick={() => setShowInviteStaff(true)}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md bg-blue-600 px-2 py-2 sm:px-4 sm:py-2.5 text-white hover:bg-blue-700 transition-colors shadow-sm text-[11px] sm:text-sm font-medium"
          >
            <Mail size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="truncate">Invitar Staff</span>
          </button>
        </div>
      </div>

      <PendingRequestsReview />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Users className="text-blue-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Miembros</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
            <Shield className="text-purple-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Cuerpo Técnico / Directiva</p>
            <p className="text-2xl font-bold text-gray-900">{stats.staff}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <UserIcon className="text-emerald-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Jugadores</p>
            <p className="text-2xl font-bold text-gray-900">{stats.players}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select 
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48"
          >
            <option value="all">Todos los roles</option>
            <option value="staff">Solo Staff</option>
            <option value="jugador">Solo Jugadores</option>
            <option value="admin">Administradores</option>
            <option value="entrenador">Entrenadores</option>
          </select>

          <select 
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48"
          >
            <option value="all">Todos los equipos</option>
            <option value="unassigned">Sin asignar</option>
            {uniqueTeams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* VISTA MÓVIL (Cards) */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Cargando directorio...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No se encontraron miembros con esos filtros.
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div 
                key={member.id} 
                className="p-4 hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={() => {
                  if (member.type === 'staff') router.push(`/dashboard/club/miembros/staff/${member.id}`)
                  else if (member.type === 'player') router.push(`/dashboard/club/jugador/${member.id}`)
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.first_name} {member.last_name}</h3>
                    {member.email?.includes('/register/staff/') ? (
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1 inline-block">
                        Pendiente de confirmación
                      </span>
                    ) : (
                      <p className="text-xs text-gray-500 mt-0.5">{member.email || "Sin email"}</p>
                    )}
                  </div>
                  <div>{getRoleBadge(member.role)}</div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                  <div className="text-sm">
                    {member.team_name ? (
                      <div className="flex items-center gap-2">
                        {member.team_color && (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: member.team_color }}></div>
                        )}
                        <span className="font-medium text-gray-700">{member.team_name}</span>
                      </div>
                    ) : member.type === 'player' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wider shadow-sm">Sin Equipo</span>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Global / Sin asignar</span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                      {member.email?.includes('/register/staff/') ? (
                        <button 
                          onClick={(e) => handleDeleteInvitation(e, member.id)}
                          disabled={archivingId === member.id}
                          className="text-red-500 font-medium text-sm px-2 py-1 rounded-md hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"
                        >
                          {archivingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Cancelar</>}
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); member.type === 'staff' ? setManagingMember(member) : router.push(`/dashboard/club/jugador/${member.id}`); }}
                          className="text-blue-600 font-medium text-sm px-2 py-1 rounded-md hover:bg-blue-50"
                        >
                          Gestionar
                        </button>
                      )}
                      {member.type === 'player' && (
                        <button 
                          onClick={(e) => handleArchive(e, member.id)}
                          disabled={archivingId === member.id}
                          className="text-red-500 p-1.5 rounded-md hover:bg-red-50 disabled:opacity-50"
                        >
                          {archivingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* VISTA ESCRITORIO (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol en Club</th>
                <th className="px-6 py-4">Equipo Asignado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Cargando directorio...</p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                    No se encontraron miembros con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    className="group border-b border-gray-100 hover:bg-blue-50/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (member.type === 'staff') {
                        router.push(`/dashboard/club/miembros/staff/${member.id}`)
                      } else if (member.type === 'player') {
                        router.push(`/dashboard/club/jugador/${member.id}`)
                      }
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{member.first_name} {member.last_name}</span>
                        {member.email?.includes('/register/staff/') ? (
                          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1 w-max">
                            Pendiente de confirmación
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 mt-0.5">{member.email || "Sin email"}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(member.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.teams && member.teams.length > 1 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.teams.map((t, idx) => (
                            <span key={idx} className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {t.name}
                            </span>
                          ))}
                        </div>
                      ) : member.team_name ? (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          {member.team_name}
                        </span>
                      ) : member.type === 'player' ? (
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wider shadow-sm">Sin Equipo</span>
                          <select 
                            onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            e.stopPropagation();
                            if (e.target.value) {
                              const { assignPlayerToTeamAction } = await import("@/app/actions/player-actions");
                              const res = await assignPlayerToTeamAction(member.id, e.target.value);
                              if (res.success) {
                                toast.success("Equipo asignado");
                                fetchMembers();
                              } else {
                                toast.error("Error al asignar");
                              }
                            }
                          }}
                          className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700"
                        >
                          <option value="">Asignar equipo...</option>
                          {allTeams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 italic">Sin equipo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {member.email?.includes('/register/staff/') ? (
                          <button 
                            onClick={(e) => handleDeleteInvitation(e, member.id)}
                            disabled={archivingId === member.id}
                            className="text-red-500 hover:text-red-700 font-medium text-sm px-3 py-1 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                            title="Cancelar invitación"
                          >
                            {archivingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Cancelar Invitación</>}
                          </button>
                        ) : member.type === 'staff' ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setManagingMember(member); }}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            Gestionar
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/club/jugador/${member.id}`); }}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            Gestionar
                          </button>
                        )}
                        {member.type === 'player' && (
                          <button 
                            onClick={(e) => handleArchive(e, member.id)}
                            disabled={archivingId === member.id}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Archivar miembro"
                          >
                            {archivingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <InviteStaffModal open={showInviteStaff} onClose={() => { setShowInviteStaff(false); fetchMembers(); }} />
      <InviteMemberModal open={showInviteMember} onClose={() => setShowInviteMember(false)} />
      <AddPlayerModal open={showAddPlayer} onClose={() => setShowAddPlayer(false)} onSuccess={fetchMembers} clubId={clubId} teams={allTeams} />
      <AltaAsistidaModal open={showAltaAsistida} onClose={() => { setShowAltaAsistida(false); fetchMembers(); }} clubId={clubId} />
      <ManageStaffModal open={!!managingMember} onClose={() => setManagingMember(null)} member={managingMember} teams={allTeams} onSuccess={fetchMembers} />
    </div>
  )
}
