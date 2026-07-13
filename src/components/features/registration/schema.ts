import * as z from "zod";

export const registrationSchema = z.object({
  // STEP 1: Personal & Family Data
  playerFirstName: z.string().min(2, "El nombre es requerido"),
  playerLastName: z.string().min(2, "Los apellidos son requeridos"),
  birthDate: z.string().min(1, "La fecha de nacimiento es requerida"),
  nationality: z.string().min(2, "La nacionalidad es requerida"),
  isForeign: z.boolean().default(false),
  neverFederated: z.boolean().default(false),
  address: z.string().min(5, "El domicilio completo es requerido"),
  city: z.string().min(2, "La localidad es requerida"),
  postalCode: z.string().min(4, "El código postal es requerido"),
  
  // Opcionales para Senior, requeridos para menores (lo validamos con superRefine)
  tutor1Name: z.string().optional(),
  tutor1Dni: z.string().optional(),
  tutor1Email: z.string().email("Email inválido").optional().or(z.literal('')),
  tutor1Phone: z.string().optional(),
  tutorRelation: z.string().optional(),
  
  // STEP 2: Documentos (En el form manejamos Files, pero aquí validamos que existan)
  // Las fotos obligatorias las manejaremos en el estado del componente para simplificar,
  // pero podemos requerir flags booleanas para saber si ya se subieron
  docsUploaded: z.boolean().default(false),

  // STEP 3: Cuotas
  wasInClub: z.boolean().default(false),
  paidReservation: z.boolean().default(false),
  paymentMethod: z.enum(["Stripe", "Transferencia", "Contado", ""]).optional(),
  paymentPlan: z.enum(["Total", "Fraccionado", ""]).optional(),

  // STEP 4: Tallas
  sizeCamisetaJuego: z.string().min(1, "Requerido"),
  sizePantalonJuego: z.string().min(1, "Requerido"),
  sizeChandal: z.string().min(1, "Requerido"),
  sizeSudadera: z.string().min(1, "Requerido"),
  sizeCamisetaPaseo: z.string().min(1, "Requerido"),
  sizePantalonPaseo: z.string().min(1, "Requerido"),

  // STEP 5: Hospitality & RGPD
  volunteerInterest: z.string().optional(),
  sponsorCompanyName: z.string().optional(),
  sponsorContactName: z.string().optional(),
  sponsorPhone: z.string().optional(),
  // Firmas legales obligatorias
  consentRgpd: z.boolean().refine(val => val === true, "Debes aceptar la política de privacidad"),
  consentTutela: z.boolean().refine(val => val === true, "Debes firmar la declaración de tutela"),
  consentMedical: z.boolean().refine(val => val === true, "Debes aceptar el tratamiento de datos médicos"),
  // Firmas opcionales
  consentImage: z.boolean().default(false),

}).superRefine((data, ctx) => {
  // Lógica de validación dinámica: Si es menor, tutores son obligatorios
  if (data.birthDate) {
    const birthYear = new Date(data.birthDate).getFullYear();
    const isSenior = birthYear <= 2007;

    if (!isSenior) {
      if (!data.tutor1Name || data.tutor1Name.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del tutor es requerido para menores",
          path: ["tutor1Name"]
        });
      }
      if (!data.tutor1Dni || data.tutor1Dni.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El DNI del tutor es requerido para menores",
          path: ["tutor1Dni"]
        });
      }
      if (!data.tutor1Email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El email del tutor es requerido para menores",
          path: ["tutor1Email"]
        });
      }
    }
  }

  // Validación de métodos de pago
  if (!data.paymentMethod) {
     ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar un método de pago",
        path: ["paymentMethod"]
     });
  }
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;
