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
import { StripePaymentModal } from "./StripePaymentModal";
import toast from "react-hot-toast";

const STEPS = [
  { id: 1, title: "Datos Personales", icon: <User className="w-5 h-5" /> },
  { id: 2, title: "Documentación", icon: <Save className="w-5 h-5" /> },
  { id: 3, title: "Cuotas y Pagos", icon: <HeartPulse className="w-5 h-5" /> },
  { id: 4, title: "Utillería", icon: <Shirt className="w-5 h-5" /> },
  { id: 5, title: "Consentimientos", icon: <ShieldCheck className="w-5 h-5" /> },
];

export function RegistrationWizard({ 
  isInternalForm = false,
  initialData = {},
  isSeniorTeam = false,
  clubIban = null,
}: { 
  isInternalForm?: boolean;
  initialData?: Partial<RegistrationFormData>;
  isSeniorTeam?: boolean;
  clubIban?: string | null;
}) {
  const searchParams = useSearchParams();
  const teamIdParam = searchParams?.get('team') || null;

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "done">("idle");
  const [submittedData, setSubmittedData] = useState<RegistrationFormData | null>(null);
  const [submittedPlayerName, setSubmittedPlayerName] = useState<string>('');
  const [submittedClubIban, setSubmittedClubIban] = useState<string | null>(clubIban || null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);

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
      sizeMedias: "",
      isSeniorTeam: isSeniorTeam,
      isSeniorSelection: isSeniorTeam ? "senior" : "minor",
      ...initialData,
    } as any
  });

  const { handleSubmit, trigger, formState: { errors } } = methods;

  useEffect(() => {
    methods.register("isSeniorTeam");
    methods.register("isSeniorSelection");
    methods.setValue("isSeniorTeam", isSeniorTeam);
    methods.setValue("isSeniorSelection", isSeniorTeam ? "senior" : "minor");
  }, [isSeniorTeam, methods]);

  const birthDateValue = useWatch({ control: methods.control, name: 'birthDate' });
  const wasInClub = useWatch({ control: methods.control, name: 'wasInClub' });
  const paidReservation = useWatch({ control: methods.control, name: 'paidReservation' });
  const paymentPlan = useWatch({ control: methods.control, name: 'paymentPlan' });
  const playerFirstName = useWatch({ control: methods.control, name: 'playerFirstName' });
  const playerLastName = useWatch({ control: methods.control, name: 'playerLastName' });

  // Calculate estimated amount to charge on the modal
  let baseFee = wasInClub ? 195 : 250;
  if (paidReservation) baseFee -= 50;
  let chargeAmount = baseFee;
  if (paymentPlan === "Fraccionado") {
    chargeAmount = Math.round((baseFee / 2) * 100) / 100;
  }
  const formattedChargeAmount = `${chargeAmount.toFixed(2)} €`;

  // Consider adult if playing for senior team or born in 2007 or earlier
  const isAdult = isSeniorTeam || (birthDateValue ? new Date(birthDateValue).getFullYear() <= 2007 : false);

  const nextStep = async () => {
    // Validate current step fields before proceeding
    let fieldsToValidate: (keyof RegistrationFormData)[] = [];
    
    if (currentStep === 1) {
      fieldsToValidate = ['playerFirstName', 'playerLastName', 'playerDni', 'birthDate', 'nationality', 'address', 'city', 'postalCode'];
      if (!isAdult) {
        fieldsToValidate.push('tutor1Name', 'tutor1Dni', 'tutor1Email', 'tutor1Phone', 'tutorRelation');
      }
    } else if (currentStep === 3) {
      fieldsToValidate = ['paymentMethod'];
    } else if (currentStep === 4) {
      fieldsToValidate = ['sizeCamisetaJuego', 'sizePantalonJuego', 'sizeChandal', 'sizeSudadera', 'sizeCamisetaPaseo', 'sizePantalonPaseo', 'sizeMedias'];
    }
    
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      // Si el paso siguiente es el 3 (Cuotas) y es isSeniorTeam, nos lo saltamos y vamos al 4
      if (currentStep === 2 && isSeniorTeam) {
        setCurrentStep(prev => prev + 2);
      } else {
        setCurrentStep(prev => prev + 1);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    // Si estamos en el paso 4 y venimos del 2 porque somos senior, volvemos al 2
    if (currentStep === 4 && isSeniorTeam) {
      setCurrentStep(prev => prev - 2);
    } else {
      setCurrentStep(prev => prev - 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    try {
      // Transform all string fields to uppercase (except emails and passwords)
      const dataToSubmit = { ...data } as Record<string, any>;
      for (const key in dataToSubmit) {
        if (typeof dataToSubmit[key] === 'string' && dataToSubmit[key]) {
          const skipKeys = ['email', 'password', 'paymentmethod', 'paymentplan', 'isseniorselection', 'size'];
          const isSkip = skipKeys.some(sk => key.toLowerCase().includes(sk));
          if (!isSkip) {
            dataToSubmit[key] = dataToSubmit[key].toUpperCase();
          }
        }
      }

      // 1. Enviar la inscripción real a nuestra API (/api/register)
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...dataToSubmit,
          teamId: teamIdParam || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error de servidor al guardar la inscripción');
      }

      const result = await response.json();
      console.log('Inscripción guardada correctamente:', result);
      
      const mergedData = { ...data, ...dataToSubmit };
      setSubmittedData(mergedData as any);

      const nameFromForm = `${dataToSubmit.playerFirstName || data.playerFirstName || ''} ${dataToSubmit.playerLastName || data.playerLastName || ''}`.trim() || `${dataToSubmit.tutor1Name || data.tutor1Name || ''} ${dataToSubmit.tutor1LastName || data.tutor1LastName || ''}`.trim();
      setSubmittedPlayerName(result.playerName || nameFromForm || 'Jugador');

      if (result.clubIban) {
        setSubmittedClubIban(result.clubIban);
      } else if (clubIban) {
        setSubmittedClubIban(clubIban);
      }

      if (result.paymentReference) {
        setPaymentRef(result.paymentReference);
      }

      // 2. Si eligió tarjeta y el servidor devolvió clientSecret, abrir la pasarela real de Stripe
      if (data.paymentMethod === "Stripe" && result.clientSecret) {
        setStripeClientSecret(result.clientSecret);
        setStripeModalOpen(true);
      } else {
        // Transferencia, Contado o Senior: mostrar pantalla de confirmación directa
        setIsSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: any) {
      console.error('Error enviando formulario:', error);
      alert(error.message || "Ocurrió un error al enviar el formulario al servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    // Definimos qué campos pertenecen a qué paso
    const stepFields: Record<number, string[]> = {
      1: ['playerFirstName', 'playerLastName', 'playerDni', 'birthDate', 'nationality', 'address', 'city', 'postalCode', 'tutor1Name', 'tutor1LastName', 'tutor1Dni', 'tutor1Email', 'tutor1Phone', 'tutorRelation', 'isSeniorSelection'],
      2: ['docsUploaded', 'escolarizacion'],
      3: isSeniorTeam ? [] : ['paymentMethod', 'paymentPlan', 'wasInClub', 'paidReservation'],
      4: ['sizeCamisetaJuego', 'sizePantalonJuego', 'sizeChandal', 'sizeSudadera', 'sizeCamisetaPaseo', 'sizePantalonPaseo', 'sizeMedias'],
      5: !isAdult ? ['consentRgpd', 'consentTutela', 'consentMedical', 'password', 'confirmPassword'] : ['consentRgpd', 'consentMedical', 'password', 'confirmPassword']
    };

    const errorFields = Object.keys(errors);
    
    // Buscar el primer paso que tenga un error y saltar a él
    for (let step = 1; step <= 5; step++) {
      if (stepFields[step].some(field => errorFields.includes(field))) {
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.error(`Revisa los campos marcados en rojo en el Paso ${step}.`);
        return;
      }
    }
    
    // Si no mapeó a ningún paso (safety net)
    if (errorFields.length > 0) {
      console.warn("Form errors that didn't match any step:", errors);
      alert("CAMPOS QUE FALLAN: " + errorFields.join(", "));
      toast.error(`Revisa los campos con error: ${errorFields.join(", ")}`);
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
            <div className="flex justify-center mb-2">
              <img
                src="/images/sporting-saladar-shield.jpg"
                alt="Club Sporting Saladar"
                className="w-24 h-auto object-contain drop-shadow-sm"
              />
            </div>

            <div className="space-y-4 text-left bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm sm:text-base text-gray-800 leading-relaxed">
              <p className="font-semibold text-gray-900">
                La solicitud está en tramite y ha sido aceptada por el Club Sporting Saladar. Para formalizar definitivamente la inscripción será necesario verificar por parte del club el pago de la cuota.
              </p>
              <p className="text-gray-700">
                Después de revisar dicho pago y si todo está correcto se confirmará la plaza del jugador, se tramitará la licencia federativa y se realizará el pedido de la equipación, si hubiera algún problema el club se pondrá en contacto con usted, un saludo y gracias por unirse a nuestro club.
              </p>
            </div>

            <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-6 rounded-2xl flex flex-col items-center gap-3 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
              <div>
                <p className="font-bold text-lg text-emerald-950">
                  Inscripción registrada.
                </p>
                <p className="text-sm text-emerald-800 mt-2 leading-relaxed">
                  Tu solicitud ha sido guardada. Si has elegido la opción de pago en dos cuotas, automáticamente recibirás el cargo en tu tarjeta de la siguiente cuota, desde tu Portal Familiar podras ver el estado de pago y descargar el recibo o en Secretaría del club.
                </p>
                {paymentRef && (
                  <p className="text-xs font-mono font-semibold mt-3 text-emerald-700 bg-emerald-100/70 py-1 px-3 rounded-full inline-block">
                    Referencia de pago: {paymentRef}
                  </p>
                )}
              </div>
            </div>

            {(() => {
              const effectivePlayerName = submittedPlayerName || `${submittedData.playerFirstName || ''} ${submittedData.playerLastName || ''}`.trim() || 'Jugador';
              const effectiveClubIban = submittedClubIban || clubIban || null;

              return (
                <>
                  {(submittedData.paymentMethod === "Transferencia" || submittedData.paymentMethod === "Contado") && (
                    <div className="bg-blue-50 text-left p-6 md:p-8 rounded-xl border border-blue-100 mt-6 shadow-inner">
                      <h3 className="text-blue-900 text-xl font-bold mb-4 flex items-center gap-2">
                        <HeartPulse className="w-6 h-6 text-blue-600" /> Instrucciones para el Pago
                      </h3>
                      {submittedData.paymentMethod === "Transferencia" ? (
                        <div className="space-y-4 text-sm text-blue-800">
                          <p className="text-base">Por favor, realiza la transferencia bancaria utilizando los siguientes datos oficiales:</p>
                          {paymentRef && (
                            <div className="bg-white p-4 rounded-lg border border-blue-200 text-center shadow-sm">
                              <span className="text-xs uppercase font-semibold text-gray-500 block">Referencia Oficial de Pago</span>
                              <span className="font-mono text-xl font-extrabold text-blue-900">{paymentRef}</span>
                            </div>
                          )}
                          {effectiveClubIban && (
                            <div className="bg-white p-3 rounded-lg border border-blue-200 text-center shadow-sm">
                              <span className="text-xs uppercase font-semibold text-gray-500 block">IBAN del club</span>
                              <span className="font-mono text-lg font-bold text-blue-950">{effectiveClubIban}</span>
                            </div>
                          )}
                          <ul className="list-disc pl-5 space-y-2 mt-4">
                            <li><strong>Concepto obligatorio:</strong> <span className="font-mono font-bold text-blue-950">{paymentRef ? `${paymentRef} - ` : ""}INSCRIPCION {effectivePlayerName}</span></li>
                            <li><strong>Jugador:</strong> {effectivePlayerName}</li>
                            <li>Envía el justificante bancario por email a <strong>secretaria@sportingsaladar.com</strong> indicando la referencia anterior.</li>
                          </ul>
                        </div>
                      ) : (
                        <div className="space-y-4 text-sm text-blue-800">
                          <p className="text-base">Por favor, acude a las oficinas del club para realizar el pago en efectivo.</p>
                          <ul className="list-disc pl-5 space-y-2 mt-4">
                            <li><strong>Horario de Secretaría:</strong> Lunes a Jueves de 17:30 a 20:00.</li>
                            <li>Indica el nombre del jugador ({effectivePlayerName}){paymentRef ? ` y la referencia ${paymentRef}` : ""} al realizar el pago.</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
          <CardFooter className="bg-gray-50 p-6 border-t flex justify-center">
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold px-8" onClick={() => window.location.href = '/login'}>
              Ir a Iniciar Sesión
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
        <form onSubmit={methods.handleSubmit(onSubmit, onError)} className="space-y-8">
          <input type="hidden" value={isSeniorTeam ? "true" : "false"} {...methods.register("isSeniorTeam")} />
          <Card className="shadow-2xl border-0 overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              <div className="p-6 md:p-10">
                <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                  <Step1PersonalData isAdult={isAdult} />
                </div>
                <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                  <Step2Documents />
                </div>
                <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
                  <Step3Fees clubIban={clubIban} />
                </div>
                <div style={{ display: currentStep === 4 ? 'block' : 'none' }}>
                  <Step4Apparel />
                </div>
                <div style={{ display: currentStep === 5 ? 'block' : 'none' }}>
                  <Step5Consent isInternalForm={isInternalForm} isAdult={isAdult} />
                </div>
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
                      disabled={isSubmitting}
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

      {/* Modal pasarela Stripe real */}
      {stripeClientSecret && (
        <StripePaymentModal
          isOpen={stripeModalOpen}
          onClose={() => {
            setStripeModalOpen(false);
            setPaymentStatus("idle");
            setIsSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          clientSecret={stripeClientSecret}
          amountFormatted={formattedChargeAmount}
          playerName={`${playerFirstName || ''} ${playerLastName || ''}`.trim() || 'Jugador'}
          concept="CUOTA INSCRIPCIÓN TEMPORADA 26/27"
          paymentReference={paymentRef || undefined}
          onSuccess={() => {
            setStripeModalOpen(false);
            setPaymentStatus("done");
            setIsSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
