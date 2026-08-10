'use client'

import React, { useState } from 'react';
import { generateFinancialAuditAction } from '@/app/actions/admin-financial-actions';
import { DollarSign, TrendingUp, AlertOctagon, Wallet, X } from 'lucide-react';

export default function AdminFinancialModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    const res = await generateFinancialAuditAction();
    if (res.success) {
      setData(res.data);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-all">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <DollarSign className="text-emerald-600 dark:text-emerald-400" />
            IA Financiera - Tesorería
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8">
          {!data && !loading && (
            <div className="text-center py-12">
              <Wallet size={48} className="mx-auto text-emerald-300 dark:text-emerald-700 mb-4" />
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">Analiza cuotas, pagos, detecta morosidad y proyecta la liquidez del club con Inteligencia Artificial.</p>
              <button 
                onClick={handleGenerate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-6 rounded-full transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50 flex items-center gap-2 mx-auto"
              >
                <TrendingUp size={20} />
                Auditoría Financiera IA
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-zinc-500 dark:text-zinc-400">Calculando proyecciones financieras...</p>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-2">
                    <DollarSign size={16} /> Ingresos Totales
                  </div>
                  <div className="text-3xl font-bold text-zinc-900 dark:text-white">€{data.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-2">
                    <AlertOctagon size={16} className="text-orange-500" /> Pendiente Cobro
                  </div>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">€{data.pendingPayments.toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-800/30">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-orange-800 dark:text-orange-300">Tasa de Morosidad</h3>
                  <span className="text-xl font-bold text-orange-700 dark:text-orange-400">{data.latePaymentRate}%</span>
                </div>
                <div className="w-full bg-orange-200 dark:bg-orange-900/50 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${data.latePaymentRate}%` }}></div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-500" />
                  Proyección de Liquidez
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm">{data.liquidityProjection}</p>
              </div>

              {data.criticalAlerts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">Alertas Críticas</h4>
                  <ul className="space-y-2">
                    {data.criticalAlerts.map((alert: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm border border-red-100 dark:border-red-800/30">
                        <AlertOctagon size={18} className="shrink-0 mt-0.5" />
                        <span>{alert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
