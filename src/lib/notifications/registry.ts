import { NotificationType } from './types';

export interface NotificationPolicyMetadata {
  type: NotificationType | string;
  label: string;
  description: string;
  category: 'Competición' | 'Entrenamientos' | 'Eventos' | 'Comunicación' | 'Gestión' | 'Tesorería' | 'Secretaría';
  icon: string;
  isCritical?: boolean;
  defaultInApp: boolean;
  defaultEmail: boolean;
  defaultPush: boolean;
}

export const NOTIFICATION_TYPE_REGISTRY: NotificationPolicyMetadata[] = [
  // --- ACTIVOS / CENTRALIZADOS ---
  {
    type: 'NEW_CONVOCATION',
    label: 'Convocatorias de Partidos',
    description: 'Avisos a jugadores y familias cuando el entrenador publica la convocatoria oficial del partido.',
    category: 'Competición',
    icon: '⚽',
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },
  {
    type: 'NEW_TRAINING',
    label: 'Nuevos Entrenamientos',
    description: 'Publicación de nuevas sesiones de entrenamiento, horarios de campo y detalles tácticos.',
    category: 'Entrenamientos',
    icon: '📋',
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },
  {
    type: 'NEW_EVENT',
    label: 'Eventos y Actividades del Club',
    description: 'Torneos, reuniones, actos sociales e institucionales creados en el calendario.',
    category: 'Eventos',
    icon: '🏆',
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },
  {
    type: 'TRAINING_REMINDER',
    label: 'Recordatorio Automático de Entrenamiento',
    description: 'Aviso automático enviado con 24 horas de antelación al inicio del entrenamiento.',
    category: 'Entrenamientos',
    icon: '⏰',
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },
  {
    type: 'TRAINING_SCHEDULED_REMINDER',
    label: 'Aviso Programado de Sesión',
    description: 'Recordatorio con hora personalizada fijada manualmente por el cuerpo técnico.',
    category: 'Entrenamientos',
    icon: '⏱️',
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },
  {
    type: 'MATCH_REMINDER',
    label: 'Recordatorio de Partido',
    description: 'Recordatorio previo a la jornada de liga, horario de citación y ubicación del encuentro.',
    category: 'Competición',
    icon: '🔔',
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },
  {
    type: 'EVENT_REMINDER',
    label: 'Recordatorio de Evento',
    description: 'Avisos recordatorios de torneos, reuniones y actos del club.',
    category: 'Eventos',
    icon: '📅',
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },

  // --- ARQUITECTURA PREPARADA PARA PRÓXIMAS FASES ---
  {
    type: 'TEAM_MESSAGE',
    label: 'Mensajes y Avisos del Equipo',
    description: 'Comunicaciones directas del entrenador dirigidas al muro y plantilla del equipo.',
    category: 'Comunicación',
    icon: '💬',
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },
  {
    type: 'CONVOCATION_UPDATED',
    label: 'Modificación de Convocatoria',
    description: 'Aviso de cambios de última hora en citaciones, horarios o jugadores convocados.',
    category: 'Competición',
    icon: '🔄',
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },
  {
    type: 'MATCH_RSVP_COACH_UPDATE',
    label: 'Respuestas de Convocatoria al Entrenador',
    description: 'Avisos al cuerpo técnico cuando los jugadores o familias confirman o declinan su asistencia al partido.',
    category: 'Competición',
    icon: '📋',
    defaultInApp: true,
    defaultEmail: false,
    defaultPush: true,
  },
  {
    type: 'GENERAL_ALERT',
    label: 'Comunicados Generales del Club',
    description: 'Anuncios masivos oficiales de la junta directiva a toda la comunidad del club.',
    category: 'Comunicación',
    icon: '📢',
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },
  {
    type: 'FEE_ALERT',
    label: 'Avisos de Cuotas y Tesorería',
    description: 'Recordatorios de cuotas de temporada pendientes, emisión de recibos y cobros.',
    category: 'Tesorería',
    icon: '💳',
    isCritical: true,
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },
  {
    type: 'REGISTRATION_CONFIRMED',
    label: 'Confirmación de Inscripción',
    description: 'Avisos tras la validación de nuevas inscripciones y expedientes de jugadores.',
    category: 'Secretaría',
    icon: '📝',
    isCritical: true,
    defaultInApp: true,
    defaultEmail: true,
    defaultPush: true,
  },
  {
    type: 'DISCIPLINE_ALERT',
    label: 'Alertas de Disciplina',
    description: 'Notificaciones sobre sanciones federativas, acumulación de tarjetas y bajas.',
    category: 'Gestión',
    icon: '🟨',
    defaultInApp: true,
    defaultEmail: false,
    defaultPush: true,
  },
  {
    type: 'ATTENDANCE_ALERT',
    label: 'Alertas de Asistencia',
    description: 'Avisos por reiteración de faltas de asistencia sin justificar.',
    category: 'Gestión',
    icon: '⚠️',
    defaultInApp: true,
    defaultEmail: false,
    defaultPush: false,
  },
];
