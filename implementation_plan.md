# Plan de Migración Final (Fase 1: Consolidación)

La base de datos se encuentra en un estado dividido debido a que algunos datos históricos (`partidos`, `entrenamientos`, `estadísticas`) todavía referencian a los IDs de la tabla antigua `equipos`, mientras que los jugadores y el nuevo asistente referencian a la nueva tabla unificada `teams`. 

Esto ha causado que en el dashboard se vean 0 miembros y falten las estadísticas de disciplina, ya que los `partidos` están desvinculados de los jugadores.

Para solucionar esto de forma definitiva y completar la Fase 1, se realizarán los siguientes pasos:

## Proposed Changes

### 1. Migración de Base de Datos (SQL)
Ejecutar un script SQL que:
- Mapea y traslada todos los registros históricos (`partidos`, `events`, `team_coaches`, `club_metrics`) desde los IDs antiguos de `equipos` hacia los nuevos IDs de `teams`.
- Sincroniza los contadores de `members` y `coaches` hacia la tabla `teams`.
- Actualiza las restricciones de clave foránea (foreign keys) para que apunten a `teams`.

### 2. Actualización de Código UI (React)
- Reemplazar todas las consultas `.from('equipos')` por `.from('teams')` en las páginas del dashboard de estadísticas, partidos y entrenamientos.
- Asegurar que la interfaz lee de los nuevos IDs unificados.

## User Review Required
> [!WARNING]
> Este plan unificará toda tu plataforma a la nueva arquitectura moderna soportada por temporadas. Resolverá instantáneamente el problema de los jugadores invisibles y las estadísticas faltantes. ¿Estás de acuerdo en proceder con esta migración final?
