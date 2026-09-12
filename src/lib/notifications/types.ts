export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH';

export type NotificationType =
  | 'REGISTRATION_CONFIRMED'
  | 'TEAM_MESSAGE'
  | 'NEW_CONVOCATION'
  | 'CONVOCATION_UPDATED'
  | 'NEW_EVENT'
  | 'EVENT_REMINDER'
  | 'NEW_TRAINING'
  | 'TRAINING_REMINDER'
  | 'TRAINING_SCHEDULED_REMINDER'
  | 'MATCH_REMINDER'
  | 'MATCH_RSVP_COACH_UPDATE'
  | 'DISCIPLINE_ALERT'
  | 'ATTENDANCE_ALERT'
  | 'FEE_ALERT'
  | 'GENERAL_ALERT';

export type NotificationDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface DispatchNotificationParams {
  userId: string;
  userEmail?: string | null;
  clubId?: string | null;
  type: NotificationType;
  title: string;
  content: string;
  link?: string | null;
  channels: NotificationChannel[];
  idempotencyKey: string;
  metadata?: Record<string, any>;
  emailSubject?: string;
  emailHtml?: string;
}

export interface DispatchBatchParams {
  notifications: DispatchNotificationParams[];
}

export interface DispatchResult {
  userId: string;
  idempotencyKey: string;
  channels: {
    channel: NotificationChannel;
    status: NotificationDeliveryStatus;
    error?: string;
    messageId?: string;
  }[];
}

export interface BatchDispatchResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: DispatchResult[];
}

export interface UserNotificationPreference {
  id?: string;
  userId: string;
  clubId?: string | null;
  notificationType: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  canView?: boolean;
  canModify?: boolean;
  isCustomOverride?: boolean;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClubNotificationPolicy {
  id?: string;
  clubId: string;
  notificationType: NotificationType | string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

