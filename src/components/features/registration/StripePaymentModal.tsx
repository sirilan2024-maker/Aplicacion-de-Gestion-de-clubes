'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { Lock, AlertCircle, Loader2, CheckCircle2, ShieldCheck, X, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string;
  amountFormatted: string;
  playerName: string;
  paymentReference?: string;
  concept?: string;
  onSuccess: () => void;
}

export function StripePaymentModal({
  isOpen,
  onClose,
  clientSecret,
  amountFormatted,
  playerName,
  paymentReference,
  concept = 'Cuota Deportiva / Inscripción',
  onSuccess,
}: StripePaymentModalProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const isMock = !publishableKey || clientSecret.includes('_mock');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !clientSecret || isMock) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function initStripe() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const stripeInstance = await loadStripe(publishableKey!);
        if (!stripeInstance || !isMounted) return;

        setStripe(stripeInstance);

        // Configuración de apariencia limpia inspirada en Stripe Checkout
        const appearance: any = {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0070f3',
            colorBackground: '#ffffff',
            colorText: '#1e293b',
            colorDanger: '#ef4444',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: '8px',
            spacingUnit: '4px',
          },
          rules: {
            '.Input': {
              border: '1px solid #d1d5db',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              padding: '10px 12px',
            },
            '.Input:focus': {
              border: '1px solid #0070f3',
              boxShadow: '0 0 0 2px rgba(0, 112, 243, 0.15)',
            },
            '.Label': {
              fontWeight: '500',
              fontSize: '13px',
              color: '#374151',
              marginBottom: '6px',
            },
            '.Tab': {
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            },
            '.Tab--selected': {
              borderColor: '#0070f3',
            },
          },
        };

        const elementsInstance = stripeInstance.elements({
          clientSecret,
          appearance,
        });

        // Configurar Payment Element: acordeón con tarjeta y express wallets (Apple Pay / Google Pay)
        // radios debe ser 'auto', 'always', 'never' o 'if_multiple'
        const paymentElementOptions: any = {
          layout: {
            type: 'accordion',
            defaultCollapsed: false,
            radios: 'auto',
            spacedAccordionItems: false,
          },
          wallets: {
            applePay: 'auto',
            googlePay: 'auto',
          },
          business: {
            name: 'CLUB SPORTING SALADAR',
          },
        };

        const paymentElement = elementsInstance.create('payment', paymentElementOptions);

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          paymentElement.mount(containerRef.current);
        }

        setElements(elementsInstance);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error inicializando Stripe Elements:', err);
        if (isMounted) {
          setErrorMessage('No se pudo cargar la pasarela de pago seguro. Por favor, intenta de nuevo.');
          setIsLoading(false);
        }
      }
    }

    initStripe();

    return () => {
      isMounted = false;
    };
  }, [isOpen, clientSecret, publishableKey, isMock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMock) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setIsCompleted(true);
        setTimeout(() => {
          onSuccess();
        }, 1200);
      }, 1200);
      return;
    }

    if (!stripe || !elements) {
      setErrorMessage('La pasarela de pago aún no está lista.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const returnUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}?status=success`
        : 'https://sportingsaladar.com';

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      });

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setErrorMessage(error.message || 'El pago fue rechazado.');
        } else {
          setErrorMessage(error.message || 'Ocurrió un error procesando el pago.');
        }
        setIsProcessing(false);
        return;
      }

      if (!paymentIntent) {
        setIsProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
        setIsCompleted(true);
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else if (paymentIntent.status === 'requires_action') {
        setIsProcessing(false);
      } else {
        setIsProcessing(false);
        setErrorMessage(`El pago no se ha completado (estado: ${paymentIntent.status}).`);
      }
    } catch (err: any) {
      console.error('Error confirmPayment:', err);
      setErrorMessage(err.message || 'Error de conexión con la pasarela.');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => !isProcessing && onClose()}
        aria-hidden="true"
      />

      {/* Modal Container con diseño 2 columnas estilo Stripe Checkout */}
      <div className="relative z-50 w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Botón cerrar flotante */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
          
          {/* COLUMNA IZQUIERDA: Concepto, Importe y Escudo Oficial del Club */}
          <div className="md:col-span-5 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Badge superior */}
              <div className="flex items-center space-x-2 mb-6">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  Pasarela Oficial SSL
                </span>
                {isMock && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                    Test Mode
                  </span>
                )}
              </div>

              {/* Concepto del pago */}
              <div className="space-y-1 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Concepto
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {concept}
                </h3>
              </div>

              {/* Importe en grande */}
              <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm mb-6">
                <span className="text-xs text-slate-500 font-medium block mb-1">
                  Importe a pagar
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {amountFormatted}
                </div>
              </div>

              {/* Datos del Jugador / Referencia */}
              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-200/80 pt-4">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Jugador / Alumno:</span>
                  <span className="font-semibold text-slate-800">{playerName}</span>
                </div>
                {paymentReference && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Referencia:</span>
                    <span className="font-mono font-medium text-slate-700">{paymentReference}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Escudo Oficial Club Sporting Saladar */}
            <div className="mt-8 pt-6 border-t border-slate-200/80 flex flex-col items-center justify-center">
              <img
                src="/images/sporting-saladar-shield.jpg"
                alt="Escudo Oficial C.S.S. Sporting Saladar"
                className="w-32 sm:w-36 h-auto max-h-48 object-contain drop-shadow-md rounded-lg"
              />
              <p className="text-[11px] font-bold text-slate-600 tracking-wider uppercase mt-3 text-center">
                Club Sporting Saladar
              </p>
            </div>
          </div>

          {/* COLUMNA DERECHA: Métodos de Pago Exclusivos (Tarjeta, Apple Pay, Google Pay) o Mensaje de Confirmación */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-white">
            {isCompleted ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in-95 duration-300 my-auto">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border-2 border-emerald-200 shadow-sm">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h4 className="text-2xl font-extrabold text-slate-900">¡Pago Confirmado con Éxito!</h4>
                <p className="text-sm text-slate-500 max-w-sm">
                  Hemos recibido tu abono correctamente. Redirigiendo a tu resumen de inscripción...
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    Método de pago
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aceptamos Tarjeta de crédito/débito, Apple Pay y Google Pay.
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-5 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-start space-x-2.5 text-xs sm:text-sm">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {isMock ? (
                    <div className="p-6 border-2 border-dashed border-amber-300 bg-amber-50/60 rounded-xl text-center space-y-3">
                      <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-amber-900">Modo de pruebas local</p>
                      <p className="text-xs text-amber-700 leading-relaxed max-w-sm mx-auto">
                        Simulación de pago activa. Al pulsar <strong>Pagar</strong> se completará la operación en modo desarrollo.
                      </p>
                    </div>
                  ) : (
                    <div className="min-h-[220px] relative">
                      {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 space-y-2">
                          <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                          <span className="text-xs text-slate-500 font-medium">Cargando pasarela segura...</span>
                        </div>
                      )}
                      <div ref={containerRef} />
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <Button
                      type="submit"
                      disabled={isProcessing || (isLoading && !isMock)}
                      className="w-full bg-[#0070f3] hover:bg-[#005bb5] text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition-all text-sm sm:text-base flex items-center justify-center space-x-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span>Procesando pago seguro...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-1.5 opacity-90" />
                          <span>Pagar {amountFormatted}</span>
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isProcessing}
                      className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700 py-1 transition-colors"
                    >
                      Cancelar y pagar más tarde
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Footer de seguridad */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center space-x-2 text-[11px] text-slate-400 text-center">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Pagos procesados de forma segura mediante <strong>Stripe</strong>. Encriptación 256-bit SSL.</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
