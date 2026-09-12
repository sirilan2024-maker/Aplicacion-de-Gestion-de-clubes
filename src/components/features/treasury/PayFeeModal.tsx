"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Building2, Banknote, Copy, Check, AlertCircle, Loader2, Info } from "lucide-react";
import { createPaymentIntentForFeeAction } from "@/app/actions/treasury-actions";
import { StripePaymentModal } from "@/components/features/registration/StripePaymentModal";

interface PayFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fee: {
    id: string;
    concept: string;
    amount_cents: number;
    amount_paid_cents?: number;
    estado: string;
    payment_reference?: string;
    fecha_pago?: string;
  } | null;
  onPaymentSuccess: () => void;
}

export function PayFeeModal({ isOpen, onClose, fee, onPaymentSuccess }: PayFeeModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"card" | "transfer" | "cash" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Stripe details
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeAmountFormatted, setStripeAmountFormatted] = useState<string>("");
  const [stripePlayerName, setStripePlayerName] = useState<string>("");
  const [stripePaymentRef, setStripePaymentRef] = useState<string>("");
  const [clubIban, setClubIban] = useState<string | null>(null);
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !fee) {
      setSelectedMethod(null);
      setError(null);
      setStripeClientSecret(null);
      setIsStripeModalOpen(false);
      return;
    }

    // Pre-cargar datos del backend para garantizar la cantidad exacta y el IBAN
    let isMounted = true;
    async function loadFeeData() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await createPaymentIntentForFeeAction(fee!.id);
        if (!isMounted) return;
        if (!res.success) {
          setError(res.error || "No se pudo preparar la información de pago");
        } else {
          setStripeClientSecret(res.clientSecret || null);
          setStripeAmountFormatted(res.amountFormatted || `${((fee!.amount_cents - (fee!.amount_paid_cents || 0)) / 100).toFixed(2)} €`);
          setStripePlayerName(res.playerName || "Jugador");
          setStripePaymentRef(res.paymentReference || fee!.payment_reference || "");
          setClubIban(res.clubIban || null);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Error al conectar con el servidor");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadFeeData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, fee]);

  if (!fee) return null;

  const pendingCents = fee.amount_cents - (fee.amount_paid_cents || 0);
  const pendingFormatted = (pendingCents / 100).toFixed(2) + " €";

  const handleCopy = (text: string, type: "iban" | "ref") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "iban") {
      setCopiedIban(true);
      setTimeout(() => setCopiedIban(false), 2000);
    } else {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const handlePayCard = () => {
    if (!stripeClientSecret) {
      setError("No se pudo iniciar la pasarela de tarjeta segura. Inténtalo de nuevo.");
      return;
    }
    setIsStripeModalOpen(true);
  };

  const handleStripeSuccess = () => {
    setIsStripeModalOpen(false);
    onClose();
    onPaymentSuccess();
  };

  return (
    <>
      <Dialog
        isOpen={isOpen && !isStripeModalOpen}
        onClose={onClose}
        title="Abono de Cuota Pendiente"
        description="Selecciona la forma en la que deseas realizar el pago."
        className="max-w-lg p-0 overflow-hidden"
      >
        {/* Banner de Concepto e Importe */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-blue-300 uppercase">
              Concepto
            </span>
            <span className="text-xs text-slate-300 font-medium">
              Ref: <span className="font-mono text-white font-bold">{stripePaymentRef || fee.payment_reference || "PAY-SALADAR"}</span>
            </span>
          </div>
          <p className="text-lg font-black text-white leading-tight mt-1">
            {fee.concept}
          </p>

          <div className="mt-3 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-300 font-semibold uppercase block">
                Importe Pendiente Real
              </span>
              <span className="text-2xl font-black text-white tracking-tight">
                {pendingFormatted}
              </span>
            </div>
            {fee.amount_paid_cents && fee.amount_paid_cents > 0 ? (
              <div className="text-right">
                <span className="text-[10px] text-emerald-300 font-semibold block">
                  Abonado previamente
                </span>
                <span className="text-xs font-bold text-emerald-200">
                  +{(fee.amount_paid_cents / 100).toFixed(2)} €
                </span>
              </div>
            ) : null}
          </div>
        </div>

          {/* Cuerpo del Modal */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isLoading ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Cargando opciones de pago seguras...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Opción 1: Tarjeta */}
                <div
                  onClick={() => setSelectedMethod("card")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMethod === "card"
                      ? "border-blue-600 bg-blue-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">Tarjeta / Apple Pay / Google Pay (Online)</span>
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-100/80 px-2 py-0.5 rounded-full">
                          Instantáneo
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Pago seguro online con tarjeta bancaria, Apple Pay o Google Pay mediante Stripe. La cuota queda saldada de inmediato y se emite tu recibo oficial.
                      </p>
                      {selectedMethod === "card" && (
                        <div className="mt-3 pt-3 border-t border-blue-200/60 flex justify-end">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePayCard();
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pagar {stripeAmountFormatted || pendingFormatted} Online
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Opción 2: Transferencia */}
                <div
                  onClick={() => setSelectedMethod("transfer")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMethod === "transfer"
                      ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">Transferencia Bancaria</span>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          Comprobación Tesorería
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Realiza el abono directamente a la cuenta oficial del club indicando tu referencia única.
                      </p>

                      {selectedMethod === "transfer" && (
                        <div className="mt-3 pt-3 border-t border-indigo-200/60 space-y-2.5 animate-in fade-in duration-200">
                          {/* IBAN */}
                          <div className="bg-white p-2.5 rounded-lg border border-indigo-200 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">IBAN Oficial del Club</span>
                              <span className="font-mono text-xs sm:text-sm font-black text-slate-900 truncate block">
                                {clubIban || "Consultar con Secretaría"}
                              </span>
                            </div>
                            {clubIban && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(clubIban, "iban");
                                }}
                                className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-md transition-colors flex-shrink-0 flex items-center gap-1 text-[11px] font-bold"
                              >
                                {copiedIban ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedIban ? "Copiado" : "Copiar"}</span>
                              </button>
                            )}
                          </div>

                          {/* Referencia */}
                          <div className="bg-white p-2.5 rounded-lg border border-indigo-200 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Concepto / Referencia Obligatoria</span>
                              <span className="font-mono text-xs sm:text-sm font-black text-indigo-950 truncate block">
                                {stripePaymentRef || fee.payment_reference || "PAY-SALADAR"}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(stripePaymentRef || fee.payment_reference || "PAY-SALADAR", "ref");
                              }}
                              className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-md transition-colors flex-shrink-0 flex items-center gap-1 text-[11px] font-bold"
                            >
                              {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedRef ? "Copiado" : "Copiar"}</span>
                            </button>
                          </div>

                          <div className="p-2.5 bg-indigo-50/80 rounded-lg border border-indigo-100 flex items-start gap-2 text-xs text-indigo-900">
                            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] leading-relaxed">
                              Una vez realizada la transferencia, envía el justificante a Secretaría. La cuota permanecerá en estado <strong>Pendiente</strong> hasta que Tesorería valide el ingreso en la cuenta del club.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Opción 3: Presencial */}
                <div
                  onClick={() => setSelectedMethod("cash")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMethod === "cash"
                      ? "border-emerald-600 bg-emerald-50/40 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">Pago Presencial / Secretaría</span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          En Oficinas
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Abona la cuota en efectivo o tarjeta con datáfono en las oficinas del club.
                      </p>

                      {selectedMethod === "cash" && (
                        <div className="mt-3 pt-3 border-t border-emerald-200/60 space-y-2 animate-in fade-in duration-200">
                          <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs text-slate-700 space-y-1">
                            <p className="font-semibold text-slate-900">Instrucciones de Pago Presencial:</p>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              Acude a las oficinas de Secretaría en horario de atención indicando el nombre del jugador (<strong>{stripePlayerName}</strong>) y la referencia <strong>{stripePaymentRef || fee.payment_reference || "PAY-SALADAR"}</strong>.
                            </p>
                          </div>
                          <div className="p-2 bg-emerald-50 rounded-lg text-[11px] text-emerald-800 font-medium">
                            ℹ️ La cuota se mantendrá pendiente hasta que el personal de Secretaría registre el cobro y emita el recibo físico u oficial en el sistema.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
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

      {/* Modal Real de Stripe PaymentElement (Reutilizado) */}
      {isStripeModalOpen && stripeClientSecret && (
        <StripePaymentModal
          isOpen={isStripeModalOpen}
          onClose={() => setIsStripeModalOpen(false)}
          clientSecret={stripeClientSecret}
          amountFormatted={stripeAmountFormatted || pendingFormatted}
          playerName={stripePlayerName}
          concept={fee.concept}
          paymentReference={stripePaymentRef}
          onSuccess={handleStripeSuccess}
        />
      )}
    </>
  );
}
