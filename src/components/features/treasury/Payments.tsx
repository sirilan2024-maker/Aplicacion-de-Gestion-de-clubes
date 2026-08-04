"use client";

import { useEffect, useState } from "react";
import { getClubFeesAction, getClubPlayersAction, createFeeAction, getInscriptionFeesAction, updateFeeStatusAction, getReceiptSignedUrlAction, sendPaymentNotificationAction, generateAndUploadReceiptAction, addPartialPaymentAction, downloadFeeReceiptAction, updateFeeDetailsAction, deleteFeeAction } from "@/app/actions/treasury-actions";
import { CheckCircle, Users, FileText, Calendar, Bell, Download, Coins, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

function EstadoBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    pagado: "bg-green-100 text-green-800",
    pendiente: "bg-yellow-100 text-yellow-800",
    fallido: "bg-red-100 text-red-800",
    cancelado: "bg-red-100 text-red-800",
  };
  const className = colors[estado] ?? "bg-gray-100 text-gray-800";
  const label = estado.charAt(0).toUpperCase() + estado.slice(1);
  return <span className={`px-2 py-1 text-xs font-medium rounded ${className}`}>{label}</span>;
}

function InscriptionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    pending_revision: { label: "⏳ Pendiente Revisión", cls: "bg-amber-100 text-amber-800" },
    pending_payment: { label: "✅ Aprobado", cls: "bg-emerald-100 text-emerald-800" },
    formalized: { label: "💳 Pagado (Stripe)", cls: "bg-blue-100 text-blue-800" },
    rejected: { label: "❌ Rechazado", cls: "bg-red-100 text-red-800" },
    pendiente: { label: "Pendiente", cls: "bg-yellow-100 text-yellow-800" },
    pagado: { label: "Pagado", cls: "bg-green-100 text-green-800" },
    rechazado: { label: "Rechazado", cls: "bg-red-100 text-red-800" },
  }
  const c = config[status] || { label: status, cls: "bg-gray-100 text-gray-800" }
  return <span className={`px-2 py-1 text-xs font-medium rounded ${c.cls}`}>{c.label}</span>
}

export default function Payments() {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>("todos");
  const [activeTab, setActiveTab] = useState<"cuotas" | "inscripciones">("cuotas");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [inscriptionFilter, setInscriptionFilter] = useState("todos");

  // Form state
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [concepto, setConcepto] = useState<string>("");
  const [importe, setImporte] = useState<number>(0);
  const [tipo, setTipo] = useState<string>("one_time");
  const [isPagado, setIsPagado] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Transferencia");
  const [players, setPlayers] = useState<any[]>([]);
  
  // Notification Modal state
  const [notifModalFeeId, setNotifModalFeeId] = useState<string | null>(null);

  // Status Change Modal state
  const [statusModalFeeId, setStatusModalFeeId] = useState<string | null>(null);
  const [statusModalMethod, setStatusModalMethod] = useState("Transferencia");

  // Partial Payment Modal state
  const [partialModalFeeId, setPartialModalFeeId] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [partialMethod, setPartialMethod] = useState("Contado");

  // Generic Income Modal state
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchFees = async () => {
    try {
      const data = await getClubFeesAction();
      setFees(data || []);
    } catch (error) {
      console.error("Error fetching fees:", error);
    }
    setLoading(false);
  };

  const fetchPlayers = async () => {
    try {
      const data = await getClubPlayersAction();
      setPlayers(data || []);
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  useEffect(() => {
    fetchFees();
    fetchPlayers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFeeId) {
        await updateFeeDetailsAction(editingFeeId, {
          concept: concepto,
          amount_cents: Math.round(importe * 100)
        });
        toast.success("Cuota actualizada correctamente");
      } else {
        await createFeeAction({
          player_id: selectedPlayer,
          concept: concepto,
          amount_cents: Math.round(importe * 100),
          currency: "eur",
          estado: isPagado ? "pagado" : "pendiente",
          tipo_cargo: tipo,
          payment_method: isPagado ? paymentMethod : undefined
        });
        toast.success("Cuota creada correctamente");
      }
      fetchFees();
      setShowModal(false);
      setSelectedPlayer("");
      setConcepto("");
      setImporte(0);
      setTipo("one_time");
      setIsPagado(false);
      setPaymentMethod("Transferencia");
      setEditingFeeId(null);
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFeeAction({
        player_id: null,
        concept: concepto,
        amount_cents: Math.round(importe * 100),
        currency: "eur",
        estado: "pagado",
        tipo_cargo: "one_time",
        payment_method: paymentMethod,
        fecha_pago: new Date(incomeDate).toISOString()
      });
      toast.success("Ingreso registrado correctamente");
      fetchFees();
      setShowIncomeModal(false);
      setConcepto("");
      setImporte(0);
      setPaymentMethod("Transferencia");
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleEditFeeClick = (fee: any) => {
    setEditingFeeId(fee.id);
    setSelectedPlayer(fee.player_id || "");
    setConcepto(fee.concept);
    setImporte(fee.amount_cents / 100);
    setTipo("one_time");
    setShowModal(true);
  };

  const handleDeleteFee = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este ingreso/cuota? Esta acción no se puede deshacer.")) return;
    try {
      await deleteFeeAction(id);
      toast.success("Cuota eliminada");
      fetchFees();
    } catch(err: any) {
      toast.error("Error al eliminar: " + err.message);
    }
  };

  const initiateStatusChange = (id: string, currentStatus: string) => {
    if (currentStatus === 'pendiente') {
      setStatusModalFeeId(id);
    } else {
      updateStatus(id, 'pendiente');
    }
  };

  const confirmStatusChange = () => {
    if (statusModalFeeId) {
      updateStatus(statusModalFeeId, 'pagado', statusModalMethod);
      setStatusModalFeeId(null);
    }
  };

  const updateStatus = async (id: string, newStatus: string, method?: string) => {
    try {
      const toastId = toast.loading(`Marcando como ${newStatus}...`);
      await updateFeeStatusAction(id, newStatus, method);
      toast.success(`Marcado como ${newStatus}`, { id: toastId });
      fetchFees();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handlePartialPayment = async () => {
    if (!partialModalFeeId || partialAmount <= 0) return;
    try {
      const toastId = toast.loading("Registrando entrega a cuenta...");
      await addPartialPaymentAction(partialModalFeeId, Math.round(partialAmount * 100), partialMethod);
      toast.success("Entrega registrada y recibo generado", { id: toastId });
      setPartialModalFeeId(null);
      setPartialAmount(0);
      fetchFees();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const viewReceipt = async (id: string) => {
    try {
      const toastId = toast.loading("Generando / Obteniendo recibo...");
      const res = await downloadFeeReceiptAction(id);
      toast.dismiss(toastId);
      if (res?.url) {
        window.open(res.url, "_blank");
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };
  
  const notify = async (method: 'internal' | 'whatsapp') => {
    if (!notifModalFeeId) return;
    try {
      const res = await sendPaymentNotificationAction(notifModalFeeId, method);
      if (res?.success) {
        if (method === 'whatsapp' && res.url) {
          window.open(res.url, "_blank");
        } else {
          toast.success("Notificación interna enviada");
        }
      }
      setNotifModalFeeId(null);
    } catch(err: any) {
      toast.error("Error al notificar: " + err.message);
    }
  };

  if (loading) return <div className="p-6 text-center">Cargando cuotas...</div>;

  const filteredFees = fees.filter(f => filter === "todos" || f.estado === filter);

  const totalFacturado = fees.reduce((sum, f) => sum + (f.amount_cents / 100), 0);
  const totalAbonado = fees.reduce((sum, f) => sum + ((f.amount_paid_cents || 0) / 100), 0);
  const totalPendiente = totalFacturado - totalAbonado;

  return (
    <div className="bg-white rounded-xl shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Users size={20} className="text-indigo-600" />
            Estado de Cuentas Global
          </h2>
          <p className="text-sm text-gray-500">Todas las cuotas de inscripción y cuotas generales unificadas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            setConcepto("");
            setImporte(0);
            setIncomeDate(new Date().toISOString().split("T")[0]);
            setPaymentMethod("Transferencia");
            setShowIncomeModal(true);
          }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-xs font-medium">
            + Añadir Ingreso Extra
          </button>
          <button onClick={() => {
            setEditingFeeId(null);
            setSelectedPlayer("");
            setConcepto("");
            setImporte(0);
            setIsPagado(false);
            setShowModal(true);
          }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium">
            + Nueva Cuota
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Unified Global Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Facturado</p>
            <p className="text-xl font-black text-slate-900">{totalFacturado.toFixed(2)} €</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Cobrado (Abonos)</p>
            <p className="text-xl font-black text-emerald-700">{totalAbonado.toFixed(2)} €</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-center">
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Pendiente de Cobro</p>
            <p className="text-xl font-black text-amber-700">{totalPendiente.toFixed(2)} €</p>
          </div>
        </div>

        <div className="overflow-x-auto w-full rounded-lg border border-gray-200">
          <table className="min-w-[700px] w-full divide-y divide-gray-200 whitespace-nowrap">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jugador</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Método</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Importe</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-2 py-3 text-sm font-medium text-gray-900 min-w-[120px]">{fee.player_name || '–'}</td>
                    <td className="px-2 py-3 text-sm text-gray-900 min-w-[140px]">{fee.concept}</td>
                    <td className="px-2 py-3 text-sm text-gray-500 whitespace-nowrap">{fee.payment_method || '–'}</td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-700">
                      <div className="font-bold">{(fee.amount_cents / 100).toFixed(2)} €</div>
                      {(fee.amount_paid_cents || 0) > 0 && (
                        <div className="text-xs text-green-600 font-medium">
                          Abonado: {(fee.amount_paid_cents / 100).toFixed(2)} €
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm"><EstadoBadge estado={fee.estado} /></td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">{fee.fecha_pago ? new Date(fee.fecha_pago).toLocaleDateString('es-ES') : "–"}</td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm flex gap-1">
                      <button onClick={() => initiateStatusChange(fee.id, fee.estado)}
                        className={`flex items-center justify-center w-8 h-8 rounded ${fee.estado === "pendiente" ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"}`}
                        title={fee.estado === "pendiente" ? "Marcar Pagado (Completo)" : "Marcar Pendiente"}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      {fee.estado === "pendiente" && (
                        <button onClick={() => setPartialModalFeeId(fee.id)} className="flex items-center justify-center w-8 h-8 bg-purple-50 text-purple-700 rounded hover:bg-purple-100" title="Añadir Entrega a Cuenta">
                          <Coins className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => viewReceipt(fee.id)}
                        disabled={fee.estado === "pendiente" && (fee.amount_paid_cents || 0) === 0}
                        className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                          fee.estado === "pendiente" && (fee.amount_paid_cents || 0) === 0
                            ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                            : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        }`}
                        title={
                          fee.estado === "pendiente" && (fee.amount_paid_cents || 0) === 0
                            ? "El recibo oficial solo está disponible tras registrar un cobro (total o parcial)"
                            : "Descargar Recibo Oficial PDF"
                        }
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => setNotifModalFeeId(fee.id)} className="flex items-center justify-center w-8 h-8 bg-gray-50 text-gray-700 rounded hover:bg-gray-200" title="Notificar">
                        <Bell className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEditFeeClick(fee)} className="flex items-center justify-center w-8 h-8 bg-slate-50 text-slate-600 rounded hover:bg-slate-200" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteFee(fee.id)} className="flex items-center justify-center w-8 h-8 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md text-slate-800">
            <h3 className="text-lg font-semibold mb-4 text-slate-900">{editingFeeId ? "Editar Cuota General" : "Nueva Cuota General"}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Jugador</label>
                <select required value={selectedPlayer} disabled={!!editingFeeId} onChange={e => setSelectedPlayer(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-slate-900 disabled:bg-slate-100">
                  <option value="">Selecciona un jugador...</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Concepto</label>
                <input type="text" required value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-slate-900 placeholder-slate-400" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Importe (€)</label>
                <input type="number" min="0" step="0.01" required value={importe} onChange={e => setImporte(parseFloat(e.target.value))} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-slate-900" />
              </div>
              {!editingFeeId && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="isPagado" checked={isPagado} onChange={e => setIsPagado(e.target.checked)} className="rounded text-blue-600" />
                  <label htmlFor="isPagado" className="text-sm font-medium text-slate-700">Marcar como cobrada ahora</label>
                </div>
              )}
              {!editingFeeId && isPagado && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Método de Cobro</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-slate-900">
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Contado / Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded text-slate-700 hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                  {editingFeeId ? "Guardar Cambios" : "Crear Cuota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showIncomeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md text-slate-800">
            <h3 className="text-lg font-semibold mb-4 text-slate-900">Registrar Ingreso Extra</h3>
            <form onSubmit={handleCreateIncome} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Concepto (Ej: Subvención)</label>
                <input type="text" required value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-slate-900 placeholder-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Importe (€)</label>
                  <input type="number" min="0.01" step="0.01" required value={importe} onChange={e => setImporte(parseFloat(e.target.value))} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Fecha del Ingreso</label>
                  <input type="date" required value={incomeDate} onChange={e => setIncomeDate(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-slate-900" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Método de Cobro</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-slate-900">
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Contado / Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowIncomeModal(false)} className="px-4 py-2 border border-gray-300 rounded text-slate-700 hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition">
                  Registrar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notifModalFeeId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-center text-slate-800">Notificar Pago</h3>
            <div className="space-y-3">
              <button onClick={() => notify('internal')} className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100">
                💬 Mensajería Interna
              </button>
              <button onClick={() => notify('whatsapp')} className="w-full py-2 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100">
                📱 WhatsApp
              </button>
              <button onClick={() => setNotifModalFeeId(null)} className="w-full py-2 mt-2 text-gray-500 hover:text-gray-700">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {statusModalFeeId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Confirmar Pago</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Método de pago</label>
                <select value={statusModalMethod} onChange={e => setStatusModalMethod(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-slate-900 bg-white">
                  <option value="Contado">Contado</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Stripe">Stripe</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button onClick={() => setStatusModalFeeId(null)} className="px-4 py-2 bg-gray-200 text-slate-700 rounded hover:bg-gray-300 transition-colors">Cancelar</button>
                <button onClick={confirmStatusChange} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {partialModalFeeId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Añadir Entrega a Cuenta</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Importe Entregado (€)</label>
                <input type="number" min="0.01" step="0.01" value={partialAmount} onChange={e => setPartialAmount(parseFloat(e.target.value))} className="w-full border border-gray-300 rounded px-3 py-2 text-slate-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Método de pago</label>
                <select value={partialMethod} onChange={e => setPartialMethod(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-slate-900 bg-white">
                  <option value="Contado">Contado</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button onClick={() => setPartialModalFeeId(null)} className="px-4 py-2 bg-gray-200 text-slate-700 rounded hover:bg-gray-300 transition-colors">Cancelar</button>
                <button onClick={handlePartialPayment} className="px-4 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 transition-colors">Registrar Entrega</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
