"use client"

import { useState } from "react"
import { Archive, Trash2, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { archivePlayerAction, deletePlayerAction } from "@/app/actions/player-actions"
import toast from "react-hot-toast"

interface DeletePlayerModalProps {
  isOpen: boolean
  onClose: () => void
  player: {
    id: string
    first_name: string
    last_name?: string
    team_name?: string | null
  } | null
  onSuccess?: (actionType: "archived" | "deleted") => void
}

export function DeletePlayerModal({
  isOpen,
  onClose,
  player,
  onSuccess,
}: DeletePlayerModalProps) {
  const [selectedAction, setSelectedAction] = useState<"archive" | "delete">("archive")
  const [loading, setLoading] = useState(false)

  if (!player) return null

  const fullName = `${player.first_name} ${player.last_name || ""}`.trim()

  const handleConfirm = async () => {
    setLoading(true)
    const toastId = toast.loading(
      selectedAction === "archive" ? "Archivando jugador..." : "Eliminando jugador definitivamente..."
    )

    try {
      if (selectedAction === "archive") {
        const res = await archivePlayerAction(player.id, true)
        if (!res.success) {
          throw new Error(res.error?.message || "Error al archivar jugador")
        }
        toast.success(
          `${fullName} ha pasado al modo archivo. Sus datos históricos están a salvo y ya no aparece en las listas activas.`,
          { id: toastId, duration: 5000 }
        )
        onSuccess?.("archived")
      } else {
        const res = await deletePlayerAction(player.id)
        if (!res.success) {
          throw new Error(res.error?.message || "Error al eliminar jugador")
        }
        toast.success(
          `${fullName} y su historial han sido eliminados definitivamente del club.`,
          { id: toastId, duration: 5000 }
        )
        onSuccess?.("deleted")
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error al procesar la solicitud", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      title={`Gestión de baja: ${fullName}`}
      description={player.team_name ? `Equipo actual: ${player.team_name}` : "Ficha de jugador"}
      className="max-w-xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 font-medium">
          ¿Qué deseas hacer con este jugador? Elige si prefieres archivarlo temporalmente o borrarlo de forma definitiva:
        </p>

        {/* Opciones */}
        <div className="space-y-3">
          {/* Opción 1: Archivar (Recomendado) */}
          <div
            onClick={() => !loading && setSelectedAction("archive")}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              selectedAction === "archive"
                ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/30 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 rounded-lg p-2.5 shrink-0 ${
                  selectedAction === "archive"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Archive className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    Archivar jugador (Modo Archivo)
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    <ShieldCheck className="h-3 w-3" /> Recomendado
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Desaparece inmediatamente de la vista activa: <strong>plantilla del equipo</strong>,{" "}
                  <strong>listas de asistencia</strong> y <strong>convocatorias</strong>.
                </p>
                <p className="mt-1 text-xs text-emerald-800 font-medium">
                  ✓ Todos sus datos (historial, asistencias pasadas, ficha médica) quedan guardados en el{" "}
                  <strong>Archivo</strong> para poder consultarlos o reactivarlo si fuera necesario.
                </p>
              </div>
            </div>
          </div>

          {/* Opción 2: Borrar Definitivamente */}
          <div
            onClick={() => !loading && setSelectedAction("delete")}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              selectedAction === "delete"
                ? "border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/30 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 rounded-lg p-2.5 shrink-0 ${
                  selectedAction === "delete"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    Borrar definitivamente
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                    <AlertTriangle className="h-3 w-3" /> Irreversible
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Borra por completo la ficha del jugador y <strong>todo su historial de la temporada</strong>{" "}
                  (asistencias, convocatorias, valoraciones y registros médicos).
                </p>
                <p className="mt-1 text-xs text-rose-700 font-medium">
                  ⚠️ Esta acción no se puede deshacer y no podrá ser recuperado desde el archivo.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              selectedAction === "archive"
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : selectedAction === "archive" ? (
              <>
                <Archive className="h-4 w-4" />
                Confirmar y Archivar
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Eliminar Definitivamente
              </>
            )}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
