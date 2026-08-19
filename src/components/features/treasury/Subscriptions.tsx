// src/components/features/treasury/Subscriptions.tsx
"use client";

import { useState, useEffect, Fragment } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';
import { Download, CreditCard, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useRouter } from "next/navigation";
import { createCheckoutSession } from "@/actions/stripeActions";
import { getFamilyFeesAction, getPlayerFeesAction, getReceiptSignedUrlAction, downloadPaymentReceiptAction, downloadFeeReceiptAction } from "@/app/actions/treasury-actions";

function EstadoBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    pagado: "bg-green-100 text-green-700 border border-green-200",
    pendiente: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    pdte_verif: "bg-amber-100 text-amber-900 border border-amber-300 font-black animate-pulse",
    pendiente_verificacion: "bg-amber-100 text-amber-900 border border-amber-300 font-black animate-pulse",
    fallido: "bg-red-100 text-red-700 border border-red-200",
    cancelado: "bg-red-100 text-red-700 border border-red-200",
  };
  const className = colors[estado] ?? "bg-gray-100 text-gray-700 border border-gray-200";
  const icons: Record<string, string> = {
    pagado: "✅",
    pendiente: "⏳",
    pdte_verif: "🔍",
    pendiente_verificacion: "🔍",
    fallido: "❌",
    cancelado: "❌",
  };
  const icon = icons[estado] ?? "•";
  const label = (estado === 'pdte_verif' || estado === 'pendiente_verificacion') ? 'Por Verificar' : (estado.charAt(0).toUpperCase() + estado.slice(1));
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${className}`}>
      <span className="text-sm leading-none flex items-center justify-center mb-[1px]">{icon}</span>
      <span className="leading-none">{label}</span>
    </span>
  );
}

export default function Subscriptions({ playerId }: { playerId?: string } = {}) {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const status = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('status') : null;
    if (status === 'success') {
      alert('Pago completado con éxito');
    }
  }, []);

  useEffect(() => {
    const fetchFees = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        let data;
        if (playerId) {
          data = await getPlayerFeesAction(playerId);
        } else {
          data = await getFamilyFeesAction(user.id);
        }
        setFees(data || []);
      } catch (err) {
        console.error("Error cargando cuotas:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFees();
  }, [playerId]);

  const handlePayNow = async (feeId: string) => {
    try {
      const { sessionId } = await createCheckoutSession({
        feeId,
        successUrl: `${window.location.origin}/payments?status=success`,
        cancelUrl: `${window.location.origin}/payments?status=cancel`,
      });
      if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        alert("Falta la clave pública de Stripe (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY). Revisa tu configuración o avisa al administrador.");
        return;
      }
      const stripe = (await import("@stripe/stripe-js")).loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      );
      const stripeInstance = await stripe;
      if (stripeInstance) {
        await (stripeInstance as any).redirectToCheckout({ sessionId });
      }
    } catch (e: any) {
      console.error("Error creando checkout:", e);
      alert(e.message || "Ocurrió un error al iniciar el pago.");
    }
  };

  const handleDownloadReceipt = async (urlPath: string, isFullUrl: boolean = false) => {
    setDownloadingId(urlPath);
    try {
      let url = urlPath;
      if (!isFullUrl) {
        const result = await getReceiptSignedUrlAction(urlPath);
        if (typeof result === 'string') {
          url = result;
        } else {
          throw new Error("Recibo no disponible");
        }
      } else {
         const supabase = createClient();
         const { data } = await supabase.storage.from('recibos_pagos').createSignedUrl(urlPath, 60 * 15, { download: true });
         if (data?.signedUrl) {
             url = data.signedUrl;
         } else {
             throw new Error("Recibo parcial no disponible");
         }
      }
      window.open(url, '_blank');
    } catch (e) {
      console.error("Error obteniendo recibo:", e);
      alert('No se pudo obtener el recibo. Inténtalo de nuevo.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadPaymentReceipt = async (paymentId: string) => {
    setDownloadingId(paymentId);
    try {
      const res = await downloadPaymentReceiptAction(paymentId);
      if (res?.url) {
        window.open(res.url, '_blank');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error al generar o descargar el recibo.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadFeeReceipt = async (feeId: string) => {
    setDownloadingId(feeId);
    try {
      const res = await downloadFeeReceiptAction(feeId);
      if (res?.url) {
        window.open(res.url, '_blank');
      } else {
        alert("No se pudo obtener el recibo.");
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error al generar o descargar el recibo.");
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-xl space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const totalFacturado = fees.reduce((sum, f) => sum + (f.amount_cents / 100), 0);
  const totalAbonado = fees.reduce((sum, f) => sum + (f.estado === 'pagado' ? (f.amount_cents / 100) : ((f.amount_paid_cents || 0) / 100)), 0);
  const totalPendiente = totalFacturado - totalAbonado;

  return (
    <div className="space-y-4">
      
      {/* Resumen Analítico adaptado a móvil y escritorio sin desbordamiento */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 text-center">
          <p className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">Inscripción</p>
          <p className="text-sm sm:text-lg md:text-2xl font-black text-slate-800">{totalFacturado.toFixed(2)} €</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 md:p-4 text-center">
          <p className="text-[10px] md:text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1 truncate">Total Pagado</p>
          <p className="text-sm sm:text-lg md:text-2xl font-black text-emerald-700">{totalAbonado.toFixed(2)} €</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 md:p-4 text-center">
          <p className="text-[10px] md:text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1 truncate">Total Pendiente</p>
          <p className="text-sm sm:text-lg md:text-2xl font-black text-rose-700">{totalPendiente.toFixed(2)} €</p>
        </div>
      </div>

      {/* Botón desplegable para ver/ocultar el detalle */}
      <div className="pt-1">
        <button
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 transition-all shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            {isDetailsOpen ? "Ocultar detalle de cuotas y recibos" : "Ver detalle de cuotas y recibos"}
          </span>
          {isDetailsOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      {/* Contenido desplegable */}
      {isDetailsOpen && (
        <div className="pt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {fees.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-200">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No hay cuotas registradas aún.</p>
              <p className="text-xs mt-1">Cuando Secretaría genere un cobro, aparecerá aquí.</p>
            </div>
          ) : (
        <>
          {/* ===== VISTA MÓVIL (block md:hidden): Tarjetas táctiles individuales SIN scrollbar horizontal ===== */}
          <div className="block md:hidden space-y-3">
            {fees.map((fee) => {
              const amountEur = (fee.amount_cents / 100).toFixed(2);
              const paidEur = (
                fee.estado === "pagado"
                  ? fee.amount_cents / 100
                  : (fee.amount_paid_cents || 0) / 100
              ).toFixed(2);
              const pendingEur = Math.max(
                0,
                (fee.amount_cents - (fee.amount_paid_cents || 0)) / 100
              ).toFixed(2);

              return (
                <div
                  key={fee.id}
                  className={`bg-white rounded-2xl p-4 border shadow-sm space-y-3 transition-all ${
                    fee.estado === "pagado" ? "border-emerald-200 bg-emerald-50/10" : "border-slate-200"
                  }`}
                >
                  {/* Fila Superior: Concepto + Badge de Estado */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-slate-900 text-sm leading-snug">
                        {fee.concept}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {fee.fecha_pago
                          ? `📅 ${new Date(fee.fecha_pago).toLocaleDateString("es-ES")}`
                          : "📅 Sin fecha"} · 💳 {fee.payment_method || "Método estándar"}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <EstadoBadge estado={fee.estado || "pendiente"} />
                    </div>
                  </div>

                  {/* Fila Central: 3 Cifras Clave */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Importe</span>
                      <span className="font-bold text-slate-800 text-xs">{amountEur} €</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Abonado</span>
                      <span className="font-bold text-emerald-600 text-xs">{paidEur} €</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Pendiente</span>
                      <span
                        className={`font-black text-xs ${
                          parseFloat(pendingEur) > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {pendingEur} €
                      </span>
                    </div>
                  </div>

                  {/* Historial de entregas / recibos parciales */}
                  {fee.payments && fee.payments.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Historial de entregas / abonos:
                      </p>
                      {fee.payments.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-xs text-slate-600 pt-1.5 border-t border-slate-200/60 first:border-0 first:pt-0">
                          <span>
                            {new Date(p.created_at).toLocaleDateString("es-ES")} ({p.payment_method})
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-700">
                              +{(p.amount_cents / 100).toFixed(2)} €
                            </span>
                            <button
                              onClick={() => handleDownloadPaymentReceipt(p.id)}
                              disabled={downloadingId === p.id}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 bg-white px-2 py-0.5 rounded border border-slate-200"
                            >
                              <FileText size={11} />
                              {downloadingId === p.id ? "..." : "PDF"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Acciones principales */}
                  <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                    {fee.estado === "pendiente" && (
                      <button
                        onClick={() => handlePayNow(fee.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 active:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                      >
                        <CreditCard size={14} />
                        Pagar ahora con Tarjeta
                      </button>
                    )}
                    {(fee.estado === "pagado" || (fee.amount_paid_cents && fee.amount_paid_cents > 0)) && (
                      <button
                        onClick={() => handleDownloadFeeReceipt(fee.id)}
                        disabled={downloadingId === fee.id}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 active:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <Download size={14} />
                        {downloadingId === fee.id ? "Generando..." : "Descargar Recibo Oficial PDF"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== VISTA DE ESCRITORIO (hidden md:block): Tabla completa ===== */}
          <div className="hidden md:block overflow-x-auto w-full rounded-xl border border-gray-200 bg-white">
            <table className="w-full divide-y divide-gray-200 whitespace-nowrap">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Concepto</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Importe</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pendiente</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Método</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fees.map((fee) => (
                  <Fragment key={fee.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 flex items-center gap-2">
                        {fee.payments && fee.payments.length > 0 && (
                          <button onClick={() => toggleRow(fee.id)} className="text-gray-400 hover:text-gray-700">
                            {expandedRows[fee.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                        {fee.concept}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800">
                        {(fee.amount_cents / 100).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-rose-600">
                        {((fee.amount_cents - (fee.amount_paid_cents || 0)) / 100).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3">
                        <EstadoBadge estado={fee.estado || 'pendiente'} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                        {fee.payment_method || (fee.payments && fee.payments.length > 0 ? fee.payments[0].payment_method : '–')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {fee.fecha_pago ? new Date(fee.fecha_pago).toLocaleDateString('es-ES') : '–'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right flex items-center justify-end gap-2">
                        {fee.estado === 'pendiente' && (
                          <button
                            onClick={() => handlePayNow(fee.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            <CreditCard size={13} />
                            Pagar ahora
                          </button>
                        )}
                        {(fee.estado === 'pagado' || (fee.amount_paid_cents && fee.amount_paid_cents > 0)) && (
                          <button
                            onClick={() => handleDownloadFeeReceipt(fee.id)}
                            disabled={downloadingId === fee.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            <Download size={13} />
                            {downloadingId === fee.id ? "Generando..." : "Recibo PDF"}
                          </button>
                        )}
                      </td>
                    </tr>
                    
                    {/* Fila expandida de historial de pagos */}
                    {expandedRows[fee.id] && fee.payments && fee.payments.length > 0 && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={7} className="px-8 py-4">
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Historial de Entregas (Recibos Parciales)</h4>
                            <div className="overflow-x-auto w-full">
                              <table className="min-w-full divide-y divide-gray-100 whitespace-nowrap">
                                <tbody>
                                  {fee.payments.map((payment: any) => (
                                    <tr key={payment.id} className="text-sm">
                                      <td className="py-2 text-gray-600">{new Date(payment.created_at).toLocaleDateString('es-ES')}</td>
                                      <td className="py-2 text-gray-600">{payment.payment_method}</td>
                                      <td className="py-2 font-bold text-emerald-600">{(payment.amount_cents / 100).toFixed(2)} €</td>
                                      <td className="py-2 text-right">
                                        <button 
                                          onClick={() => handleDownloadPaymentReceipt(payment.id)}
                                          disabled={downloadingId === payment.id}
                                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                        >
                                          <FileText size={14} /> {downloadingId === payment.id ? "Generando PDF..." : "Descargar PDF"}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
        </div>
      )}
    </div>
  );
}
