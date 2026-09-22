"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  FileText, Mail, Download, CheckCircle2, AlertTriangle, 
  Loader2, Copy, Check, Users, AlertCircle, Info, ShieldCheck
} from "lucide-react";
import { sendTeamPinsByEmailAction, SendTeamPinsResult } from "@/app/actions/pin-distribution-actions";
import toast from "react-hot-toast";

interface PlayerItem {
  id: string;
  first_name: string;
  last_name: string;
  posicion?: string;
  posicion_principal?: string | null;
  email?: string | null;
  parent1_email?: string | null;
  parent2_email?: string | null;
  link_code?: string | null;
}

interface ExportPinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  players: PlayerItem[];
  onPinsUpdated?: () => void;
}

export function ExportPinsModal({
  isOpen,
  onClose,
  teamId,
  players,
  onPinsUpdated,
}: ExportPinsModalProps) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendTeamPinsResult | null>(null);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);

  // Filtrar solo jugadores (excluir cuerpo técnico)
  const squadPlayers = players.filter((p) => {
    const pos = (p.posicion_principal || p.posicion || "").toLowerCase();
    return !pos.includes("entrenador") && !pos.includes("delegado") && !pos.includes("técnico");
  });

  // Identificar quiénes tienen email disponible de antemano
  const withEmailCount = squadPlayers.filter(
    (p) => !!(p.email?.trim() || p.parent1_email?.trim() || p.parent2_email?.trim())
  ).length;
  const withoutEmailCount = squadPlayers.length - withEmailCount;

  // Descargar CSV tradicional
  const handleDownloadCsv = () => {
    const csvHeader = "Jugador,PIN de Registro,Email Destino\n";
    const csvRows = squadPlayers.map((p) => {
      const fullName = `"${p.first_name} ${p.last_name}"`;
      const pin = p.link_code || "SIN PIN";
      const targetEmail = p.email || p.parent1_email || p.parent2_email || "Sin email registrado";
      return `${fullName},${pin},${targetEmail}`;
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvHeader + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PINs_Plantilla_${teamId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV de PINs descargado correctamente");
  };

  // Enviar por Email a cada uno su PIN
  const handleSendEmails = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await sendTeamPinsByEmailAction(teamId);
      setResult(res);

      if (res.success) {
        if (res.sentCount > 0) {
          toast.success(`¡Se enviaron ${res.sentCount} PINs por correo!`);
        } else {
          toast("No se enviaron correos (comprueba la lista de destinatarios).", { icon: "ℹ️" });
        }
        if (onPinsUpdated) {
          onPinsUpdated();
        }
      } else {
        toast.error(res.error || "No se pudieron enviar los correos.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con el servidor.");
    } finally {
      setSending(false);
    }
  };

  const handleCopy = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(pin);
    setTimeout(() => setCopiedPin(null), 2000);
    toast.success("PIN copiado al portapapeles");
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión y Distribución de PINs de Registro"
      description="Descarga el listado completo o envía a cada jugador/familia su código individual por correo electrónico."
      className="max-w-xl p-0 overflow-hidden"
    >
      <div className="p-6 space-y-5">
        {/* Banner de Resumen */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black">
              {withEmailCount}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Con Email asignado</div>
              <div className="text-[11px] text-slate-500">Listos para recibir su PIN</div>
            </div>
          </div>

          <div className={`border rounded-xl p-3.5 flex items-center gap-3 ${withoutEmailCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${withoutEmailCount > 0 ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-700'}`}>
              {withoutEmailCount}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Sin Email registrado</div>
              <div className="text-[11px] text-slate-500">Requieren entrega manual</div>
            </div>
          </div>
        </div>

        {/* Explicación de funcionamiento */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            Cada jugador recibirá <strong>únicamente su PIN personal</strong> con instrucciones paso a paso para el alta o vinculación familiar. Si algún jugador no dispone de PIN, el sistema lo creará automáticamente.
          </div>
        </div>

        {/* Acciones Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Opción 1: Descargar CSV */}
          <button
            onClick={handleDownloadCsv}
            className="flex items-center justify-center gap-2 p-3.5 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs transition-all shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Descargar Lista en CSV</span>
          </button>

          {/* Opción 2: Enviar por Email */}
          <Button
            onClick={handleSendEmails}
            disabled={sending || squadPlayers.length === 0}
            className="flex items-center justify-center gap-2 p-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-xs shadow-md transition-all h-auto py-3.5"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando correos...</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>Enviar PINs por Email</span>
              </>
            )}
          </Button>
        </div>

        {/* Resultado del Envío */}
        {result && (
          <div className="space-y-4 pt-2 animate-in fade-in duration-200">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-emerald-950">
                  ¡Proceso de envío completado!
                </p>
                <p className="mt-1 text-emerald-800 leading-relaxed">
                  Se enviaron <strong>{result.sentCount}</strong> correos correctamente a las familias y jugadores.
                </p>
              </div>
            </div>

            {/* Listado de Jugadores Sin Email para gestión manual */}
            {result.missingEmailPlayers && result.missingEmailPlayers.length > 0 && (
              <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Jugadores sin email registrado ({result.missingEmailPlayers.length}):</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Estos jugadores no tienen correo en el sistema. Puedes copiar su PIN directamente para facilitárselo por WhatsApp o en mano:
                </p>

                <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                  {result.missingEmailPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-slate-800 truncate pr-2">
                        {player.name}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {player.pin}
                        </span>
                        <button
                          onClick={() => handleCopy(player.pin)}
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
                          title="Copiar PIN"
                        >
                          {copiedPin === player.pin ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertCircle className="w-4 h-4" />
                  <span>Detalle de incidencias:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer del Modal */}
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
