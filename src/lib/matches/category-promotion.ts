/**
 * Determina qué categoría inferior tiene permitido convocar un equipo:
 * - Senior -> puede convocar jugadores de categoría Juvenil (+ Juvenil)
 * - Juvenil -> puede convocar jugadores de categoría Cadete (+ Cadete)
 * - Cadete -> puede convocar jugadores de categoría Infantil (+ Infantil)
 * - Infantil y categorías inferiores -> no tienen categoría inferior disponible (null)
 */
export function detectLowerCategoryTarget(teamName?: string, teamCategory?: string): { target: 'Juvenil' | 'Cadete' | 'Infantil'; buttonText: string } | null {
  const name = (teamName || '').toUpperCase();
  const cat = (teamCategory || '').toLowerCase();

  // 1. Senior can summon Juvenil
  if (name.includes('SENIOR') || cat.includes('senior')) {
    return { target: 'Juvenil', buttonText: '+ Juvenil' };
  }
  // 2. Juvenil can summon Cadete
  if (name.includes('JUVENIL') || cat.includes('juvenil')) {
    return { target: 'Cadete', buttonText: '+ Cadete' };
  }
  // 3. Cadete can summon Infantil
  if (name.includes('CADETE') || cat.includes('cadete') || cat.includes('cadet')) {
    return { target: 'Infantil', buttonText: '+ Infantil' };
  }
  // Infantil or below has no lower category eligible for promotion here
  return null;
}
