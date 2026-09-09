'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { CreditCard, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string;
  amountFormatted: string;
  playerName: string;
  paymentReference?: string;
  onSuccess: () => void;
}

export function StripePaymentModal({
  isOpen,
  onClose,
  clientSecret,
  amountFormatted,
  playerName,
  paymentReference,
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

        const appearance = {
          theme: 'stripe' as const,
          variables: {
            colorPrimary: '#2563eb',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '8px',
          },
        };

        const elementsInstance = stripeInstance.elements({
          clientSecret,
          appearance,
        });

        const paymentElement = elementsInstance.create('payment', {
          layout: 'tabs',
        });
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
      }, 1500);
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

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        setIsCompleted(true);
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setIsCompleted(true);
        setTimeout(() => {
          onSuccess();
        }, 1200);
      }
    } catch (err: any) {
      console.error('Error confirmPayment:', err);
      setErrorMessage(err.message || 'Error de conexión con la pasarela.');
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => !isProcessing && onClose()}
      title="Pago Seguro Online"
      description={`Completa el abono mediante Tarjeta, Bizum o PayPal para ${playerName}.`}
      className="p-0 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 -mt-6 -mx-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-6 h-6 text-blue-200" />
            <h3 className="text-xl font-bold text-white">Pago Seguro Online</h3>
          </div>
          <div className="flex items-center text-xs text-blue-200 bg-blue-900/50 px-2.5 py-1 rounded-full border border-blue-400/30">
            <Lock className="w-3.5 h-3.5 mr-1" /> SSL 256-bit
          </div>
        </div>
        <p className="text-blue-100 text-sm mt-2">
          Selecciona tu método preferido (<strong>Tarjeta, Bizum o PayPal</strong>) para abonar la cuota de <strong>{playerName}</strong>.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">Total a pagar ahora</span>
            {paymentReference && (
              <span className="text-xs text-gray-500 font-mono mt-0.5 block">Ref: {paymentReference}</span>
            )}
          </div>
          <span className="text-2xl font-extrabold text-blue-900">{amountFormatted}</span>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start space-x-2 text-sm">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isCompleted ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
            <h4 className="text-xl font-bold text-gray-900">¡Pago Confirmado!</h4>
            <p className="text-sm text-gray-600">Procesando los datos de la inscripción...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isMock ? (
              <div className="p-4 border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl text-center space-y-2">
                <p className="text-sm font-semibold text-amber-900">Modo de pruebas local</p>
                <p className="text-xs text-amber-700">
                  Stripe real se activará automáticamente al configurar <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> en producción.
                </p>
              </div>
            ) : (
              <div className="min-h-[180px] relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                )}
                <div ref={containerRef} />
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
                className="text-gray-600 border-gray-300"
              >
                Pagar más tarde
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || (isLoading && !isMock)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 shadow-md"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...
                  </>
                ) : (
                  `Pagar ${amountFormatted}`
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}