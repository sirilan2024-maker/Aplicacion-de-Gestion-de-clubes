"use client";

import React, { useState, useEffect } from "react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Users, HeartPulse, Shirt, ShieldCheck, Save, Loader2, ArrowRight, ArrowLeft, CheckCircle, CreditCard, Lock } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { registrationSchema, RegistrationFormData } from "./schema";
import { Step1PersonalData } from "./steps/Step1PersonalData";
import { Step2Documents } from "./steps/Step2Documents";
import { Step3Fees } from "./steps/Step3Fees";
import { Step4Apparel } from "./steps/Step4Apparel";
import { Step5Consent } from "./steps/Step5Consent";

const STEPS = [
  { id: 1, title: "Datos Personales", icon: <User className="w-5 h-5" /> },
  { id: 2, title: "Documentación", icon: <Save className="w-5 h-5" /> },
  { id: 3, title: "Cuotas y Pagos", icon: <HeartPulse className="w-5 h-5" /> },
  { id: 4, title: "Utillería", icon: <Shirt className="w-5 h-5" /> },
  { id: 5, title: "Consentimientos", icon: <ShieldCheck className="w-5 h-5" /> },
];

export function RegistrationWizard() {
  const searchParams = useSearchParams();
  const teamIdParam = searchParams?.get('team') || null;

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "done">("idle");
  const [submittedData, setSubmittedData] = useState<RegistrationFormData | null>(null);

  const methods = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema) as any,
    mode: "onChange",
    defaultValues: {
      isForeign: false,
      neverFederated: false,
      wasInClub: false,
      paidReservation: false,
      sizeCamisetaJuego: "",
      sizePantalonJuego: "",
      sizeChandal: "",
      sizeSudadera: "",
      sizeCamisetaPaseo: "",
      sizePantalonPaseo: "",
    } as any
  });

  const { handleSubmit, trigger, formState: { errors } } = methods;

  const nextStep = async () => {
    // Validate current step fields before proceeding
    let fieldsToValidate: (keyof RegistrationFormData)[] = [];
    
    if (currentStep === 1) {
      fieldsToValidate = ['playerFirstName', 'playerLastName', 'playerDni', 'birthDate', 'nationality', 'address', 'city', 'postalCode'];
      // Also validate tutors if required
      const birthDate = methods.getValues('birthDate');
      if (birthDate) {
         const isSenior = new Date(birthDate).getFullYear() <= 2007;
         if (!isSenior) {
            fieldsToValidate.push('tutor1Name', 'tutor1Dni', 'tutor1Email', 'tutor1Phone', 'tutorRelation');
         }
      }
    } else if (currentStep === 3) {
      fieldsToValidate = ['paymentMethod'];
    } else if (currentStep === 4) {
      fieldsToValidate = ['sizeCamisetaJuego', 'sizePantalonJuego', 'sizeChandal', 'sizeSudadera', 'sizeCamisetaPaseo', 'sizePantalonPaseo'];
    }
    
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    try {
      // 1. Si elige tarjeta, simulamos el delay visual para el usuario
      if (data.paymentMethod === "Stripe") {
        setPaymentStatus("processing");
        // Dejamos un pequeño delay visual simulado
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 2. Enviar la inscripción real a nuestra nueva API (/api/register)
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          teamId: teamIdParam || undefined
        }),
      });

      if (!response.ok) {
        throw new Error('Error de servidor al guardar la inscripción');
      }

      const result = await response.json();
      console.log('Inscripción guardada correctamente:', result);
      
      if (data.paymentMethod === "Stripe") {
        setPaymentStatus("done");
      }

      // 3. Mostrar pantalla final
      setSubmittedData(data);
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error enviando formulario:', error);
      alert("Ocurrió un error al enviar el formulario al servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess && submittedData) {
    return (
      <div className="w-full max-w-3xl mx-auto pb-12 animate-in fade-in zoom-in-95 duration-500">
        <Card className="shadow-2xl border-0 overflow-hidden rounded-2xl">
          <div className="bg-green-600 p-8 text-center text-white">
            <CheckCircle className="w-20 h-20 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">¡Inscripción Completada!</h2>
          </div>
          <CardContent className="p-8 space-y-6 bg-white text-center">
            <p className="text-lg text-gray-700 font-medium">
              La solicitud ha sido aceptada por el Club Sporting Saladar. Para formalizar definitivamente la inscripción será necesario realizar el primer pago de la cuota. Dicho pago permitirá confirmar la plaza del jugador, tramitar la licencia federativa y realizar el pedido de la equipación.
            </p>

            {submittedData.paymentMethod === "Stripe" && (
              <div className="bg-green-50 text-green-800 p-6 rounded-xl border border-green-200 flex flex-col items-center gap-3 mt-6">
                <CreditCard className="w-10 h-10 text-green-600" />
                <div>
                  <p className="font-bold text-lg">Pago completado con éxito mediante tarjeta.</p>
                  <p className="text-sm mt-1">Hemos recibido tu primer pago correctamente. ¡Bienvenido al equipo!</p>
                </div>
              </div>
            )}

            {(submittedData.paymentMethod === "Transferencia" || submittedData.paymentMethod === "Contado") && (
              <div className="bg-blue-50 text-left p-6 md:p-8 rounded-xl border border-blue-100 mt-6 shadow-inner">
                <h3 className="text-blue-900 text-xl font-bold mb-4 flex items-center gap-2">
                  <HeartPulse className="w-6 h-6 text-blue-600" /> Instrucciones para el Pago
                </h3>
                {submittedData.paymentMethod === "Transferencia" ? (
                  <div className="space-y-4 text-sm text-blue-800">
                    <p className="text-base">Por favor, realiza la transferencia bancaria a la siguiente cuenta:</p>
                    <div className="bg-white p-4 rounded-lg border border-blue-200 text-center font-mono text-lg font-bold shadow-sm">
                      ESXX XXXX XXXX XXXX XXXX
                    </div>
                    <ul className="list-disc pl-5 space-y-2 mt-4">
                      <li><strong>Concepto:</strong> INSCRIPCION {submittedData.playerFirstName} {submittedData.playerLastName}</li>
                      <li>Envía el justificante a <strong>secretaria@sportingsaladar.com</strong></li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-4 text-sm text-blue-800">
                    <p className="text-base">Por favor, acude a las oficinas del club para realizar el pago en efectivo.</p>
                    <ul className="list-disc pl-5 space-y-2 mt-4">
                      <li><strong>Horario de Secretaría:</strong> Lunes a Jueves de 17:30 a 20:00.</li>
                      <li>Indica el nombre del jugador ({submittedData.playerFirstName} {submittedData.playerLastName}) al realizar el pago.</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-gray-50 p-6 border-t flex justify-center">
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold px-8" onClick={() => window.location.href = '/'}>
              Volver al Inicio
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      {/* Wizard Header Progress */}
      <div className="mb-8 overflow-x-auto pb-4">
        <div className="flex items-center justify-between min-w-[600px]">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center flex-1 relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold z-10 transition-colors ${
                currentStep >= step.id ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-400'
              }`}>
                {step.id < currentStep ? <Save className="w-5 h-5" /> : step.id}
              </div>
              <span className={`text-xs mt-2 font-semibold ${currentStep >= step.id ? 'text-blue-800' : 'text-gray-400'}`}>
                {step.title}
              </span>
              {index < STEPS.length - 1 && (
                <div className={`absolute top-5 left-[50%] w-full h-[3px] -z-0 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="shadow-lg border-0 ring-1 ring-gray-200">
            <CardContent className="p-0">
              <div className="p-6 md:p-10">
                {currentStep === 1 && <Step1PersonalData />}
                {currentStep === 2 && <Step2Documents />}
                {currentStep === 3 && <Step3Fees />}
                {currentStep === 4 && <Step4Apparel />}
                {currentStep === 5 && <Step5Consent />}
              </div>
            </CardContent>
            
            <CardFooter className="bg-gray-50 border-t p-6 rounded-b-xl">
              <div className="flex justify-between items-center w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1 || isSubmitting}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atrás
                </Button>
                
                <div className="flex items-center gap-4">
                  {currentStep === STEPS.length && !methods.formState.isValid && (
                    <div className="text-xs text-red-500 max-w-xs text-right mr-2 hidden sm:block">
                      Faltan campos obligatorios o hay errores (Ej: DNI incorrecto). Revisa los pasos anteriores.
                    </div>
                  )}
                  {currentStep < STEPS.length ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Siguiente
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting || !methods.formState.isValid}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 
                          {paymentStatus === "processing" ? "Procesando pago seguro..." : "Finalizando..."}
                        </>
                      ) : (
                        <><Save className="w-5 h-5 mr-2" /> Completar Inscripción</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardFooter>
          </Card>
        </form>
      </FormProvider>
      {/* Dev Tool para ver errores rápido */}
      {Object.keys(errors).length > 0 && (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md text-sm">
          <strong>Hay errores en el formulario:</strong>
          <ul className="list-disc pl-5 mt-2">
            {Object.entries(errors).map(([key, error]) => (
              <li key={key}><strong>{key}:</strong> {error?.message?.toString()}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
