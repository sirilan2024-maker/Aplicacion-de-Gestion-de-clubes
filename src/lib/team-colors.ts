/**
 * Utility to provide consistent, distinct and accessible colors for club teams.
 */

export const DEFAULT_TEAM_PALETTE: string[] = [
  '#2563eb', // Azul Sporting / Senior
  '#7c3aed', // Púrpura / Juvenil A
  '#0284c7', // Azul Celeste / Juvenil B
  '#059669', // Verde Esmeralda / Cadete A
  '#d97706', // Ámbar / Cadete B
  '#dc2626', // Rojo Carmesí / Infantil A
  '#0891b2', // Cian / Infantil B
  '#ea580c', // Naranja
  '#4f46e5', // Índigo
  '#16a34a', // Verde Bosque
  '#db2777', // Rosa
  '#475569', // Pizarra
];

const KNOWN_TEAM_COLORS: Record<string, string> = {
  'SENIOR': '#2563eb',     // Azul
  'JUVENIL A': '#7c3aed',  // Púrpura
  'JUVENIL B': '#0284c7',  // Celeste
  'CADETE A': '#059669',   // Esmeralda
  'CADETE B': '#d97706',   // Ámbar
  'INFANTIL A': '#dc2626', // Rojo
  'INFANTIL B': '#0891b2', // Cian
};

export function getTeamHexColor(
  team?: { id?: string; name?: string; color?: string | null } | null,
  fallbackIndex?: number
): string {
  // 1. Si el equipo tiene color asignado explícitamente en BD y no está vacío
  if (team?.color && typeof team.color === 'string' && team.color.trim() !== '') {
    const trimmed = team.color.trim();
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  }

  // 2. Si el nombre coincide con las categorías conocidas de Sporting Saladar
  if (team?.name) {
    const upper = team.name.toUpperCase();
    for (const [key, color] of Object.entries(KNOWN_TEAM_COLORS)) {
      if (upper.includes(key)) return color;
    }
  }

  // 3. Si se proporciona índice de orden
  if (typeof fallbackIndex === 'number' && fallbackIndex >= 0) {
    return DEFAULT_TEAM_PALETTE[fallbackIndex % DEFAULT_TEAM_PALETTE.length];
  }

  // 4. Hash determinista sobre el ID del equipo
  if (team?.id) {
    let hash = 0;
    for (let i = 0; i < team.id.length; i++) {
      hash = team.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % DEFAULT_TEAM_PALETTE.length;
    return DEFAULT_TEAM_PALETTE[idx];
  }

  return '#2563eb';
}
