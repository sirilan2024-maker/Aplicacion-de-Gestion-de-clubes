"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getOfficialReceiptsAction,
  exportOfficialReceiptsCsvAction,
  downloadOfficialReceiptPdfAction,
  createManualReceiptAction
} from "@/app/actions/treasury-actions";
import {
  FileCheck2, Search, Filter, Download, FileSpreadsheet, Loader2,
  CheckCircle2, XCircle, Calendar, Hash, CreditCard, PlusCircle, MessageSquare, X
} from "lucide-react";
import toast from "react-hot-toast";

interface OfficialReceipt {
  id: string;
  receipt_number: string;
  sequence_number: number;
  created_at: string;
  player_name: string;
  concept: string;
  amount_cents: number;
  payment_method: string;
  status: "emitido" | "anulado";
  pdf_path?: string;
  fee_id?: string;
}

export default function OfficialReceiptsList() {
  const [receipts, setReceipts] = useState<OfficialReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "emitido" | "anulado">("todos");

  // Modal Recibo Manual / Eventual State
  const [showManualModal, setShowManualModal] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [payerDni, setPayerDni] = useState("");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Contado");
  const [phone, setPhone] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);

  // Success modal result
  const [manualResult, setManualResult] = useState<{
    receiptNumber: string;
    url?: string;
    whatsappUrl?: string;
    fileName?: string;
  } | null>(null);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOfficialReceiptsAction();
      setReceipts((data as any) || []);
    } catch (err: any) {
      toast.error("Error al cargar registro de recibos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const { csv, filename } = await exportOfficialReceiptsCsvAction();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Registro de recibos exportado correctamente");
    } catch (err: any) {
      toast.error("Error al exportar: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPdf = async (receiptId: string) => {
    const toastId = toast.loading("Obteniendo recibo oficial PDF...");
    try {
      const res = await downloadOfficialReceiptPdfAction(receiptId);
      toast.dismiss(toastId);
      if (res?.url) {
        window.open(res.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al abrir el PDF", { id: toastId });
    }
  };

  const handleCreateManualReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!payerName.trim() || !concept.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Por favor completa el Nombre, Concepto e Importe válido");
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await createManualReceiptAction({
        payerName: payerName.trim(),
        payerDni: payerDni.trim() || undefined,
        concept: concept.trim(),
        amountCents: Math.round(parsedAmount * 100),
        paymentMethod,
        phone: phone.trim() || undefined,
      });

      if (res.success) {
        toast.success(`Recibo N.º ${res.receiptNumber} generado exitosamente`);
        setManualResult({
          receiptNumber: res.receiptNumber,
          url: res.url,
          whatsappUrl: res.whatsappUrl || undefined,
          fileName: res.fileName || undefined,
        });
        setShowManualModal(false);
        // Reset form
        setPayerName("");
        setPayerDni("");
        setConcept("");
        setAmount("");
        setPhone("");
        fetchReceipts();
      }
    } catch (err: any) {
      toast.error("Error al crear recibo manual: " + err.message);
    } finally {
      setSubmittingManual(false);
    }
  };

  // Filter receipts
  const filteredReceipts = receipts.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      r.receipt_number.toLowerCase().includes(term) ||
      r.player_name.toLowerCase().includes(term) ||
      r.concept.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "todos" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = receipts
    .filter((r) => r.status === "emitido")
    .reduce((sum, r) => sum + r.amount_cents, 0) / 100;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm text-gray-500 font-medium">Cargando registro auditado de recibos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 text-white p-4 md:p-5 rounded-2xl shadow-md border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-bold">Registro de Recibos Emitidos</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Auditoría contable, serie numerada consecutiva y recibos manuales para no registrados
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all text-center"
          >
            <PlusCircle className="w-4 h-4 flex-shrink-0" />
            <span>Recibo Eventual</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 text-center"
          >
            <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
            <span>{exporting ? "Exportando..." : "Exportar CSV"}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Nº recibo, socio o concepto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 md:bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-3 w-full md:w-auto bg-slate-200/70 p-1 rounded-xl gap-1">
          <button
            onClick={() => setStatusFilter("todos")}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all text-center truncate ${
              statusFilter === "todos" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            Todos ({receipts.length})
          </button>
          <button
            onClick={() => setStatusFilter("emitido")}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all text-center truncate ${
              statusFilter === "emitido" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600"
            }`}
          >
            Emitidos ({receipts.filter((r) => r.status === "emitido").length})
          </button>
          <button
            onClick={() => setStatusFilter("anulado")}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all text-center truncate ${
              statusFilter === "anulado" ? "bg-red-600 text-white shadow-sm" : "text-slate-600"
            }`}
          >
            Anulados ({receipts.filter((r) => r.status === "anulado").length})
          </button>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (block md:hidden) */}
      <div className="block md:hidden space-y-3">
        {filteredReceipts.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-sm">
            No se encontraron recibos oficiales con los filtros seleccionados.
          </div>
        ) : (
          filteredReceipts.map((r) => (
            <div
              key={r.id}
              className={`bg-white p-4 rounded-2xl border shadow-sm space-y-2.5 ${
                r.status === "anulado" ? "border-red-200 bg-red-50/20" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md inline-block">
                    {r.receipt_number}
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-1">{r.player_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-base">{(r.amount_cents / 100).toFixed(2)} €</p>
                  {r.status === "anulado" ? (
                    <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full inline-block">
                      ❌ ANULADO
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-block">
                      ✅ Emitido
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 text-slate-600">
                <p>
                  <strong className="text-slate-800">Concepto:</strong> {r.concept}
                </p>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>📅 {new Date(r.created_at).toLocaleDateString("es-ES")}</span>
                  <span>💳 {r.payment_method}</span>
                </div>
              </div>

              {r.status === "emitido" && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleDownloadPdf(r.id)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg active:bg-indigo-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar PDF
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">N.º Recibo</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Pagador / Socio</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4 text-right">Importe</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No se encontraron recibos oficiales con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700 text-xs">
                      {r.receipt_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {new Date(r.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.player_name}</td>
                    <td className="py-3 px-4 text-slate-700 text-xs">{r.concept}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{r.payment_method}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {(r.amount_cents / 100).toFixed(2)} €
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.status === "anulado" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="w-3 h-3" />
                          ANULADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Emitido
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === "emitido" && (
                        <button
                          onClick={() => handleDownloadPdf(r.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== MODAL EMITIR RECIBO MANUAL / EVENTUAL ====== */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Emitir Recibo Eventual / Manual</h3>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualReceipt} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre del Pagador / Socio Eventual *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. María López / Juan Gómez"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">DNI / NIE (Opcional)</label>
                  <input
                    type="text"
                    placeholder="12345678Z"
                    value={payerDni}
                    onChange={(e) => setPayerDni(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono (para WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="612345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Concepto *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Material deportivo, Ropa entrenamiento, Torneo Verano..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Importe (€) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. 45.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white font-medium"
                  >
                    <option value="Contado">Contado / Efectivo</option>
                    <option value="Bizum">Bizum</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta / TPV</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generar Recibo Oficial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== MODAL RESULTADO DE RECIBO MANUAL ====== */}
      {manualResult && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-lg">¡Recibo Generado!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Recibo N.º <strong className="font-mono text-indigo-700">{manualResult.receiptNumber}</strong> emitido correctamente.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {manualResult.url && (
                <a
                  href={manualResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Descargar Recibo PDF
                </a>
              )}

              {manualResult.whatsappUrl && (
                <a
                  href={manualResult.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  Enviar por WhatsApp
                </a>
              )}

              <button
                onClick={() => setManualResult(null)}
                className="w-full py-2 text-slate-500 font-bold text-xs hover:bg-slate-100 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
