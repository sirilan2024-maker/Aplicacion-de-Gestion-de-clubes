import * as z from "zod";

const isValidDniNie = (value: string) => {
  if (!value) return true; // Si es opcional o vacío, no validar aquí (se encarga el required)
  const dniNie = value.toUpperCase().replace(/[-_ ]/g, '');
  if (!/^[XYZ]?\d{7,8}[A-Z]$/.test(dniNie)) return false;

  const validLetters = "TRWAGMYFPDXBNJZSQVHLCKE";
  const letter = dniNie.charAt(dniNie.length - 1);
  let numbersStr = dniNie.substring(0, dniNie.length - 1);

  if (numbersStr.startsWith('X')) numbersStr = numbersStr.replace('X', '0');
  else if (numbersStr.startsWith('Y')) numbersStr = numbersStr.replace('Y', '1');
  else if (numbersStr.startsWith('Z')) numbersStr = numbersStr.replace('Z', '2');

  const numbers = parseInt(numbersStr, 10);
  const calculatedLetter = validLetters.charAt(numbers % 23);

  return letter === calculatedLetter;
};

export const registrationSchema = z.object({
  // STEP 1: Personal & Family Data
  playerFirstName: z.string().min(2, "El nombre es requerido"),
  playerLastName: z.string().min(2, "Los apellidos son requeridos"),
  playerDni: z.string().min(1, "El DNI/NIE es requerido"), // Eliminamos la validación estricta de letra
  birthDate: z.string().min(1, "La fecha de nacimiento es requerida"),
  nationality: z.string().min(2, "La nacionalidad es requerida"),
  isForeign: z.boolean().default(false),
  neverFederated: z.boolean().default(false),
  address: z.string().min(5, "El domicilio completo es requerido"),
  city: z.string().min(2, "La localidad es requerida"),
  postalCode: z.string().min(4, "El código postal es requerido"),
  
  // Opcionales para Senior, requeridos para menores (lo validamos con superRefine)
  tutor1Name: z.string().optional(),
  tutor1LastName: z.string().optional(),
  tutor1Dni: z.string().optional(), // Eliminamos la validación estricta
  tutor1Email: z.string().email("Email inválido").optional().or(z.literal('')),
  tutor1Phone: z.string().optional(),
  tutorRelation: z.string().optional(),
  
  // STEP 2: Documentos
  // Las fotos obligatorias las manejaremos en el estado del componente para simplificar,
  // pero podemos requerir flags booleanas para saber si ya se subieron
  docsUploaded: z.boolean().default(false),
  escolarizacion: z.array(z.object({
    centro: z.string().min(2, "El centro es requerido"),
    curso: z.string().min(4, "El curso es requerido"),
  })).optional(),

  // EXTRAS DEL PASO 1 (MÉDICO, DEPORTIVO, FÍSICO)
  playerSip: z.string().optional(),
  
  // Información Médica
  medAlergias: z.string().optional(),
  medEnfermedades: z.string().optional(),
  medMedicacion: z.string().optional(),
  medLesiones: z.string().optional(),
  medOperaciones: z.string().optional(),
  medRelevante: z.string().optional(),
  medObservaciones: z.string().optional(),

  // Perfil Deportivo
  sportClubesAnteriores: z.string().optional(),
  sportPosicionPrincipal: z.string().optional(),
  sportPosicionSecundaria: z.string().optional(),
  sportPosicionGustaria: z.string().optional(),
  sportPieDominante: z.string().optional(),
  sportAnosJugando: z.string().optional(),
  sportObjetivo: z.string().optional(),

  // Datos Físicos
  fisicoAltura: z.string().optional(),
  fisicoPeso: z.string().optional(),
  fisicoTallaPie: z.string().optional(),

  // STEP 3: Cuotas
  wasInClub: z.boolean().default(false),
  paidReservation: z.boolean().default(false),
  paymentMethod: z.enum(["Stripe", "Transferencia", "Contado", ""]).optional(),
  paymentPlan: z.enum(["Total", "Fraccionado", ""]).optional(),

  // STEP 4: Tallas
  sizeCamisetaJuego: z.string().optional(),
  sizePantalonJuego: z.string().optional(),
  sizeChandal: z.string().optional(),
  sizeSudadera: z.string().optional(),
  sizeCamisetaPaseo: z.string().optional(),
  sizePantalonPaseo: z.string().optional(),

  // STEP 5: Colaboración & RGPD
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
      if (!data.tutor1LastName || data.tutor1LastName.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Los apellidos del tutor son requeridos para menores",
          path: ["tutor1LastName"]
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
