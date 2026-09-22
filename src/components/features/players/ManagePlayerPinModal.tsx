"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  KeyRound, Copy, Check, Mail, RefreshCw, AlertCircle, 
  Users, Info, ShieldCheck, CheckCircle2, Loader2, Sparkles, Send
} from "lucide-react";
import { 
  getPlayerFamilyPinInfoAction, 
  regeneratePlayerPinAction, 
  sendSinglePlayerPinByEmailAction,
  PlayerPinDetailsResult
} from "@/app/actions/pin-distribution-actions";
import toast from "react-hot-toast";

interface ManagePlayerPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
}

export function ManagePlayerPinModal({
  isOpen,
  onClose,
  playerId,
  playerName,
}: ManagePlayerPinModalProps) {
  const [loading, setLoading] = useState(true);
  const [pinData, setPinData] = useState<PlayerPinDetailsResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!isOpen || !playerId) return;

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const res = await getPlayerFamilyPinInfoAction(playerId);
        if (isMounted) {
          setPinData(res);
          // Pre-seleccionar email sugerido si existe
          if (res.suggestedEmails && res.suggestedEmails.length > 0) {
            setEmailInput(res.suggestedEmails[0].email);
          }
        }
      } catch (err: any) {
        toast.error("Error al cargar datos del PIN: " + err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, playerId]);

  const handleCopyPin = () => {
    if (!pinData?.pin) return;
    navigator.clipboard.writeText(pinData.pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("PIN copiado al portapapeles");
  };

  const handleRegenerate = async () => {
    if (!confirm("¿Seguro que deseas generar un nuevo PIN? El código anterior quedará invalidado de inmediato.")) {
      return;
    }

    setRegenerating(true);
    try {
      const res = await regeneratePlayerPinAction(playerId);
      if (res.success && res.newPin) {
        setPinData(prev => prev ? ({ ...prev, pin: res.newPin! }) : null);
        toast.success("Nuevo PIN generado con éxito");
      } else {
        toast.error(res.error || "No se pudo regenerar el PIN");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al regenerar PIN");
    } finally {
      setRegenerating(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@")) {
      toast.error("Introduce un correo electrónico válido");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await sendSinglePlayerPinByEmailAction({
        playerId,
        recipientEmail: emailInput.trim(),
      });

      if (res.success) {
        toast.success(`PIN enviado correctamente a ${emailInput}`);
      } else {
        toast.error(res.error || "No se pudo enviar el correo");
      }
    } catch (err: any) {
      toast.error(err.message || "Error de conexión");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Acceso Familiar y Credenciales Digitales (PIN)"
      description={`Gestión del código de acceso digital para los tutores legales de ${playerName}.`}
      className="max-w-xl p-0 overflow-hidden"
    >
      <div className="p-6 space-y-5">
        {/* BANNER CLAVE EXPLICATIVO (Anti-Confusión) */}
        <div className="bg-amber-50/80 border-2 border-amber-200/90 rounded-2xl p-4 text-xs text-amber-950 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>¿Para qué sirve este PIN de Acceso Familiar?</span>
          </div>
          <p className="leading-relaxed">
            Este código es la <strong>llave de vinculación digital</strong> a la ficha deportiva de este jugador.
          </p>
          <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200 text-[11px] leading-relaxed">
            <span className="font-bold text-amber-900">⚠️ No confundir con el PIN de inscripción:</span> Este PIN no es para rellenar formularios, sino para que el <strong>segundo progenitor (padre o madre separado)</strong> o un tutor legal pueda darse de alta con su <strong>propio correo y contraseña</strong>, viendo las convocatorias, asistencias y datos de su hijo con total privacidad e independencia.
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Cargando credenciales del jugador...</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* TARJETA DEL CÓDIGO PIN */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase">
                  Código PIN de Acceso
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {pinData?.teamName}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white bg-white/10 px-4 py-2 rounded-xl border border-white/15">
                  {pinData?.pin || "------"}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCopyPin}
                    className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copiado" : "Copiar"}</span>
                  </Button>

                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    title="Regenerar PIN (invalida el anterior)"
                    className="p-2 hover:bg-white/15 text-slate-300 hover:text-white rounded-xl transition-colors border border-white/20 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-400">
                Comparte este código por teléfono o WhatsApp con el padre o madre que desee acceder a la app.
              </div>
            </div>

            {/* SECCIÓN: ENVIAR PIN POR EMAIL */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Enviar Instrucciones y PIN por Correo Oficial:</span>
              </div>

              {/* Botones de sugerencias rápidas de email */}
              {pinData?.suggestedEmails && pinData.suggestedEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pinData.suggestedEmails.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEmailInput(item.email)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                        emailInput === item.email
                          ? "bg-indigo-100 border-indigo-300 text-indigo-900"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {item.label}: <span className="font-mono">{item.email}</span>
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendEmail} className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Introduce el email del progenitor (madre o padre)..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <Button
                  type="submit"
                  disabled={sendingEmail || !emailInput}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  {sendingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Enviar PIN</span>
                </Button>
              </form>
            </div>

            {/* SECCIÓN: TUTORES CONECTADOS ACTUALMENTE */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Cuentas con Acceso a este Jugador:</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {pinData?.linkedTutors.length || 0} vinculados
                </span>
              </div>

              {pinData?.linkedTutors && pinData.linkedTutors.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {pinData.linkedTutors.map((tutor) => (
                    <div
                      key={tutor.id}
                      className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-900 truncate">
                          {tutor.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {tutor.email}
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                        tutor.isPrimary 
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}>
                        {tutor.isPrimary ? "Tutor Principal" : "Tutor Vinculado"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-50 rounded-xl text-xs text-slate-400">
                  Ninguna cuenta familiar se ha vinculado todavía con este PIN.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
        <Button
          variant="outline"
          onClick={onClose}
          className="text-xs font-bold text-slate-600 hover:bg-slate-100"
        >
          Cerrar
        </Button>
      </div>
    </Dialog>
  );
}
