import { useMemo } from 'react';

/**
 * Hook para determinar si una vista debe estar en modo Solo Lectura
 * basándose en la temporada actual y los permisos del usuario.
 * 
 * @param selectedSeason La temporada actualmente seleccionada en el contexto/UI
 * @param activeSeason La temporada marcada como activa en la base de datos
 * @param isAdmin Si el usuario actual tiene rol de admin
 * @returns boolean `true` si se permite la edición, `false` si debe ser solo lectura
 */
export function useIsActiveSeason(
  selectedSeason: { id: string, is_active: boolean, name?: string } | null,
  activeSeason: { id: string } | null,
  isAdmin: boolean = false
) {
  return useMemo(() => {
    if (!selectedSeason) return false;

    // 1. Si la temporada está activa, siempre es editable
    if (selectedSeason.is_active || (activeSeason && selectedSeason.id === activeSeason.id)) {
      return true;
    }

    // 2. Si NO está activa, comprobamos si tiene la "Llave Maestra" (candado abierto 🔓)
    // El administrador puede reabrir temporadas cerradas. Cuando lo hace,
    // se añade " 🔓" al nombre de la temporada.
    const hasMasterKey = selectedSeason.name?.includes('🔓');

    // 3. SOLO los administradores pueden editar una temporada reabierta
    if (hasMasterKey && isAdmin) {
      return true;
    }

    // En cualquier otro caso (temporada pasada/cerrada), modo Solo Lectura
    return false;
  }, [selectedSeason, activeSeason, isAdmin]);
}
