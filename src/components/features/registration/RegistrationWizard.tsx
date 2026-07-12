"use client";

import React, { useState } from "react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Users, HeartPulse, Shirt, ShieldCheck, Save, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      fieldsToValidate = ['playerFirstName', 'playerLastName', 'birthDate', 'nationality', 'address', 'city', 'postalCode'];
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
      // 1. Aquí se generarán los timestamps:
      const timestamp = new Date().toISOString();
      const payload = {
        ...data,
        consentInscriptionAt: timestamp,
        consentRgpdAt: timestamp,
        consentImageAt: timestamp,
        consentVideoAt: timestamp,
        consentWhatsappAt: timestamp,
        consentMedicalAt: timestamp,
      };

      console.log("Submitting payload to Supabase:", payload);
      // Simular llamada a Server Action o Supabase API
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert("Inscripción enviada con éxito. Pasando a estado PENDIENTE DE REVISIÓN.");
      
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al enviar el formulario.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            
            <CardFooter className="bg-gray-50 border-t p-6 rounded-b-xl flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || isSubmitting}
                className="font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
              </Button>
              
              {currentStep < STEPS.length ? (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Siguiente Paso <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !methods.formState.isValid}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 shadow-md"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Finalizando...</>
                  ) : (
                    <><Save className="w-5 h-5 mr-2" /> Completar Inscripción</>
                  )}
                </Button>
              )}
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
