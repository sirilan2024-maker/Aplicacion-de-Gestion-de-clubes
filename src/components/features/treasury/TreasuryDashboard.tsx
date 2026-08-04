"use client";

import { useState, useEffect } from "react";
import Payments from "@/components/features/treasury/Payments";
import ExpensesList from "@/components/features/treasury/ExpensesList";
import MemberBalances from "@/components/features/treasury/MemberBalances";
import { ArrowDownRight, ArrowUpRight, Wallet, TrendingUp, TrendingDown, Scale, FileDown, Users } from "lucide-react";
import { getTreasuryBalanceAction, exportAccountingCsvAction } from "@/app/actions/treasury-actions";
import toast from "react-hot-toast";

export default function TreasuryDashboard() {
  const [activeTab, setActiveTab] = useState<"saldos" | "ingresos" | "gastos">("saldos");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [balances, setBalances] = useState({ ingresos: 0, gastos: 0 });
  const [exporting, setExporting] = useState(false);

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
    } catch (err: any) {
      toast.error("Error al exportar: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-indigo-600" />
            Contabilidad y Tesorería
          </h1>
          <p className="text-gray-500 mt-1">Gestión de ingresos, cuotas y gastos del club</p>
        </div>
        <button
          onClick={handleExportContabilidad}
          disabled={exporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          {exporting ? "Generando..." : "Exportar Contabilidad (CSV)"}
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ingresos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Ingresos</p>
            <div className="p-2 bg-green-50 rounded-xl text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-green-600">{balances.ingresos.toFixed(2)} €</p>
          <p className="text-xs text-gray-400 mt-1">Cuotas cobradas (estado: pagado)</p>
        </div>

        {/* Gastos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Gastos</p>
            <div className="p-2 bg-red-50 rounded-xl text-red-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-red-600">{balances.gastos.toFixed(2)} €</p>
          <p className="text-xs text-gray-400 mt-1">Facturas y gastos operativos</p>
        </div>

        {/* Balance Neto */}
        <div className={`rounded-2xl shadow-sm border p-5 ${
          saldoPositivo
            ? "bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200"
            : "bg-gradient-to-br from-red-50 to-rose-100 border-red-200"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-sm font-semibold uppercase tracking-wider ${saldoPositivo ? "text-emerald-700" : "text-red-700"}`}>
              Balance Neto
            </p>
            <div className={`p-2 rounded-xl ${saldoPositivo ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-3xl font-black ${saldoPositivo ? "text-green-600" : "text-red-600"}`}>
            {saldoPositivo ? "+" : ""}{saldoNeto.toFixed(2)} €
          </p>
          <p className={`text-xs mt-1 ${saldoPositivo ? "text-emerald-600" : "text-red-600"}`}>
            {saldoPositivo ? "✅ El club está en positivo" : "⚠️ El club tiene déficit"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap gap-1">
        <button
          onClick={() => setActiveTab("saldos")}
          className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "saldos"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Saldos de Socios (Cuenta Corriente)
        </button>
        <button
          onClick={() => setActiveTab("ingresos")}
          className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "ingresos"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          Cuotas e Ingresos
        </button>
        <button
          onClick={() => setActiveTab("gastos")}
          className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === "gastos"
              ? "bg-white text-red-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Gastos Operativos
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {activeTab === "saldos" ? (
          <MemberBalances key={`balances-${refreshTrigger}`} />
        ) : activeTab === "ingresos" ? (
          <Payments key={`payments-${refreshTrigger}`} />
        ) : (
          <ExpensesList refreshBalances={() => setRefreshTrigger(prev => prev + 1)} />
        )}
      </div>

    </div>
  );
}

