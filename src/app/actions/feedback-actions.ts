"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedContext, canUserAccessPlayer } from "@/lib/auth-helpers";
import { validateTrainingFeedbackInputs } from "@/lib/performance/minutes-service";
import crypto from "crypto";

export interface SubmitTrainingFeedbackOptions {
  token?: string;
  tokenExp?: number;
  discomfort?: {
    hasDiscomfort: boolean;
    zone?: string | null;
    intensity?: number | null;
    notes?: string | null;
  };
}

export type FeedbackFormType = 'wellness' | 'rpe';

/**
 * Valida la firma HMAC de un token individual de feedback móvil.
 * - Requiere un tipo de formulario canónico ('wellness' | 'rpe') y rechaza cualquier otro valor.
 * - Falla de forma cerrada si FEEDBACK_SIGNING_SECRET no está configurado o no es un string válido.
 * - Comprueba la longitud de los buffers antes de crypto.timingSafeEqual para evitar RangeError.
 * - Valida la caducidad temporal (exp) en el servidor.
 */
export async function verifyFeedbackToken(
  formType: FeedbackFormType,
  eventId: string,
  playerId: string,
  exp: number,
  token: string
): Promise<boolean> {
  if (!formType || (formType !== 'wellness' && formType !== 'rpe')) return false;
  if (!token || typeof token !== 'string' || !exp || typeof exp !== 'number') return false;
  if (Date.now() > exp) return false; // Token expirado

  // Fallo cerrado: exigir exclusivamente FEEDBACK_SIGNING_SECRET configurado
  const secret = process.env.FEEDBACK_SIGNING_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    return false; // Sin secreto configurado, rechazo estricto sin excepciones
  }

  try {
    const data = `${formType}:${eventId}:${playerId}:${exp}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');

    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expected);

    // Comparación segura: verificar longitud para evitar excepciones de timingSafeEqual
    if (tokenBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}

export async function submitTrainingFeedback(
  eventId: string,
  playerId: string,
  rpe: number,
  minutes?: number | null,
  options?: SubmitTrainingFeedbackOptions
) {
  try {
    // 1. Validar formato estricto de identificadores UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!eventId || typeof eventId !== 'string' || !uuidRegex.test(eventId)) {
      return { success: false, error: "Identificador de sesión inválido." };
    }
    if (!playerId || typeof playerId !== 'string' || !uuidRegex.test(playerId)) {
      return { success: false, error: "Identificador de jugador inválido." };
    }

    // 2. Validar RPE y Minutos en el servidor
    const validation = validateTrainingFeedbackInputs(rpe, minutes);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }
    const cleanRpe = validation.cleanRpe!;
    const cleanMinutes = validation.cleanMinutes; // puede ser null si no se especificaron

    const adminClient = createAdminClient();

    // 3. Obtener el evento y su equipo/club
    const { data: eventData, error: evError } = await adminClient
      .from('team_events')
      .select('id, team_id, date, teams!inner(id, club_id)')
      .eq('id', eventId)
      .single();

    if (evError || !eventData) {
      return { success: false, error: "La sesión no existe o ha sido eliminada." };
    }

    const eventClubId = (eventData.teams as any)?.club_id;
    const eventTeamId = eventData.team_id;

    // 4. Obtener y validar el jugador y su pertenencia al equipo y club del evento
    const { data: playerData, error: plError } = await adminClient
      .from('players')
      .select('id, team_id, club_id')
      .eq('id', playerId)
      .single();

    if (plError || !playerData) {
      return { success: false, error: "Jugador no encontrado." };
    }

    if (playerData.club_id !== eventClubId || playerData.team_id !== eventTeamId) {
      return { success: false, error: "El jugador no pertenece al equipo de esta sesión." };
    }

    // 5. Verificación de identidad y autorización:
    // Nivel A: Usuario con sesión autenticada válida
    const { context } = await getAuthenticatedContext();
    let isAuthorized = false;

    if (context) {
      const access = await canUserAccessPlayer(adminClient, context, playerId);
      if (access.allowed) {
        isAuthorized = true;
      }
    }

    // Nivel B: Token individual firmado con caducidad
    if (!isAuthorized && options?.token && options?.tokenExp) {
      const tokenValid = await verifyFeedbackToken('rpe', eventId, playerId, options.tokenExp, options.token);
      if (tokenValid) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return {
        success: false,
        error: "Acceso no autorizado. Inicia sesión o utiliza tu enlace personal de convocatoria."
      };
    }

    // 6. Obtener o crear de forma segura las métricas base del club
    let { data: metrics } = await adminClient
      .from('club_metrics')
      .select('id, name')
      .eq('club_id', eventClubId)
      .in('name', ['RPE', 'Minutos de Sesión']);

    let rpeMetricId = metrics?.find(m => m.name === 'RPE')?.id;
    let minMetricId = metrics?.find(m => m.name === 'Minutos de Sesión')?.id;

    if (!rpeMetricId) {
      const { data: newRpe } = await adminClient.from('club_metrics').insert({
        club_id: eventClubId,
        name: 'RPE',
        category: 'Carga Interna',
        module_type: 'rendimiento',
        type: 'number',
        unit: '1-10'
      }).select('id').single();
      if (newRpe) rpeMetricId = newRpe.id;
    }

    if (!minMetricId && cleanMinutes !== null) {
      const { data: newMin } = await adminClient.from('club_metrics').insert({
        club_id: eventClubId,
        name: 'Minutos de Sesión',
        category: 'Carga Externa',
        module_type: 'rendimiento',
        type: 'number',
        unit: 'min'
      }).select('id').single();
      if (newMin) minMetricId = newMin.id;
    }

    if (!rpeMetricId) {
      return { success: false, error: "No se pudo inicializar la métrica de esfuerzo del club." };
    }

    // 7. Upsert seguro de RPE en player_training_metrics
    const { data: existingRpe } = await adminClient
      .from('player_training_metrics')
      .select('id')
      .eq('event_id', eventId)
      .eq('player_id', playerId)
      .eq('metric_id', rpeMetricId)
      .maybeSingle();

    if (existingRpe) {
      await adminClient.from('player_training_metrics').update({ value_number: cleanRpe }).eq('id', existingRpe.id);
    } else {
      await adminClient.from('player_training_metrics').insert({
        event_id: eventId,
        player_id: playerId,
        metric_id: rpeMetricId,
        value_number: cleanRpe
      });
    }

    // 8. Upsert seguro de Minutos en player_training_metrics (solo si se conocen y son válidos, permitiendo 0 explícito)
    if (minMetricId && cleanMinutes !== null && cleanMinutes >= 0) {
      const { data: existingMin } = await adminClient
        .from('player_training_metrics')
        .select('id')
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .eq('metric_id', minMetricId)
        .maybeSingle();

      if (existingMin) {
        await adminClient.from('player_training_metrics').update({ value_number: cleanMinutes }).eq('id', existingMin.id);
      } else {
        await adminClient.from('player_training_metrics').insert({
          event_id: eventId,
          player_id: playerId,
          metric_id: minMetricId,
          value_number: cleanMinutes
        });
      }
    }

    // 9. Persistencia complementaria en player_session_feedback (trazabilidad, validación y molestias)
    try {
      const calculatedLoad = cleanMinutes !== null && cleanMinutes > 0 ? cleanRpe * cleanMinutes : null;
      const { data: existingSessionFeedback } = await adminClient
        .from('player_session_feedback')
        .select('id, validation_status')
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .maybeSingle();

      const sessionPayload: Record<string, any> = {
        club_id: eventClubId,
        event_id: eventId,
        player_id: playerId,
        rpe: cleanRpe,
        minutes_played: cleanMinutes,
        training_load: calculatedLoad,
        has_discomfort: Boolean(options?.discomfort?.hasDiscomfort),
        discomfort_zone: options?.discomfort?.zone || null,
        discomfort_intensity: options?.discomfort?.intensity || null,
        notes: options?.discomfort?.notes || null,
        updated_at: new Date().toISOString()
      };

      if (existingSessionFeedback) {
        // No degradar el estado si ya había sido confirmado por el entrenador
        if (existingSessionFeedback.validation_status !== 'confirmed') {
          sessionPayload.validation_status = 'provisional';
        }
        await adminClient
          .from('player_session_feedback')
          .update(sessionPayload)
          .eq('id', existingSessionFeedback.id);
      } else {
        sessionPayload.validation_status = 'provisional';
        sessionPayload.source = 'player_feedback';
        await adminClient.from('player_session_feedback').insert(sessionPayload);
      }

      // Si reporta molestias sobrevenidas en la sesión, registrar incidencia en player_session_discomfort_incidents
      if (options?.discomfort?.hasDiscomfort && options?.discomfort?.zone && options?.discomfort?.intensity) {
        await adminClient
          .from('player_session_discomfort_incidents')
          .upsert({
            club_id: eventClubId,
            player_id: playerId,
            event_id: eventId,
            timing: 'post_session',
            zone: options.discomfort.zone.trim().slice(0, 100),
            intensity: Math.round(options.discomfort.intensity),
            notes: options.discomfort.notes || 'Molestia comunicada tras la sesión de entrenamiento',
            source: 'session_feedback',
            created_at: new Date().toISOString()
          }, { onConflict: 'player_id,event_id,timing' });
      }
    } catch (feedbackErr) {
      // Registrar log interno sin tumbar la transacción principal si la tabla está pendiente de migración en producción
      console.warn("[submitTrainingFeedback] Error en player_session_feedback (tolerancia a fallos):", feedbackErr);
    }

    // REGLA CRÍTICA: NO mutar la tabla attendance. La asistencia oficial es potestad exclusiva del cuerpo técnico.

    return { success: true };
  } catch (error: any) {
    console.error("[submitTrainingFeedback Secure Error]:", error);
    return { success: false, error: "Ocurrió un error al procesar tu respuesta. Inténtalo más tarde." };
  }
}

export interface SubmitDailyWellnessParams {
  eventId: string;
  playerId: string;
  sleepQuality: number;
  fatigue: number;
  soreness: number;
  stress: number;
  mood: number;
  hasDiscomfort?: boolean;
  zone?: string | null;
  intensity?: number | null;
  notes?: string | null;
  options?: SubmitTrainingFeedbackOptions;
}

/**
 * Server Action segura para registrar el cuestionario de bienestar matinal/previo al entrenamiento.
 * - Valida pertenencia de jugador y evento al club.
 * - Requiere sesión autorizada (canUserAccessPlayer) O token individual HMAC válido con formType 'wellness'.
 * - Aplica fecha oficial peninsular de la sesión o España peninsular (getSpainDateString).
 * - En doble sesión, preserva la línea base en player_daily_wellness e inserta la molestia en player_session_discomfort_incidents.
 */
export async function submitDailyWellness(params: SubmitDailyWellnessParams) {
  try {
    const { eventId, playerId, sleepQuality, fatigue, soreness, stress, mood, hasDiscomfort, zone, intensity, notes, options } = params;

    // 1. Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!eventId || !uuidRegex.test(eventId)) {
      return { success: false, error: "Identificador de sesión inválido." };
    }
    if (!playerId || !uuidRegex.test(playerId)) {
      return { success: false, error: "Identificador de jugador inválido." };
    }

    // 2. Importar y validar inputs de bienestar
    const { validateWellnessInput, resolveDoubleSessionWellness, getSpainDateString } = await import('@/lib/performance/wellness-service');
    const validation = validateWellnessInput({
      sleepQuality,
      fatigue,
      soreness,
      stress,
      mood,
      hasDiscomfort,
      zone,
      intensity,
      notes,
    });

    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(". ") };
    }

    const adminClient = createAdminClient();

    // 3. Obtener el evento y su equipo/club
    const { data: eventData, error: evError } = await adminClient
      .from('team_events')
      .select('id, team_id, date, teams!inner(id, club_id)')
      .eq('id', eventId)
      .single();

    if (evError || !eventData) {
      return { success: false, error: "La sesión no existe o ha sido eliminada." };
    }

    const eventClubId = (eventData.teams as any)?.club_id;
    const eventTeamId = eventData.team_id;

    // 4. Obtener y validar el jugador y su pertenencia al equipo y club del evento
    const { data: playerData, error: plError } = await adminClient
      .from('players')
      .select('id, team_id, club_id')
      .eq('id', playerId)
      .single();

    if (plError || !playerData) {
      return { success: false, error: "Jugador no encontrado." };
    }

    if (playerData.club_id !== eventClubId || playerData.team_id !== eventTeamId) {
      return { success: false, error: "El jugador no pertenece al equipo de esta sesión." };
    }

    // 5. Verificación de identidad y autorización
    const { context } = await getAuthenticatedContext();
    let isAuthorized = false;

    if (context) {
      const access = await canUserAccessPlayer(adminClient, context, playerId);
      if (access.allowed) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && options?.token && options?.tokenExp) {
      const tokenValid = await verifyFeedbackToken('wellness', eventId, playerId, options.tokenExp, options.token);
      if (tokenValid) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return {
        success: false,
        error: "Acceso no autorizado. Inicia sesión o utiliza tu enlace personal de bienestar."
      };
    }

    // 6. Determinar fecha canónica en huso peninsular español
    const sessionDate = getSpainDateString(eventData.date || new Date());

    // 7. Comprobar si ya existe una respuesta basal previa para este jugador en esta fecha
    const { data: existingBaseline } = await adminClient
      .from('player_daily_wellness')
      .select('*')
      .eq('player_id', playerId)
      .eq('date', sessionDate)
      .maybeSingle();

    let baselineToUse = existingBaseline;

    if (!baselineToUse) {
      // Intento de inserción de la respuesta basal del día
      const cleanData = validation.cleanData!;
      const { error: insertErr } = await adminClient.from('player_daily_wellness').insert({
        club_id: eventClubId,
        player_id: playerId,
        date: sessionDate,
        sleep_quality: cleanData.ratings.sleepQuality,
        fatigue: cleanData.ratings.fatigue,
        soreness: cleanData.ratings.soreness,
        stress: cleanData.ratings.stress,
        mood: cleanData.ratings.mood,
        wellness_score: cleanData.rawScore, // Suma bruta de referencia
        has_discomfort: cleanData.discomfort.hasDiscomfort,
        discomfort_zone: cleanData.discomfort.zone,
        discomfort_intensity: cleanData.discomfort.intensity,
        notes: cleanData.discomfort.notes,
        source_event_id: eventId,
        response_status: 'completed',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (insertErr) {
        // Gestión de carrera concurrente: si falló por violación de clave única (código 23505) en (player_id, date)
        const isUniqueViolation = insertErr.code === '23505' || insertErr.message?.includes('uq_player_daily_wellness_player_date');
        if (isUniqueViolation) {
          // 1. Volver a consultar la respuesta basal insertada concurrentemente
          const { data: concurrentBaseline, error: reloadErr } = await adminClient
            .from('player_daily_wellness')
            .select('*')
            .eq('player_id', playerId)
            .eq('date', sessionDate)
            .maybeSingle();

          if (!concurrentBaseline || reloadErr) {
            console.error("[submitDailyWellness] Conflicto 23505 pero no se pudo recuperar la fila basal:", reloadErr);
            return { success: false, error: "Conflicto al registrar bienestar. Inténtalo nuevamente." };
          }

          // Asignar la línea base concurrente para resolverla sin sobrescribir
          baselineToUse = concurrentBaseline;
        } else {
          console.error("[submitDailyWellness Insert Error]:", insertErr);
          return { success: false, error: "No fue posible registrar el cuestionario de bienestar." };
        }
      } else {
        // Inserción matinal exitosa: si reportó molestia matinal, registrar también en player_session_discomfort_incidents
        if (cleanData.discomfort.hasDiscomfort && cleanData.discomfort.zone && cleanData.discomfort.intensity) {
          await adminClient.from('player_session_discomfort_incidents').upsert({
            club_id: eventClubId,
            player_id: playerId,
            event_id: eventId,
            timing: 'pre_session',
            zone: cleanData.discomfort.zone,
            intensity: cleanData.discomfort.intensity,
            notes: cleanData.discomfort.notes || 'Molestia comunicada en bienestar previo',
            source: 'wellness_flow',
            created_at: new Date().toISOString()
          }, { onConflict: 'player_id,event_id,timing' });
        }
      }
    }

    // Si ya existía línea base previa (o fue resuelta tras el conflicto concurrente 23505)
    if (baselineToUse) {
      // Doble sesión: resolver sin sobrescribir la línea base
      const doubleSessionResolution = resolveDoubleSessionWellness(baselineToUse as any, {
        eventId,
        hasNewDiscomfort: Boolean(hasDiscomfort),
        newDiscomfortZone: zone,
        newDiscomfortIntensity: intensity,
        notes
      });

      if (doubleSessionResolution.action === 'append_discomfort_update' && doubleSessionResolution.incidentToPersist) {
        const inc = doubleSessionResolution.incidentToPersist;
        await adminClient.from('player_session_discomfort_incidents').upsert({
          club_id: eventClubId,
          player_id: playerId,
          event_id: inc.eventId,
          timing: inc.timing,
          zone: inc.zone,
          intensity: inc.intensity,
          notes: inc.notes,
          source: inc.source,
          created_at: new Date().toISOString()
        }, { onConflict: 'player_id,event_id,timing' });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("[submitDailyWellness Secure Error]:", error);
    return { success: false, error: "Ocurrió un error al procesar tu cuestionario de bienestar." };
  }
}
