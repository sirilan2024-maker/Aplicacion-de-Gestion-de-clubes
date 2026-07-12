import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { HeartPulse, CreditCard, Banknote, Building } from "lucide-react";
import { RegistrationFormData } from "../schema";
import { Checkbox } from "@/components/ui/checkbox";

export function Step3Fees() {
  const { register, control, formState: { errors } } = useFormContext<RegistrationFormData>();
  
  const wasInClub = useWatch({ control, name: "wasInClub" });
  const paidReservation = useWatch({ control, name: "paidReservation" });
  const paymentMethod = useWatch({ control, name: "paymentMethod" });
  const paymentPlan = useWatch({ control, name: "paymentPlan" });

  let feeTotal = 250;
  if (wasInClub) {
    feeTotal = 195;
    if (paidReservation) {
      feeTotal -= 50; // 145
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 border-b pb-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-red-500" />
          Cuotas y Pagos
        </h3>
        <p className="text-sm text-gray-500 mt-1">Calculadora de cuota base y selección de método de pago.</p>
      </div>

      {/* Calculadora */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-4">Determinación de Cuota Base</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center space-x-3">
              <Checkbox id="wasInClub" {...register("wasInClub")} />
              <label htmlFor="wasInClub" className="text-sm font-medium text-gray-700 cursor-pointer">
                ¿Perteneció al club en la temporada 25/26?
              </label>
            </div>
            {wasInClub && <span className="text-sm font-bold text-green-600">Aplica descuento renovación</span>}
          </div>

          {wasInClub && (
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border ml-6 animate-in slide-in-from-left-2">
              <div className="flex items-center space-x-3">
                <Checkbox id="paidReservation" {...register("paidReservation")} />
                <label htmlFor="paidReservation" className="text-sm font-medium text-gray-700 cursor-pointer">
                  ¿Pagó reserva de plaza (50€)?
                </label>
              </div>
              {paidReservation && <span className="text-sm font-bold text-orange-600">- 50€ descontados</span>}
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t flex justify-between items-center">
          <span className="text-gray-600 font-semibold">Total a pagar (Temporada Completa)</span>
          <span className="text-3xl font-black text-blue-900">{feeTotal}€</span>
        </div>
        {paidReservation && (
          <p className="text-xs text-orange-600 text-right mt-2 font-medium">
            * El pago de la reserva será verificado por administración.
          </p>
        )}
      </div>

      {/* Planes y Métodos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">Plan de Pagos</h4>
          <div className="flex flex-col gap-3">
            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${paymentPlan === 'Total' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}>
              <input type="radio" value="Total" {...register("paymentPlan")} className="w-4 h-4 text-blue-600" />
              <div className="ml-3">
                <span className="block text-sm font-bold text-gray-900">Cuota Única</span>
                <span className="block text-xs text-gray-500">1 solo pago de {feeTotal}€</span>
              </div>
            </label>
            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${paymentPlan === 'Fraccionado' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}>
              <input type="radio" value="Fraccionado" {...register("paymentPlan")} className="w-4 h-4 text-blue-600" />
              <div className="ml-3">
                <span className="block text-sm font-bold text-gray-900">Pago Fraccionado</span>
                <span className="block text-xs text-gray-500">2 cuotas de {(feeTotal/2).toFixed(2)}€</span>
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">Método de Pago <span className="text-red-500">*</span></h4>
          {errors.paymentMethod && <p className="text-xs text-red-500">{errors.paymentMethod.message}</p>}
          <div className="flex flex-col gap-3">
            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'Stripe' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}>
              <input type="radio" value="Stripe" {...register("paymentMethod")} className="w-4 h-4 text-blue-600" />
              <div className="ml-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <span className="block text-sm font-bold text-gray-900">Tarjeta de Crédito (Online)</span>
              </div>
            </label>
            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'Transferencia' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}>
              <input type="radio" value="Transferencia" {...register("paymentMethod")} className="w-4 h-4 text-blue-600" />
              <div className="ml-3 flex items-center gap-2">
                <Building className="w-5 h-5 text-gray-600" />
                <span className="block text-sm font-bold text-gray-900">Transferencia Bancaria</span>
              </div>
            </label>
            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'Contado' ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'}`}>
              <input type="radio" value="Contado" {...register("paymentMethod")} className="w-4 h-4 text-blue-600" />
              <div className="ml-3 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-gray-600" />
                <span className="block text-sm font-bold text-gray-900">Al Contado (Secretaría)</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {paymentMethod === 'Transferencia' && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-6 text-sm text-yellow-800">
          <strong>Datos para transferencia:</strong><br />
          Concepto: [Nombre del Jugador] - Cuota<br />
          IBAN Club Sporting Saladar: ESXX XXXX XXXX XXXX XXXX XXXX<br />
          <em>* Tu inscripción no será validada hasta que la administración confirme la recepción de la transferencia.</em>
        </div>
      )}
    </div>
  );
}
