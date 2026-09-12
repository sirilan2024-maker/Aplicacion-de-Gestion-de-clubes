import { NotificationChannel, NotificationType } from './types';

export interface ChannelPolicyState {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

export interface ChannelSkipReasons {
  inApp?: string;
  email?: string;
  push?: string;
}

export interface ResolvedChannelsResult {
  inApp: boolean;
  email: boolean;
  push: boolean;
  skipReasons: ChannelSkipReasons;
}

// Valores por defecto canónicos para tipos de notificación cuando no existe política específica en BD
export const DEFAULT_NOTIFICATION_CHANNELS: Record<string, ChannelPolicyState> = {
  // Competición
  NEW_CONVOCATION: { inApp: true, email: true, push: true },
  CONVOCATION_UPDATED: { inApp: true, email: true, push: true },
  MATCH_REMINDER: { inApp: true, email: true, push: true },
  MATCH_RSVP_COACH_UPDATE: { inApp: true, email: false, push: true },

  // Entrenamientos
  NEW_TRAINING: { inApp: true, email: true, push: true },
  TRAINING_REMINDER: { inApp: true, email: true, push: true },
  TRAINING_SCHEDULED_REMINDER: { inApp: true, email: true, push: true },

  // Eventos
  NEW_EVENT: { inApp: true, email: true, push: true },
  EVENT_REMINDER: { inApp: true, email: true, push: true },

  // Comunicación
  TEAM_MESSAGE: { inApp: true, email: true, push: true },
  GENERAL_ALERT: { inApp: true, email: true, push: true },

  // Gestión
  DISCIPLINE_ALERT: { inApp: true, email: false, push: true },
  ATTENDANCE_ALERT: { inApp: true, email: false, push: false },

  // Secretaría y Tesorería
  FEE_ALERT: { inApp: true, email: true, push: true },
  REGISTRATION_CONFIRMED: { inApp: true, email: true, push: true },
};

// Default fallback universal
export const UNIVERSAL_DEFAULT_POLICY: ChannelPolicyState = {
  inApp: true,
  email: true,
  push: true,
};

/**
 * Resuelve los canales de notificación efectivos combinando:
 * 1. Naturaleza crítica / transaccional del tipo de notificación.
 * 2. Política global del Club (club_notification_policies).
 * 3. Preferencias o excepciones del usuario destinatario (user_notification_preferences).
 */
export function resolveEffectiveChannels(params: {
  type: string;
  isCritical?: boolean;
  clubPolicy?: {
    in_app_enabled?: boolean | null;
    email_enabled?: boolean | null;
    push_enabled?: boolean | null;
  } | null;
  userPreference?: {
    in_app_enabled?: boolean | null;
    email_enabled?: boolean | null;
    push_enabled?: boolean | null;
  } | null;
}): ResolvedChannelsResult {
  const { type, isCritical = false, clubPolicy, userPreference } = params;
  const isCriticalResolved = Boolean(isCritical || type === 'REGISTRATION_CONFIRMED' || type === 'FEE_ALERT');

  // 1. Obtener política base por defecto para este tipo
  const defaultPolicy = DEFAULT_NOTIFICATION_CHANNELS[type] || UNIVERSAL_DEFAULT_POLICY;

  // 2. Determinar configuración autorizada por el Club
  const clubInApp = clubPolicy?.in_app_enabled !== undefined && clubPolicy?.in_app_enabled !== null
    ? Boolean(clubPolicy.in_app_enabled)
    : defaultPolicy.inApp;

  const clubEmail = clubPolicy?.email_enabled !== undefined && clubPolicy?.email_enabled !== null
    ? Boolean(clubPolicy.email_enabled)
    : defaultPolicy.email;

  const clubPush = clubPolicy?.push_enabled !== undefined && clubPolicy?.push_enabled !== null
    ? Boolean(clubPolicy.push_enabled)
    : defaultPolicy.push;

  // 3. Determinar preferencia deseada por el Usuario
  const userInApp = userPreference?.in_app_enabled !== undefined && userPreference?.in_app_enabled !== null
    ? Boolean(userPreference.in_app_enabled)
    : true; // Por defecto el usuario acepta avisos en App

  const userEmail = userPreference?.email_enabled !== undefined && userPreference?.email_enabled !== null
    ? Boolean(userPreference.email_enabled)
    : true; // Por defecto el usuario acepta emails

  const userPush = userPreference?.push_enabled !== undefined && userPreference?.push_enabled !== null
    ? Boolean(userPreference.push_enabled)
    : (userPreference !== undefined && userPreference !== null ? false : true); // Si el usuario tiene registro de prefs, respeta su valor; si no existe registro, hereda activación

  const skipReasons: ChannelSkipReasons = {};

  // 4. Calcular canal IN_APP efectivo (Inmune ante desactivaciones si es crítico)
  let effectiveInApp = false;
  if (isCriticalResolved) {
    effectiveInApp = true;
  } else if (!clubInApp) {
    effectiveInApp = false;
    skipReasons.inApp = 'Desactivado por política del club';
  } else if (!userInApp) {
    effectiveInApp = false;
    skipReasons.inApp = 'Desactivado por preferencias de usuario';
  } else {
    effectiveInApp = true;
  }

  // 5. Calcular canal EMAIL efectivo (Inmune ante desactivaciones si es crítico)
  let effectiveEmail = false;
  if (isCriticalResolved) {
    effectiveEmail = true;
  } else if (!clubEmail) {
    effectiveEmail = false;
    skipReasons.email = 'Desactivado por política del club';
  } else if (!userEmail) {
    effectiveEmail = false;
    skipReasons.email = 'Desactivado por preferencias de usuario';
  } else {
    effectiveEmail = true;
  }

  // 6. Calcular canal PUSH efectivo
  let effectivePush = false;
  if (!clubPush) {
    effectivePush = false;
    skipReasons.push = 'Desactivado por política del club';
  } else if (!isCriticalResolved && !userPush) {
    effectivePush = false;
    skipReasons.push = 'Desactivado por preferencias de usuario';
  } else {
    effectivePush = true;
  }

  return {
    inApp: effectiveInApp,
    email: effectiveEmail,
    push: effectivePush,
    skipReasons,
  };
}
