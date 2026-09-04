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

/**
 * Genera un PIN alfanumérico para vincular tutores a jugadores.
 */
export function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Determina si un equipo o jugador pertenece a categoría formativa (hasta Infantil 2º año / 14 años).
 * Excluye explícitamente: Cadete, Juvenil, Senior, Sub-15 en adelante y mayores de 14 años.
 */
export function isFormativeCategory(teamCategory?: string | null, teamName?: string | null, birthDate?: string | Date | null): boolean {
  // 1. Analizar texto de categoría o nombre del equipo
  const combinedText = `${teamCategory || ''} ${teamName || ''}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  if (combinedText) {
    // Si contiene términos no formativos explícitos -> FALSE
    const nonFormativeKeywords = [
      'cadet', 'cadete', 'u15', 'u16', 'sub-15', 'sub-16', 'sub 15', 'sub 16',
      'juvenil', 'u17', 'u18', 'u19', 'sub-17', 'sub-18', 'sub-19', 'sub 17', 'sub 18', 'sub 19',
      'senior', 'amateur', 'primer equipo', '1er equipo', 'veteran', 'filial', 'u20', 'u21', 'u23', 'sub-20', 'sub-21', 'sub-23'
    ];

    for (const kw of nonFormativeKeywords) {
      if (combinedText.includes(kw)) {
        return false;
      }
    }

    // Si contiene términos formativos explícitos -> TRUE
    const formativeKeywords = [
      'infantil', 'alevin', 'benjamin', 'prebenjamin', 'querubin', 'escola', 'escuela', 'iniciacion', 'minibenjamin',
      'u14', 'u13', 'u12', 'u11', 'u10', 'u9', 'u8', 'u7', 'u6',
      'sub-14', 'sub-13', 'sub-12', 'sub-11', 'sub-10', 'sub-9', 'sub-8', 'sub-7', 'sub-6'
    ];

    for (const kw of formativeKeywords) {
      if (combinedText.includes(kw)) {
        return true;
      }
    }
  }

  // 2. Si no se puede deducir por nombre/categoría, verificar por edad de nacimiento
  if (birthDate) {
    const age = calculateAge(birthDate);
    if (age > 14) {
      return false; // Mayor de 14 años = Cadete o superior
    }
  }

  // Por defecto si no coincide con no formativos
  return true;
}

/**
 * Retorna el nombre de pila y únicamente el primer apellido del jugador
 * para que encaje perfectamente en pantallas móviles y no desborde.
 * Respeta partículas compuestas como 'de la Rosa', 'del Campo', 'de Lucas'.
 * @example "Carlos" + "García Martínez" -> "Carlos García"
 * @example "Álvaro" + "de la Cruz Sánchez" -> "Álvaro de la Cruz"
 */
export function getFirstNameAndFirstSurname(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  if (!last) return first;
  
  const parts = last.split(/\s+/);
  let firstSurname = parts[0] || '';
  
  if (parts.length >= 3 && parts[0].toLowerCase() === 'de' && parts[1].toLowerCase() === 'la') {
    firstSurname = `${parts[0]} ${parts[1]} ${parts[2]}`;
  } else if (parts.length >= 2 && (parts[0].toLowerCase() === 'de' || parts[0].toLowerCase() === 'del')) {
    firstSurname = `${parts[0]} ${parts[1]}`;
  }
  
  return `${first} ${firstSurname}`.trim();
}

