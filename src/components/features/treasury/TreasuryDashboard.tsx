"use client";

import { useState, useEffect } from "react";
import Payments from "@/components/features/treasury/Payments";
import ExpensesList from "@/components/features/treasury/ExpensesList";
import MemberBalances from "@/components/features/treasury/MemberBalances";
import OfficialReceiptsList from "@/components/features/treasury/OfficialReceiptsList";
import { SepaRemittanceModal } from "@/components/features/treasury/SepaRemittanceModal";
import { ArrowDownRight, ArrowUpRight, Wallet, TrendingUp, TrendingDown, Scale, FileDown, Users, FileCheck2, Landmark } from "lucide-react";
import { getTreasuryBalanceAction, exportAccountingCsvAction } from "@/app/actions/treasury-actions";
import toast from "react-hot-toast";

export default function TreasuryDashboard() {
  const [activeTab, setActiveTab] = useState<"saldos" | "ingresos" | "gastos" | "recibos">("saldos");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [balances, setBalances] = useState({ ingresos: 0, gastos: 0 });
  const [exporting, setExporting] = useState(false);
  const [showSepaModal, setShowSepaModal] = useState(false);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const data = await getTreasuryBalanceAction();
        setBalances(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBalances();
  }, [refreshTrigger]);

  const saldoNeto = balances.ingresos - balances.gastos;
  const saldoPositivo = saldoNeto >= 0;

  const handleExportContabilidad = async () => {
    setExporting(true);
    try {
      const { csv, filename } = await exportAccountingCsvAction();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Contabilidad exportada correctamente");
    } catch {
      toast.error("Error al exportar contabilidad");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600" />
            Contabilidad y Tesorería
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Gestión de ingresos, cuotas y gastos del club</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowSepaModal(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs md:text-sm shadow-sm transition-colors w-full sm:w-auto"
          >
            <Landmark className="w-4 h-4" />
            Generar remesa SEPA
          </button>
          <button
            onClick={handleExportContabilidad}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs md:text-sm shadow-sm transition-colors disabled:opacity-50 w-full sm:w-auto"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? "Generando..." : "Exportar CSV"}
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
        {/* Ingresos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 sm:p-4 md:p-5">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Total Ingresos</p>
            <div className="p-1.5 md:p-2 bg-green-50 rounded-xl text-green-600">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-green-600">{balances.ingresos.toFixed(2)} €</p>
          <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">Cuotas cobradas (pagado)</p>
        </div>

        {/* Gastos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 sm:p-4 md:p-5">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Total Gastos</p>
            <div className="p-1.5 md:p-2 bg-red-50 rounded-xl text-red-600">
              <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-red-600">{balances.gastos.toFixed(2)} €</p>
          <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">Facturas y gastos operativos</p>
        </div>

        {/* Balance Neto */}
        <div className={`rounded-2xl shadow-sm border p-3.5 sm:p-4 md:p-5 ${
          saldoPositivo
            ? "bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200"
            : "bg-gradient-to-br from-red-50 to-rose-100 border-red-200"
        }`}>
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <p className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${saldoPositivo ? "text-emerald-700" : "text-red-700"}`}>
              Balance Neto
            </p>
            <div className={`p-1.5 md:p-2 rounded-xl ${saldoPositivo ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
              <Scale className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl md:text-3xl font-black ${saldoPositivo ? "text-green-600" : "text-red-600"}`}>
            {saldoPositivo ? "+" : ""}{saldoNeto.toFixed(2)} €
          </p>
          <p className={`text-[10px] md:text-xs mt-0.5 ${saldoPositivo ? "text-emerald-600" : "text-red-600"}`}>
            {saldoPositivo ? "✅ Club en positivo" : "⚠️ Déficit en club"}
          </p>
        </div>
      </div>

      {/* Responsive Navigation Buttons - 2x2 on Mobile, Flex on Desktop, NO Horizontal Scroll */}
      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:inline-flex bg-gray-100 p-1 rounded-2xl gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("saldos")}
            className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-center ${
              activeTab === "saldos"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Saldos Socios</span>
          </button>
          <button
            onClick={() => setActiveTab("ingresos")}
            className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-center ${
              activeTab === "ingresos"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ArrowDownRight className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Cuotas e Ingresos</span>
          </button>
          <button
            onClick={() => setActiveTab("gastos")}
            className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-center ${
              activeTab === "gastos"
                ? "bg-white text-red-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ArrowUpRight className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Gastos</span>
          </button>
          <button
            onClick={() => setActiveTab("recibos")}
            className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-center ${
              activeTab === "recibos"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FileCheck2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Recibos SEPA</span>
          </button>
        </div>
      </div>

      {/* Contenido de Pestañas */}
      <div className="w-full">
        {activeTab === "saldos" && (
          <MemberBalances />
        )}

        {activeTab === "ingresos" && (
          <Payments />
        )}

        {activeTab === "gastos" && (
          <ExpensesList refreshBalances={() => setRefreshTrigger(prev => prev + 1)} />
        )}

        {activeTab === "recibos" && (
          <OfficialReceiptsList />
        )}
      </div>

      <SepaRemittanceModal
        isOpen={showSepaModal}
        onClose={() => setShowSepaModal(false)}
      />

    </div>
  );
}
