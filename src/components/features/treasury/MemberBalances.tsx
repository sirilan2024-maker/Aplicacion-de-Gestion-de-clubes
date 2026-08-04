"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getMemberBalancesAction,
  getMemberStatementAction,
  createFeeAction,
  addPartialPaymentAction,
  sendPaymentNotificationAction,
  sendMemberBalanceNotificationAction,
  downloadFeeReceiptAction,
  updateFeeAmountAction
} from "@/app/actions/treasury-actions";
import {
  Users, Search, Filter, TrendingUp, TrendingDown, Scale, CheckCircle2,
  AlertTriangle, Coins, FileText, ChevronRight, X, Plus, Download, Bell,
  Calendar, CreditCard, ShieldCheck, Loader2, MessageSquare, ExternalLink, Pencil
} from "lucide-react";
import toast from "react-hot-toast";

interface MemberBalance {
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  total_charged_cents: number;
  total_paid_cents: number;
  balance_cents: number;
  status: "al_dia" | "con_deuda" | "saldo_favor";
  fees_count: number;
  pending_fees_count: number;
}

interface Summary {
  totalCharged: number;
  totalPaid: number;
  totalPending: number;
  membersAlDia: number;
  membersConDeuda: number;
  totalMembers: number;
}

export default function MemberBalances() {
  const [members, setMembers] = useState<MemberBalance[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalCharged: 0,
    totalPaid: 0,
    totalPending: 0,
    membersAlDia: 0,
    membersConDeuda: 0,
    totalMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"todos" | "con_deuda" | "al_dia">("todos");
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

  // Statement Drawer / Modal
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [statementData, setStatementData] = useState<any | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Notification Modal (Campanita vs WhatsApp)
  const [notifPlayer, setNotifPlayer] = useState<{ id: string; name: string } | null>(null);
  const [sendingNotif, setSendingNotif] = useState(false);

  // Actions inside drawer
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<string | null>(null);

  // Form fields
  const [chargeConcept, setChargeConcept] = useState("");
  const [chargeAmount, setChargeAmount] = useState<number>(0);

  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Contado");

  // Edit fee state
  const [editingFee, setEditingFee] = useState<{ id: string; concept: string; amount: string; reason: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSaveFeeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFee) return;
    const parsed = parseFloat(editingFee.amount.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Por favor introduce un importe válido.");
      return;
    }

    setSavingEdit(true);
    try {
      await updateFeeAmountAction(editingFee.id, Math.round(parsed * 100), editingFee.reason.trim() || undefined);
      toast.success("Cuota y saldo actualizados correctamente");
      setEditingFee(null);
      if (selectedPlayerId) {
        fetchStatement(selectedPlayerId);
      }
      fetchBalances();
    } catch (err: any) {
      toast.error("Error al modificar cuota: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMemberBalancesAction();
      if (res.success) {
        setMembers(res.members);
        setSummary(res.summary);

        const teamMap = new Map<string, string>();
        res.members.forEach((m) => {
          if (m.team_id !== "none" && m.team_name) {
            teamMap.set(m.team_id, m.team_name);
          }
        });
        setTeams(Array.from(teamMap.entries()).map(([id, name]) => ({ id, name })));
      }
    } catch (err: any) {
      toast.error("Error al cargar saldos de socios: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const fetchStatement = async (playerId: string) => {
    setSelectedPlayerId(playerId);
    setLoadingStatement(true);
    try {
      const res = await getMemberStatementAction(playerId);
      if (res.success) {
        setStatementData(res);
      }
    } catch (err: any) {
      toast.error("Error al cargar extracto del socio: " + err.message);
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || chargeAmount <= 0 || !chargeConcept.trim()) return;

    try {
      const toastId = toast.loading("Emitiendo cargo...");
      await createFeeAction({
        player_id: selectedPlayerId,
        concept: chargeConcept.trim(),
        amount_cents: Math.round(chargeAmount * 100),
        currency: "eur",
        estado: "pendiente",
        tipo_cargo: "one_time",
      });
      toast.success("Cargo emitido correctamente", { id: toastId });
      setShowAddChargeModal(false);
      setChargeConcept("");
      setChargeAmount(0);
      fetchStatement(selectedPlayerId);
      fetchBalances();
    } catch (err: any) {
      toast.error("Error al emitir cargo: " + err.message);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeForPayment || paymentAmount <= 0) return;

    try {
      const toastId = toast.loading("Registrando cobro...");
      await addPartialPaymentAction(
        selectedFeeForPayment,
        Math.round(paymentAmount * 100),
        paymentMethod
      );
      toast.success("Cobro registrado correctamente", { id: toastId });
      setShowAddPaymentModal(false);
      setSelectedFeeForPayment(null);
      setPaymentAmount(0);
      if (selectedPlayerId) fetchStatement(selectedPlayerId);
      fetchBalances();
    } catch (err: any) {
      toast.error("Error al registrar cobro: " + err.message);
    }
  };

  const handleSendNotification = async (method: "internal" | "whatsapp") => {
    if (!notifPlayer) return;
    setSendingNotif(true);

    try {
      const res = await sendMemberBalanceNotificationAction(notifPlayer.id, method);
      if (res.success) {
        if (method === "whatsapp" && res.url) {
          window.open(res.url, "_blank");
        } else {
          toast.success(res.message || "Notificación enviada a la campanita de la familia");
        }
      }
      setNotifPlayer(null);
    } catch (err: any) {
      toast.error("Error al notificar: " + err.message);
    } finally {
      setSendingNotif(false);
    }
  };

  const handleDownloadReceipt = async (feeId: string) => {
    const toastId = toast.loading("Generando recibo PDF...");
    try {
      const res = await downloadFeeReceiptAction(feeId);
      toast.dismiss(toastId);
      if (res?.url) {
        window.open(res.url, "_blank");
      }
    } catch (err: any) {
      toast.error("Error al descargar recibo: " + err.message, { id: toastId });
    }
  };

  // Filter members
  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.player_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = selectedTeam === "all" || m.team_id === selectedTeam;
    const matchesStatus =
      statusFilter === "todos" ||
      (statusFilter === "con_deuda" && m.status === "con_deuda") ||
      (statusFilter === "al_dia" && m.status !== "con_deuda");
    return matchesSearch && matchesTeam && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm text-gray-500 font-medium">Cargando estado de cuenta corriente...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPIs Summary Header (Responsive Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Cargado */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Cargado</p>
            <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-slate-900 mt-2">{summary.totalCharged.toFixed(2)} €</p>
          <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">Suma global de cargos</p>
        </div>

        {/* Total Cobrado */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] md:text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Cobrado</p>
            <div className="p-1.5 md:p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-emerald-600 mt-2">{summary.totalPaid.toFixed(2)} €</p>
          <p className="text-[10px] md:text-xs text-emerald-600/70 mt-0.5">Abonos recibidos</p>
        </div>

        {/* Deuda Pendiente */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-amber-200 bg-gradient-to-br from-white to-amber-50/40 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] md:text-xs font-bold text-amber-700 uppercase tracking-wider">Deuda Pendiente</p>
            <div className="p-1.5 md:p-2 bg-amber-100 text-amber-700 rounded-xl">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-amber-700 mt-2">{summary.totalPending.toFixed(2)} €</p>
          <p className="text-[10px] md:text-xs text-amber-600 mt-0.5">Pendiente de cobro</p>
        </div>

        {/* Estado de Socios */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Socios</p>
            <div className="p-1.5 md:p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-xl md:text-2xl font-black text-red-600">{summary.membersConDeuda}</span>
            <span className="text-[10px] md:text-xs text-slate-500">deuda /</span>
            <span className="text-xl md:text-2xl font-black text-emerald-600">{summary.membersAlDia}</span>
            <span className="text-[10px] md:text-xs text-slate-500">al día</span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">Total: {summary.totalMembers} socios</p>
        </div>
      </div>

      {/* Main Table & Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Header */}
        <div className="p-3 md:p-4 bg-slate-50/60 border-b border-slate-200 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar socio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Team filter */}
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">🏟️ Todos los equipos</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  ⚽ {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter buttons (Horizontal Scrollable on Mobile) */}
          <div className="flex overflow-x-auto pb-1 md:pb-0 scrollbar-none gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter("todos")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                statusFilter === "todos"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({members.length})
            </button>
            <button
              onClick={() => setStatusFilter("con_deuda")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                statusFilter === "con_deuda"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Con Deuda ({summary.membersConDeuda})
            </button>
            <button
              onClick={() => setStatusFilter("al_dia")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                statusFilter === "al_dia"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Al Día ({summary.membersAlDia})
            </button>
          </div>
        </div>

        {/* ===== MOBILE CARDS VIEW (block md:hidden) ===== */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No se encontraron socios con los filtros aplicados.
            </div>
          ) : (
            filteredMembers.map((m) => {
              const charged = (m.total_charged_cents / 100).toFixed(2);
              const paid = (m.total_paid_cents / 100).toFixed(2);
              const balance = (m.balance_cents / 100).toFixed(2);

              return (
                <div
                  key={m.player_id}
                  onClick={() => fetchStatement(m.player_id)}
                  className="p-4 hover:bg-indigo-50/30 transition-colors active:bg-indigo-50/50 space-y-2.5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{m.player_name}</p>
                      <span className="inline-block mt-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {m.team_name}
                      </span>
                    </div>

                    <div>
                      {m.status === "con_deuda" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          <AlertTriangle className="w-3 h-3" />
                          Deuda ({m.pending_fees_count})
                        </span>
                      ) : m.status === "saldo_favor" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Favor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Al día
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Cargado</span>
                      <span className="font-bold text-slate-800">{charged} €</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Pagado</span>
                      <span className="font-bold text-emerald-600">{paid} €</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Saldo</span>
                      <span
                        className={`font-black ${
                          m.balance_cents > 0
                            ? "text-red-600"
                            : m.balance_cents < 0
                            ? "text-blue-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {balance} €
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {m.status === "con_deuda" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotifPlayer({ id: m.player_id, name: m.player_name });
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg active:bg-amber-100"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Notificar Deuda
                      </button>
                    ) : (
                      <span />
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchStatement(m.player_id);
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg active:bg-indigo-100 ml-auto"
                    >
                      Ver Extracto
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ===== DESKTOP TABLE VIEW (hidden md:table) ===== */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Socio / Jugador</th>
                <th className="py-3 px-4">Equipo</th>
                <th className="py-3 px-4 text-right">Total Cargado</th>
                <th className="py-3 px-4 text-right">Total Pagado</th>
                <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron socios con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const charged = (m.total_charged_cents / 100).toFixed(2);
                  const paid = (m.total_paid_cents / 100).toFixed(2);
                  const balance = (m.balance_cents / 100).toFixed(2);

                  return (
                    <tr
                      key={m.player_id}
                      onClick={() => fetchStatement(m.player_id)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-2">
                        {m.player_name}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">{m.team_name}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">{charged} €</td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600">{paid} €</td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span
                          className={
                            m.balance_cents > 0
                              ? "text-red-600"
                              : m.balance_cents < 0
                              ? "text-blue-600"
                              : "text-emerald-600"
                          }
                        >
                          {balance} €
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {m.status === "con_deuda" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            Deuda ({m.pending_fees_count})
                          </span>
                        ) : m.status === "saldo_favor" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Favor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Al día
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {m.status === "con_deuda" && (
                            <button
                              onClick={() => setNotifPlayer({ id: m.player_id, name: m.player_name })}
                              title="Enviar notificación o WhatsApp"
                              className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => fetchStatement(m.player_id)}
                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Ver extracto
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== DRAWER / EXTRACTO CONTABLE DEL SOCIO ====== */}
      {selectedPlayerId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full md:max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header Drawer */}
            <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base md:text-lg font-bold">
                    {loadingStatement ? "Cargando extracto..." : statementData?.player?.name}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {statementData?.player?.team_name} · Cuenta Corriente Individual
                </p>
              </div>
              <button
                onClick={() => setSelectedPlayerId(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingStatement ? (
              <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : statementData ? (
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-slate-50">
                {/* Summary Card */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">Total Cargado</p>
                    <p className="text-base md:text-lg font-bold text-slate-900">{statementData.summary.total_charged.toFixed(2)} €</p>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">Total Abonado</p>
                    <p className="text-base md:text-lg font-bold text-emerald-600">{statementData.summary.total_paid.toFixed(2)} €</p>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">Saldo Actual</p>
                    <p
                      className={`text-base md:text-lg font-black ${
                        statementData.summary.balance > 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {statementData.summary.balance.toFixed(2)} €
                    </p>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowAddChargeModal(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Emitir Nuevo Cargo
                  </button>
                  {statementData.summary.balance > 0 && (
                    <button
                      onClick={() => setNotifPlayer({ id: statementData.player.id, name: statementData.player.name })}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      <Bell className="w-4 h-4" />
                      Enviar Notificación
                    </button>
                  )}
                </div>

                {/* Timeline / List of Fees */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Historial de Cuotas y Movimientos ({statementData.fees.length})
                  </h3>

                  {statementData.fees.length === 0 ? (
                    <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-sm">
                      Este socio aún no tiene cuotas ni cargos registrados.
                    </div>
                  ) : (
                    statementData.fees.map((fee: any) => (
                      <div
                        key={fee.id}
                        className={`bg-white p-4 rounded-2xl border shadow-sm space-y-3 ${
                          fee.estado === "pagado"
                            ? "border-emerald-200 bg-emerald-50/10"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{fee.concept}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(fee.creado_en).toLocaleDateString("es-ES")} · {fee.payment_method || "Método no especificado"}
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <p className="font-black text-slate-900 text-base">
                                {(fee.amount_cents / 100).toFixed(2)} €
                              </p>
                              <button
                                onClick={() =>
                                  setEditingFee({
                                    id: fee.id,
                                    concept: fee.concept,
                                    amount: (fee.amount_cents / 100).toString(),
                                    reason: "",
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                title="Modificar importe de cuota (Ajuste / Error inscripción)"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {fee.estado === "pagado" ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                ✅ Pagado
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                                ⏳ Pendiente ({(fee.pending_cents / 100).toFixed(2)} €)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Partial Payments list */}
                        {fee.payments.length > 0 && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Abonos parciales recibidos:</p>
                            {fee.payments.map((p: any) => (
                              <div key={p.id} className="flex justify-between items-center text-xs text-slate-600">
                                <span>
                                  • {new Date(p.created_at).toLocaleDateString("es-ES")} ({p.payment_method})
                                </span>
                                <span className="font-bold text-emerald-700">+{(p.amount_cents / 100).toFixed(2)} €</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action buttons per fee */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          {fee.estado !== "pagado" && (
                            <button
                              onClick={() => {
                                setSelectedFeeForPayment(fee.id);
                                setPaymentAmount(fee.pending_cents / 100);
                                setShowAddPaymentModal(true);
                              }}
                              className="flex items-center gap-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              Abonar
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadReceipt(fee.id)}
                            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Recibo PDF
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ====== MODAL NOTIFICACIÓN: CAMPANITA O WHATSAPP ====== */}
      {notifPlayer && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Notificar Saldo Pendiente</h3>
              <p className="text-xs text-slate-500">
                Selecciona cómo deseas avisar a la familia de <strong>{notifPlayer.name}</strong>:
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleSendNotification("internal")}
                disabled={sendingNotif}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                {sendingNotif ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                🔔 Notificación Interna (Campanita App)
              </button>

              <button
                onClick={() => handleSendNotification("whatsapp")}
                disabled={sendingNotif}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
              >
                <MessageSquare className="w-4 h-4" />
                💬 Enviar mensaje por WhatsApp
              </button>
            </div>

            <button
              onClick={() => setNotifPlayer(null)}
              className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ====== MODAL: EMITIR CARGO INDIVIDUAL ====== */}
      {showAddChargeModal && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900">Emitir Cargo Individual</h3>
            <form onSubmit={handleCreateCharge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Concepto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cuota Extra Torneo de Primavera"
                  value={chargeConcept}
                  onChange={(e) => setChargeConcept(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Importe (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(parseFloat(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddChargeModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                >
                  Confirmar Cargo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== MODAL: REGISTRAR ABONO / COBRO ====== */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900">Registrar Entrega a Cuenta / Cobro</h3>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Importe Abonado (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Método de Cobro</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="Contado">Contado / Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Stripe">Stripe Online</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700"
                >
                  Registrar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== MODAL MODIFICAR IMPORTE DE CUOTA ====== */}
      {editingFee && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Modificar Cargo de Cuota</h3>
              </div>
              <button
                onClick={() => setEditingFee(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFeeEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Concepto</label>
                <p className="p-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium">{editingFee.concept}</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nuevo Importe Cargado (€) *</label>
                <input
                  type="text"
                  required
                  value={editingFee.amount}
                  onChange={(e) => setEditingFee({ ...editingFee, amount: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Motivo del Ajuste (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. Error en inscripción, Beca 20%, Descuento hermano..."
                  value={editingFee.reason}
                  onChange={(e) => setEditingFee({ ...editingFee, reason: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingFee(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
