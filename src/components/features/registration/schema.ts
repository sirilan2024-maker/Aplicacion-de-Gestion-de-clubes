import * as z from "zod";

// Configuración global de Zod en Español para eliminar cualquier mensaje genérico 'Invalid input'
z.setErrorMap((issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.received === 'undefined' || issue.received === 'null') {
      return { message: 'Este campo es obligatorio' };
    }
    return { message: 'Por favor, introduce un dato válido' };
  }
  if (issue.code === z.ZodIssueCode.custom) {
    if (!issue.message || issue.message === 'Invalid input') {
      return { message: 'Por favor, completa este campo obligatorio' };
    }
    return { message: issue.message };
  }
  if (issue.code === z.ZodIssueCode.invalid_string) {
    if (issue.validation === 'email') return { message: 'Introduce un correo electrónico válido' };
    if (issue.validation === 'url') return { message: 'Introduce una URL válida' };
    return { message: 'Formato no válido' };
  }
  if (issue.code === z.ZodIssueCode.too_small) {
    return { message: `Debe tener al menos ${issue.minimum} caracteres` };
  }
  if (issue.code === z.ZodIssueCode.too_big) {
    return { message: `Debe tener como máximo ${issue.maximum} caracteres` };
  }
  if (ctx.defaultError === 'Invalid input') {
    return { message: 'Por favor, completa este campo obligatorio' };
  }
  return { message: ctx.defaultError };
});

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
  pinCode: z.string().optional(),
  existingPlayerId: z.string().optional(),
  playerFirstName: z.string().optional(),
  playerLastName: z.string().optional(),
  playerDni: z.string().optional(), // Puede ser opcional si es muy pequeño, o validarlo si es senior
  birthDate: z.string().optional(),
  nationality: z.string().optional(),
  isForeign: z.boolean().default(false),
  neverFederated: z.boolean().default(false),
  isSeniorSelection: z.enum(["senior", "minor"]).default("minor"), // Kept for backwards compatibility
  isSeniorTeam: z.any().transform(val => val === true || val === "true"), // Flag from the form wrapper
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  
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
  uploadedFiles: z.array(z.object({
    label: z.string(),
    base64: z.string()
  })).default([]),
  escolarizacion: z.array(z.object({
    centro: z.string().min(2, "El centro es requerido"),
    curso: z.string().min(4, "El curso es requerido"),
  })).optional(),
  dniFileBase64: z.string().optional(),
  photoFileBase64: z.string().optional(),

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
  paymentMethod: z.enum(["Stripe", "Transferencia", "Contado", ""]).optional().nullable(),
  paymentPlan: z.enum(["Total", "Fraccionado", ""]).optional().nullable(),

  // STEP 4: Tallas
  sizeCamisetaJuego: z.string().optional(),
  sizePantalonJuego: z.string().optional(),
  sizeChandal: z.string().optional(),
  sizeSudadera: z.string().optional(),
  sizeCamisetaPaseo: z.string().optional(),
  sizePantalonPaseo: z.string().optional(),
  sizeMedias: z.string().optional(),
  sizeMochila: z.string().optional(),

  // STEP 5: Colaboración & RGPD
  volunteerInterest: z.string().optional(),
  sponsorCompanyName: z.string().optional(),
  sponsorContactName: z.string().optional(),
  sponsorPhone: z.string().optional(),
  // Firmas legales obligatorias
  consentRgpd: z.any().transform(v => v === true || v === "true" || v === "on").refine(val => val === true, "Debes leer y aceptar la política de privacidad"),
  consentTutela: z.any().transform(v => v === true || v === "true" || v === "on").optional(),
  consentMedical: z.any().transform(v => v === true || v === "true" || v === "on").refine(val => val === true, "Debes leer y aceptar el tratamiento de datos médicos"),
  consentImage: z.any().transform(v => v === true || v === "true" || v === "on").refine(val => val === true, "Debes leer y aceptar la cesión de derechos de imagen"),

  // Autenticación (Opcional en el esquema para permitir reutilizar el form desde dentro)
  password: z.string().optional(),
  confirmPassword: z.string().optional(),

}).superRefine((data, ctx) => {
  const year = data.birthDate ? new Date(data.birthDate).getFullYear() : 9999;
  const isSenior = data.isSeniorTeam === true || data.isSeniorTeam === "true" || data.isSeniorSelection === "senior";
  const isAdult = isSenior || (year !== 9999 && !isNaN(year) && year <= 2007);

  if (!data.tutor1Email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El email de contacto es requerido", path: ["tutor1Email"] });
  }

  if (!isAdult) {
      if (!data.consentTutela) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debes leer y aceptar la declaración de tutela", path: ["consentTutela"] });
      }
  }

  // Si no es senior y no viene de ficha existente precargada, obligamos la fecha de nacimiento
  if (!isSenior && !data.existingPlayerId && (!data.birthDate || data.birthDate.length < 4)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La fecha de nacimiento es requerida", path: ["birthDate"] });
  }

  // Validación de métodos de pago (solo si no es senior team)
  if (!isSenior && !data.paymentMethod) {
     ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe seleccionar un método de pago", path: ["paymentMethod"] });
  }

  // Validación de contraseñas
  if (data.password !== undefined && data.password !== null && data.password !== "") {
    if (data.password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La contraseña debe tener al menos 6 caracteres",
        path: ["password"]
      });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"]
      });
    }
  }
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;
