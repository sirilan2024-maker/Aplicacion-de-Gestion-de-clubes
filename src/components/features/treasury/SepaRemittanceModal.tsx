"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X, Landmark, CheckCircle2, AlertCircle, Download,
  Loader2, FileText, AlertTriangle, ShieldCheck
} from "lucide-react";
import {
  getPendingDirectDebitFeesAction,
  generateSepaRemittanceAction,
  PendingSepaFeeItem,
  ClubSepaStatus,
} from "@/app/actions/treasury-actions";
import toast from "react-hot-toast";

interface SepaRemittanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SepaRemittanceModal({ isOpen, onClose }: SepaRemittanceModalProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [clubSepa, setClubSepa] = useState<ClubSepaStatus | null>(null);
  const [fees, setFees] = useState<PendingSepaFeeItem[]>([]);
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);
  const [collectionDate, setCollectionDate] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPendingDirectDebitFeesAction();
      if (res.success && res.fees && res.clubSepa) {
        setFees(res.fees);
        setClubSepa(res.clubSepa);
        // Pre-seleccionar todas las cuotas válidas
        setSelectedFeeIds(res.fees.filter(f => f.isValid).map(f => f.id));
      } else {
        toast.error(res.error || "Error al cargar cuotas domiciliadas");
      }
    } catch {
      toast.error("Error de conexión al cargar datos SEPA");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Fecha de cobro sugerida: +2 días hábiles
      const d = new Date();
      d.setDate(d.getDate() + 2);
      setCollectionDate(d.toISOString().slice(0, 10));
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const validFees = fees.filter(f => f.isValid);
  const invalidFees = fees.filter(f => !f.isValid);

  const selectedValidFees = validFees.filter(f => selectedFeeIds.includes(f.id));
  const totalAmountSelected = selectedValidFees.reduce((acc, f) => acc + f.amountCents, 0) / 100;

  const canGenerate =
    Boolean(clubSepa?.isValid) &&
    selectedValidFees.length > 0 &&
    !generating;

  const handleToggleSelectAll = () => {
    if (selectedFeeIds.length === validFees.length) {
      setSelectedFeeIds([]);
    } else {
      setSelectedFeeIds(validFees.map(f => f.id));
    }
  };

  const handleToggleFee = (feeId: string) => {
    setSelectedFeeIds(prev =>
      prev.includes(feeId) ? prev.filter(id => id !== feeId) : [...prev, feeId]
    );
  };

  const handleGenerateAndDownload = async () => {
    if (!canGenerate) return;
    setGenerating(true);

    try {
      const res = await generateSepaRemittanceAction({
        feeIds: selectedValidFees.map(f => f.id),
        collectionDate,
      });

      if (res.success && res.xml && res.filename) {
        // Descargar archivo XML en el navegador
        const blob = new Blob([res.xml], { type: "application/xml;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        toast.success(
          `Remesa generada con éxito: ${res.txCount} recibos por ${(res.totalAmount || 0).toFixed(2)} €`
        );
        onClose();
      } else {
        toast.error(res.error || "No se pudo generar la remesa SEPA");
      }
    } catch {
      toast.error("Error al procesar la remesa SEPA");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Generar Remesa SEPA XML
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ISO 20022 · pain.008
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Adeudos directos SEPA (CORE) para cuotas domiciliadas pendientes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 text-sm">

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Buscando cuotas domiciliadas y validando datos SEPA...</p>
            </div>
          ) : (
            <>
              {/* Estado de Configuración Bancaria del Club (Acreedor) */}
              <div className={`p-4 rounded-xl border ${
                clubSepa?.isValid
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-amber-50 border-amber-200"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {clubSepa?.isValid ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                      <span className="font-bold text-slate-900">
                        {clubSepa?.isValid
                          ? "Datos del Club (Acreedor) válidos"
                          : "Configuración SEPA del Club Incompleta"}
                      </span>
                    </div>

                    {clubSepa?.isValid ? (
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 pt-1 font-mono">
                        <div>
                          <span className="font-sans text-slate-400">Creditor ID:</span>{" "}
                          <strong className="text-slate-800">{clubSepa.creditorId}</strong>
                        </div>
                        <div>
                          <span className="font-sans text-slate-400">IBAN Club:</span>{" "}
                          <strong className="text-slate-800">
                            {clubSepa.creditorIban
                              ? `${clubSepa.creditorIban.slice(0, 4)} **** **** **** **${clubSepa.creditorIban.slice(-4)}`
                              : "—"}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-800 pt-1 space-y-0.5">
                        {clubSepa?.errors.map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                        <p className="pt-1 font-medium">
                          Configura el IBAN y Creditor ID en <strong>Admin &gt; Configuración del Club</strong> antes de generar remesas.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Parámetros de la Remesa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Fecha de Cobro Requerida
                  </label>
                  <input
                    type="date"
                    value={collectionDate}
                    onChange={e => setCollectionDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-600 mb-1">
                    Recibos Seleccionados
                  </span>
                  <div className="text-sm font-bold text-slate-900 py-1">
                    {selectedValidFees.length} de {validFees.length} cuotas válidas
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-600 mb-1">
                    Importe Total Remesa
                  </span>
                  <div className="text-base font-black text-emerald-700 py-0.5">
                    {totalAmountSelected.toFixed(2)} €
                  </div>
                </div>
              </div>

              {/* Resumen de Cuotas Domiciliadas Encontradas */}
              {fees.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-700">No hay cuotas domiciliadas pendientes</p>
                  <p className="text-xs text-slate-400">
                    Solo se incluyen cuotas en estado pendiente con método de pago domiciliación.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      Cuotas Domiciliadas ({fees.length})
                    </h4>
                    {validFees.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {selectedFeeIds.length === validFees.length ? "Deseleccionar todas" : "Seleccionar válidas"}
                      </button>
                    )}
                  </div>

                  {/* Tabla / Lista de cuotas */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-3 w-10 text-center">Sel.</th>
                          <th className="p-3">Jugador / Pagador</th>
                          <th className="p-3">Concepto</th>
                          <th className="p-3 text-right">Importe</th>
                          <th className="p-3">Datos SEPA (Mandato / IBAN)</th>
                          <th className="p-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fees.map(f => {
                          const isSelected = selectedFeeIds.includes(f.id);
                          return (
                            <tr
                              key={f.id}
                              className={`hover:bg-slate-50 transition-colors ${
                                !f.isValid ? "bg-amber-50/40 text-slate-500" : ""
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={!f.isValid}
                                  checked={isSelected}
                                  onChange={() => handleToggleFee(f.id)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{f.playerName}</div>
                                <div className="text-[11px] text-slate-500">
                                  {f.isSenior ? "Propio jugador (Senior)" : `Tutor: ${f.debtorName}`}
                                </div>
                              </td>
                              <td className="p-3 font-medium text-slate-700">{f.concept}</td>
                              <td className="p-3 text-right font-bold text-slate-900">
                                {f.amountFormatted} €
                              </td>
                              <td className="p-3 font-mono text-[11px]">
                                {f.debtorIban ? (
                                  <div>
                                    {f.debtorIban.slice(0, 4)} **** **{f.debtorIban.slice(-4)}
                                  </div>
                                ) : (
                                  <span className="text-red-500 font-sans">Sin IBAN</span>
                                )}
                                {f.mandateId && f.mandateDate ? (
                                  <div className="text-[10px] text-slate-400 font-sans">
                                    Mdt: {f.mandateId} ({f.mandateDate})
                                  </div>
                                ) : (
                                  <span className="text-red-500 font-sans text-[10px]">Sin Mandato</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {f.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-3 h-3" /> Válida
                                  </span>
                                ) : (
                                  <span
                                    title={f.validationErrors.join(", ")}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full cursor-help"
                                  >
                                    <AlertCircle className="w-3 h-3" /> Incompleta
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {invalidFees.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        {invalidFees.length} cuota{invalidFees.length !== 1 ? "s" : ""} no se puede{invalidFees.length !== 1 ? "n" : ""} incluir por falta de datos SEPA
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        Comprueba en la ficha de cada jugador que el IBAN, la Referencia y la Fecha de Mandato estén registrados antes de remesar.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            * Operación no destructiva: La generación del XML no modifica el estado de las cuotas.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors w-full sm:w-auto"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleGenerateAndDownload}
              disabled={!canGenerate}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando XML...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generar y Descargar XML SEPA
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
