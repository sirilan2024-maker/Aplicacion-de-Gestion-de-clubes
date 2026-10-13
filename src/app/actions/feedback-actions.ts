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

export type PersistenceStatus = 'confirmed' | 'partial' | 'uncertain' | 'failed';

export interface SubmitFeedbackResult {
  success: boolean;
  persistenceStatus: PersistenceStatus;
  savedTargets?: {
    trainingMetrics: boolean;
    sessionFeedback: boolean;
    discomfortIncident: boolean;
  };
  warning?: string;
  error?: string;
}

export interface SubmitWellnessResult {
  success: boolean;
  persistenceStatus: PersistenceStatus;
  savedTargets?: {
    dailyWellness: boolean;
    discomfortIncident: boolean;
  };
  warning?: string;
  error?: string;
}

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
): Promise<SubmitFeedbackResult> {
  let rpeSaved = false;
  let minSaved = false;
  let sessionFeedbackSaved = false;
  let discomfortIncidentSaved = false;

  try {
    // 1. Validar formato estricto de identificadores UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!eventId || typeof eventId !== 'string' || !uuidRegex.test(eventId)) {
      return { success: false, persistenceStatus: 'failed', error: "Identificador de sesión inválido." };
    }
    if (!playerId || typeof playerId !== 'string' || !uuidRegex.test(playerId)) {
      return { success: false, persistenceStatus: 'failed', error: "Identificador de jugador inválido." };
    }

    // 2. Validar RPE y Minutos en el servidor
    const validation = validateTrainingFeedbackInputs(rpe, minutes);
    if (!validation.isValid) {
      return { success: false, persistenceStatus: 'failed', error: validation.error };
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
      return { success: false, persistenceStatus: 'failed', error: "La sesión no existe o ha sido eliminada." };
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
      return { success: false, persistenceStatus: 'failed', error: "Jugador no encontrado." };
    }

    if (playerData.club_id !== eventClubId || playerData.team_id !== eventTeamId) {
      return { success: false, persistenceStatus: 'failed', error: "El jugador no pertenece al equipo de esta sesión." };
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
        persistenceStatus: 'failed',
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
      return { success: false, persistenceStatus: 'failed', error: "No se pudo inicializar la métrica de esfuerzo del club." };
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
      const { error: updRpeErr } = await adminClient.from('player_training_metrics').update({ value_number: cleanRpe }).eq('id', existingRpe.id);
      if (updRpeErr) {
        console.error("[submitTrainingFeedback] Error al actualizar RPE:", updRpeErr.message);
        return { success: false, persistenceStatus: 'failed', error: "No se pudo actualizar la métrica de esfuerzo." };
      }
      rpeSaved = true;
    } else {
      const { error: insRpeErr } = await adminClient.from('player_training_metrics').insert({
        event_id: eventId,
        player_id: playerId,
        metric_id: rpeMetricId,
        value_number: cleanRpe
      });
      if (insRpeErr) {
        console.error("[submitTrainingFeedback] Error al insertar RPE:", insRpeErr.message);
        return { success: false, persistenceStatus: 'failed', error: "No se pudo registrar la métrica de esfuerzo." };
      }
      rpeSaved = true;
    }

    // 8. Upsert seguro de Minutos en player_training_metrics (solo si se conocen y son válidos, permitiendo 0 explícito)
    let minWarning: string | undefined;
    if (minMetricId && cleanMinutes !== undefined && cleanMinutes !== null && cleanMinutes >= 0) {
      const { data: existingMin } = await adminClient
        .from('player_training_metrics')
        .select('id')
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .eq('metric_id', minMetricId)
        .maybeSingle();

      if (existingMin) {
        const { error: updMinErr } = await adminClient.from('player_training_metrics').update({ value_number: cleanMinutes }).eq('id', existingMin.id);
        if (updMinErr) {
          console.warn("[submitTrainingFeedback] Error actualizando minutos:", updMinErr.message);
          minWarning = "El RPE se guardó, pero los minutos de participación no pudieron actualizarse.";
        } else {
          minSaved = true;
        }
      } else {
        const { error: insMinErr } = await adminClient.from('player_training_metrics').insert({
          event_id: eventId,
          player_id: playerId,
          metric_id: minMetricId,
          value_number: cleanMinutes
        });
        if (insMinErr) {
          console.warn("[submitTrainingFeedback] Error insertando minutos:", insMinErr.message);
          minWarning = "El RPE se guardó, pero los minutos de participación no pudieron insertarse.";
        } else {
          minSaved = true;
        }
      }
    }

    // 9. Persistencia complementaria en player_session_feedback (trazabilidad, validación y molestias)
    let feedbackWarning: string | undefined;
    try {
      const calculatedLoad = cleanMinutes !== undefined && cleanMinutes !== null && cleanMinutes > 0 ? cleanRpe * cleanMinutes : null;
      const { data: existingSessionFeedback, error: fetchFeedbackErr } = await adminClient
        .from('player_session_feedback')
        .select('id, validation_status')
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .maybeSingle();

      if (fetchFeedbackErr) {
        console.warn("[submitTrainingFeedback] player_session_feedback no disponible:", fetchFeedbackErr.message);
        feedbackWarning = "La valoración principal se guardó, pero la autoevaluación detallada está pendiente de migración.";
      } else {
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
          const { error: updFeedErr } = await adminClient
            .from('player_session_feedback')
            .update(sessionPayload)
            .eq('id', existingSessionFeedback.id);

          if (updFeedErr) {
            console.warn("[submitTrainingFeedback] Error actualizando player_session_feedback:", updFeedErr.message);
            feedbackWarning = "El esfuerzo se guardó, pero la ficha de sesión no pudo actualizarse.";
          } else {
            sessionFeedbackSaved = true;
          }
        } else {
          sessionPayload.validation_status = 'provisional';
          sessionPayload.source = 'player_feedback';
          const { error: insFeedErr } = await adminClient.from('player_session_feedback').insert(sessionPayload);
          if (insFeedErr) {
            console.warn("[submitTrainingFeedback] Error insertando player_session_feedback:", insFeedErr.message);
            feedbackWarning = "El esfuerzo se guardó, pero la ficha de sesión no pudo insertarse.";
          } else {
            sessionFeedbackSaved = true;
          }
        }

        // Si reporta molestias sobrevenidas en la sesión, registrar incidencia en player_session_discomfort_incidents
        if (options?.discomfort?.hasDiscomfort && options?.discomfort?.zone && options?.discomfort?.intensity) {
          const { error: incErr } = await adminClient
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

          if (incErr) {
            console.warn("[submitTrainingFeedback] Error registrando molestia post_session:", incErr.message);
            feedbackWarning = feedbackWarning 
              ? `${feedbackWarning} La molestia no se pudo registrar.`
              : "La valoración se guardó, pero la molestia reportada no se pudo asociar.";
          } else {
            discomfortIncidentSaved = true;
          }
        }
      }
    } catch (feedbackErr: any) {
      console.warn("[submitTrainingFeedback] Excepción en player_session_feedback (tolerancia a fallos):", feedbackErr?.message || feedbackErr);
      feedbackWarning = "Métricas registradas; tabla de sesión complementaria pendiente.";
    }

    // REGLA CRÍTICA: NO mutar la tabla attendance. La asistencia oficial es potestad exclusiva del cuerpo técnico.

    const requiresDiscomfort = Boolean(options?.discomfort?.hasDiscomfort);
    const hasDiscomfortPending = requiresDiscomfort && !discomfortIncidentSaved;
    const isPartial = Boolean(minWarning || feedbackWarning || !sessionFeedbackSaved || hasDiscomfortPending);
    const persistenceStatus: PersistenceStatus = isPartial ? 'partial' : 'confirmed';
    const warning = minWarning || feedbackWarning || (isPartial ? "Persistencia completada parcialmente." : undefined);

    return {
      success: true,
      persistenceStatus,
      savedTargets: {
        trainingMetrics: rpeSaved,
        sessionFeedback: sessionFeedbackSaved,
        discomfortIncident: discomfortIncidentSaved
      },
      warning
    };
  } catch (error: any) {
    console.error("[submitTrainingFeedback Secure Error]:", error?.message || error);
    const isUncertain = rpeSaved || minSaved;
    return {
      success: false,
      persistenceStatus: isUncertain ? 'uncertain' : 'failed',
      error: isUncertain
        ? "La operación no se completó íntegramente. Por seguridad, verifica con tu cuerpo técnico antes de reenviar."
        : "Ocurrió un error al procesar tu respuesta. Inténtalo más tarde."
    };
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
export async function submitDailyWellness(params: SubmitDailyWellnessParams): Promise<SubmitWellnessResult> {
  let baselineSaved = false;
  let discomfortSaved = false;
  let discomfortWarning: string | undefined;

  try {
    const { eventId, playerId, sleepQuality, fatigue, soreness, stress, mood, hasDiscomfort, zone, intensity, notes, options } = params;

    // 1. Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!eventId || !uuidRegex.test(eventId)) {
      return { success: false, persistenceStatus: 'failed', error: "Identificador de sesión inválido." };
    }
    if (!playerId || !uuidRegex.test(playerId)) {
      return { success: false, persistenceStatus: 'failed', error: "Identificador de jugador inválido." };
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
      return { success: false, persistenceStatus: 'failed', error: validation.errors.join(". ") };
    }

    const adminClient = createAdminClient();

    // 3. Obtener el evento y su equipo/club
    const { data: eventData, error: evError } = await adminClient
      .from('team_events')
      .select('id, team_id, date, teams!inner(id, club_id)')
      .eq('id', eventId)
      .single();

    if (evError || !eventData) {
      return { success: false, persistenceStatus: 'failed', error: "La sesión no existe o ha sido eliminada." };
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
      return { success: false, persistenceStatus: 'failed', error: "Jugador no encontrado." };
    }

    if (playerData.club_id !== eventClubId || playerData.team_id !== eventTeamId) {
      return { success: false, persistenceStatus: 'failed', error: "El jugador no pertenece al equipo de esta sesión." };
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
        persistenceStatus: 'failed',
        error: "Acceso no autorizado. Inicia sesión o utiliza tu enlace personal de bienestar."
      };
    }

    // 6. Determinar fecha canónica en huso peninsular español y verificar que sea el día de la sesión
    const todaySpain = getSpainDateString(new Date());
    const sessionDate = getSpainDateString(eventData.date || new Date());

    // Regla de Integridad: El bienestar previo solo puede completarse en la fecha local exacta de la sesión
    if (sessionDate !== todaySpain) {
      const isFuture = sessionDate > todaySpain;
      return {
        success: false,
        persistenceStatus: 'failed',
        error: isFuture
          ? `El cuestionario de bienestar previo se habilitará el mismo día de la sesión (${sessionDate}).`
          : `El cuestionario de bienestar previo ha expirado para esta sesión pasada (${sessionDate}).`
      };
    }

    // 7. Comprobar si ya existe una respuesta basal previa para este jugador en esta fecha
    const { data: existingBaseline, error: fetchBaselineErr } = await adminClient
      .from('player_daily_wellness')
      .select('*')
      .eq('player_id', playerId)
      .eq('date', sessionDate)
      .maybeSingle();

    if (fetchBaselineErr) {
      console.warn("[submitDailyWellness] Error al consultar player_daily_wellness:", fetchBaselineErr.message);
    }

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
            console.error("[submitDailyWellness] Conflicto 23505 pero no se pudo recuperar la fila basal:", reloadErr?.message || reloadErr);
            return { success: false, persistenceStatus: 'uncertain', error: "Conflicto de concurrencia al registrar bienestar. Inténtalo nuevamente." };
          }

          // Asignar la línea base concurrente para resolverla sin sobrescribir
          baselineToUse = concurrentBaseline;
          baselineSaved = true;
        } else {
          console.error("[submitDailyWellness Insert Error]:", insertErr.message);
          return { success: false, persistenceStatus: 'failed', error: "No fue posible registrar el cuestionario de bienestar." };
        }
      } else {
        baselineSaved = true;
        // Inserción matinal exitosa: si reportó molestia matinal, registrar también en player_session_discomfort_incidents
        if (cleanData.discomfort.hasDiscomfort && cleanData.discomfort.zone && cleanData.discomfort.intensity) {
          try {
            const { error: incErr } = await adminClient.from('player_session_discomfort_incidents').upsert({
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

            if (incErr) {
              console.warn("[submitDailyWellness] Error registrando molestia pre_session:", incErr.message);
              discomfortWarning = "El bienestar basal se guardó, pero la molestia reportada no pudo asociarse a la sesión.";
            } else {
              discomfortSaved = true;
            }
          } catch (incEx: any) {
            console.warn("[submitDailyWellness] Excepción registrando molestia pre_session:", incEx?.message || incEx);
            discomfortWarning = "El bienestar basal se guardó, pero la tabla de molestias complementaria está pendiente.";
          }
        }
      }
    } else {
      baselineSaved = true;
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
        try {
          const { error: incErr } = await adminClient.from('player_session_discomfort_incidents').upsert({
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

          if (incErr) {
            console.warn("[submitDailyWellness] Error registrando molestia en doble sesión:", incErr.message);
            discomfortWarning = "Se confirmó la línea base matinal, pero la nueva molestia no pudo registrarse.";
          } else {
            discomfortSaved = true;
          }
        } catch (incEx: any) {
          console.warn("[submitDailyWellness] Excepción registrando molestia en doble sesión:", incEx?.message || incEx);
          discomfortWarning = "Se confirmó la línea base matinal, pero la tabla de molestias no está disponible.";
        }
      }
    }

    const hasDiscomfortReported = Boolean(hasDiscomfort);
    const hasDiscomfortPending = hasDiscomfortReported && !discomfortSaved;
    const isPartial = Boolean(discomfortWarning || hasDiscomfortPending);
    const persistenceStatus: PersistenceStatus = isPartial ? 'partial' : 'confirmed';
    const warning = discomfortWarning || (isPartial ? "Persistencia completada parcialmente." : undefined);

    return {
      success: true,
      persistenceStatus,
      savedTargets: {
        dailyWellness: baselineSaved,
        discomfortIncident: discomfortSaved
      },
      warning
    };
  } catch (error: any) {
    console.error("[submitDailyWellness Secure Error]:", error?.message || error);
    const isUncertain = baselineSaved;
    return {
      success: false,
      persistenceStatus: isUncertain ? 'uncertain' : 'failed',
      error: isUncertain
        ? "La operación no se completó íntegramente. Por seguridad, verifica con tu cuerpo técnico antes de reenviar."
        : "Ocurrió un error al procesar tu cuestionario de bienestar. Inténtalo más tarde."
    };
  }
}

export interface SanitizedPlayerWellnessEntry {
  playerId: string;
  date: string;
  sleepQuality: number;
  fatigue: number;
  soreness: number;
  stress: number;
  mood: number;
  wellnessScore: number | null;
  submittedAt?: string;
  // Molestias: solo presentes si el usuario está autorizado en el servidor
  hasDiscomfort: boolean;
  discomfortZone?: string | null;
  discomfortIntensity?: number | null;
  notes?: string | null;
  isDiscomfortRedacted?: boolean;
}

export interface GetTeamWellnessSummaryResult {
  success: boolean;
  canViewDiscomfort: boolean;
  entries: SanitizedPlayerWellnessEntry[];
  error?: string;
}

/**
 * Server Action para consultar el bienestar del equipo protegiendo datos sensibles en origen.
 * Si el usuario no tiene rol técnico o médico ('admin', 'coordinador', 'preparador_fisico', 'fisio', 'entrenador', 'coach'),
 * los campos discomfortZone, discomfortIntensity y notes se omiten en el servidor (isDiscomfortRedacted: true).
 */
export async function getAuthorizedTeamWellnessSummary(
  teamId: string,
  date: string
): Promise<GetTeamWellnessSummaryResult> {
  try {
    const { context } = await getAuthenticatedContext();
    if (!context || !context.user) {
      return { success: false, canViewDiscomfort: false, entries: [], error: "No autenticado." };
    }

    const adminClient = createAdminClient();

    // 1. Obtener club del equipo y verificar pertenencia del usuario
    const { data: teamData, error: teamErr } = await adminClient
      .from('teams')
      .select('id, club_id')
      .eq('id', teamId)
      .single();

    if (teamErr || !teamData) {
      return { success: false, canViewDiscomfort: false, entries: [], error: "Equipo no encontrado." };
    }

    if (context.profile.club_id !== teamData.club_id) {
      return { success: false, canViewDiscomfort: false, entries: [], error: "Acceso denegado a este club." };
    }

    // 2. Determinar autorización para ver molestias
    const role = context.profile.role || '';
    const isStaffOrMedic = ['admin', 'superadmin', 'coordinador', 'metodologo', 'preparador_fisico', 'fisio'].includes(role);
    
    // Entrenadores: verificar asignación al equipo
    let isAssignedCoach = false;
    if (['entrenador', 'coach'].includes(role)) {
      const { data: tc } = await adminClient
        .from('team_coaches')
        .select('id')
        .eq('team_id', teamId)
        .eq('profile_id', context.user.id)
        .maybeSingle();

      const { data: t } = await adminClient
        .from('teams')
        .select('id')
        .eq('id', teamId)
        .eq('coach_id', context.user.id)
        .maybeSingle();

      isAssignedCoach = Boolean(tc || t);
    }

    const canViewDiscomfort = isStaffOrMedic || isAssignedCoach;

    // 3. Consultar player_daily_wellness
    const { data: rows, error: rowsErr } = await adminClient
      .from('player_daily_wellness')
      .select('*')
      .eq('club_id', teamData.club_id)
      .eq('date', date);

    if (rowsErr) {
      return { success: false, canViewDiscomfort, entries: [], error: rowsErr.message };
    }

    // 4. Sanitizar en servidor: Omitir campos sensibles de molestias si no está autorizado
    const entries: SanitizedPlayerWellnessEntry[] = (rows || []).map((row: any) => {
      const base: SanitizedPlayerWellnessEntry = {
        playerId: row.player_id,
        date: row.date,
        sleepQuality: row.sleep_quality,
        fatigue: row.fatigue,
        soreness: row.soreness,
        stress: row.stress,
        mood: row.mood,
        wellnessScore: row.wellness_score,
        submittedAt: row.submitted_at,
        hasDiscomfort: Boolean(row.has_discomfort),
      };

      if (canViewDiscomfort) {
        base.discomfortZone = row.discomfort_zone;
        base.discomfortIntensity = row.discomfort_intensity;
        base.notes = row.notes;
        base.isDiscomfortRedacted = false;
      } else {
        base.discomfortZone = null;
        base.discomfortIntensity = null;
        base.notes = null;
        base.isDiscomfortRedacted = true;
      }

      return base;
    });

    return {
      success: true,
      canViewDiscomfort,
      entries
    };
  } catch (err: any) {
    console.error("[getAuthorizedTeamWellnessSummary Error]:", err?.message || err);
    return { success: false, canViewDiscomfort: false, entries: [], error: "Error en el servidor al consultar bienestar." };
  }
}

