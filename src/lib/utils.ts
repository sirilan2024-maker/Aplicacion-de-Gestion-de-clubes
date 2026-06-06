import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

/**
 * Combina clases de Tailwind de forma segura, resolviendo conflictos de especificidad.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea una fecha en formato legible para humanos en español.
 * @example "14 de mayo, 2024"
 */
export function formatDate(date: Date | string | number) {
  return format(new Date(date), "PPP", { locale: es })
}

/**
 * Retorna el tiempo transcurrido desde una fecha (hace X minutos, etc).
 */
export function formatRelativeTime(date: Date | string | number) {
  return formatDistanceToNow(new Date(date), { 
    addSuffix: true,
    locale: es 
  })
}

/**
 * Traduce el deporte a un formato amigable.
 */
export function translateSport(sport: string): string {
  const sports: Record<string, string> = {
    football: 'Fútbol',
    basketball: 'Baloncesto',
    tennis: 'Tenis',
    volleyball: 'Voleibol',
    padel: 'Pádel',
    other: 'Otro'
  }
  return sports[sport] || sport
}

/**
 * Genera un slug a partir de un texto.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Calcula la edad a partir de una fecha de nacimiento.
 */
export function calculateAge(birthDate: string | Date): number {
  const today = new Date();
  const birthDateObj = new Date(birthDate);
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const m = today.getMonth() - birthDateObj.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  return age;
}
