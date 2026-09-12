# Sistema Centralizado de Notificaciones — Sporting Saladar

## 1. Visión General y Arquitectura

El sistema de notificaciones de Sporting Saladar está diseñado bajo una arquitectura centralizada, multi-canal, resiliente e idempotente. Proporciona una interfaz única para emitir comunicados institucionales, convocatorias de partidos, avisos de entrenamientos y recordatorios de calendario a través de los canales **In-App** (campana de notificaciones de la plataforma) y **Email** transaccional (SMTP prioritario con fallback a Resend), dejando la infraestructura preparada para **Web Push** en el futuro.

```text
                    EVENTO DE NEGOCIO
          (Chat, Convocatoria, Evento, Recordatorio)
                           │
                           ▼
                 NotificationService.dispatch()
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           IN-APP        EMAIL         PUSH
              │            │             │
              ▼            ▼             │
     public.notifications public.email-  │
        (Campana UI)       service.ts    │
                           (SMTP/Resend) │
                                         ▼
                                     [FUTURO]
                                    (Web Push)
```

---

## 2. Tipos de Notificación Soportados

| Tipo (`NotificationType`) | Descripción | Canales por Defecto | Transaccional / Crítico |
| :--- | :--- | :--- | :--- |
| `REGISTRATION_CONFIRMED` | Confirmación oficial y bienvenida tras alta/pago | `EMAIL` | Sí (No desactivable) |
| `TEAM_MESSAGE` | Nuevo mensaje o aviso publicado en el canal del equipo | `IN_APP` + `EMAIL` | No |
| `NEW_CONVOCATION` | Publicación de convocatoria para partido oficial | `IN_APP` + `EMAIL` | No |
| `CONVOCATION_UPDATED` | Modificación relevante de citación o rival | `IN_APP` + `EMAIL` | No |
| `NEW_TRAINING` | Programación de nuevo entrenamiento de equipo | `IN_APP` + `EMAIL` | No |
| `TRAINING_REMINDER` | Recordatorio 24 horas antes del entrenamiento | `IN_APP` + `EMAIL` | No |
| `TRAINING_SCHEDULED_REMINDER` | Aviso programado personalizado por el entrenador (ej. 1h antes) | `IN_APP` + `EMAIL` | No |
| `NEW_EVENT` | Creación de evento o torneo de club | `IN_APP` + `EMAIL` | No |
| `EVENT_REMINDER` | Recordatorio 24 horas antes del evento de club | `IN_APP` + `EMAIL` | No |
| `MATCH_REMINDER` | Recordatorio 24 horas antes del partido oficial | `IN_APP` + `EMAIL` | No |
| `DISCIPLINE_ALERT` | Jugador apercibido por tarjetas amarillas | `IN_APP` | Sí |
| `ATTENDANCE_ALERT` | Alerta IA por 3 ausencias consecutivas | `IN_APP` | Sí |
| `FEE_ALERT` | Recordatorio de cuota de tesorería | `IN_APP` + `EMAIL` | Sí |
| `GENERAL_ALERT` | Comunicados directivos y valoraciones | `IN_APP` | No |

---

### 2.1 Avisos Programados del Entrenador vs Recordatorios Automáticos 24h

El sistema distingue con precisión dos niveles de recordatorio sin colisionar:
1. **Aviso Programado Personalizado (`TRAINING_SCHEDULED_REMINDER`):** Configurado manualmente por el cuerpo técnico en la ficha del entrenamiento (ej. *"Avisar a las 19:00 para el entrenamiento de las 20:00"*). Se almacena en `team_events.rsvp_reminder_time` y se preserva íntegramente.
2. **Recordatorio Automático 24h (`TRAINING_REMINDER` / `MATCH_REMINDER`):** Recordatorio de antelación para asegurar la confirmación de asistencia en la víspera del evento.

Ambos avisos cuentan con claves de idempotencia independientes para garantizar que la ejecución periódica del cron no genere duplicados.

---

## 3. Principios de Idempotencia y Deduplicación

Para evitar envíos duplicados causados por reintentos de red, dobles clics o re-ejecuciones de tareas programadas (cron), cada entrega se identifica unívocamente por canal:

### Estructura de la Clave de Idempotencia:
```text
evento : identificador_entidad : id_jugador : id_usuario : CANAL
```

**Ejemplos Reales:**
* Convocatoria: `convocation:match_884:player_12:tutor_45:IN_APP`
* Convocatoria por Email: `convocation:match_884:player_12:tutor_45:EMAIL`
* Recordatorio 24h: `reminder:event:ev_99:player_12:tutor_45:EMAIL`

Antes de despachar cualquier mensaje, `NotificationService` consulta la tabla `public.notification_deliveries`. Si existe un registro previo con estado `SENT`, el canal se omite automáticamente (`SKIPPED: already processed`).

---

## 4. Auditoría de Entregas (`notification_deliveries`)

Cada intento de envío queda registrado en la base de datos con los siguientes estados:

* `PENDING`: En cola o en proceso de despacho.
* `SENT`: Entregado satisfactoriamente al proveedor o insertado en `notifications`.
* `FAILED`: Fallo temporal o permanente (con registro del mensaje de error en `last_error` y número de intentos en `attempts`).
* `SKIPPED`: Omitido deliberadamente por preferencias del usuario o duplicidad.

---

## 5. Preferencias de Usuario

Los usuarios (familias, entrenadores, directivos) pueden personalizar qué notificaciones desean recibir a través de la tarjeta de preferencias ubicada en **/dashboard/mi-perfil**.

* Los ajustes se almacenan en `public.user_notification_preferences`.
* Si un usuario desactiva el canal de email para entrenamientos (`email_enabled = false`), las notificaciones in-app seguirán llegando normalmente a la campana.
* Las notificaciones críticas (`REGISTRATION_CONFIRMED`, `FEE_ALERT`) ignoran las restricciones de marketing para asegurar la entrega de datos legales y de acceso.

---

## 6. Scheduler y Automatización de Recordatorios (Cron)

Para cumplir con la antelación de **24 horas** de recordatorios sin depender de una única hora fija, se han implementado dos mecanismos complementarios:

1. **Vercel Cron (`vercel.json`):**
   * Endpoint: `/api/events/send-reminders`
   * Frecuencia: Diario a las 08:00 UTC (`0 8 * * *`).
2. **GitHub Actions Workflow (`.github/workflows/reminders-cron.yml`):**
   * Frecuencia: Cada 3 horas (`0 */3 * * *`).
   * Autenticación: Cabecera `Authorization: Bearer ${{ secrets.CRON_SECRET }}`.

Ambos disparadores son completamente seguros de ejecutar simultáneamente gracias a la deduplicación por clave de idempotencia y al flag `rsvp_reminder_sent = true`.

---

## 7. Variables de Entorno

El sistema utiliza las siguientes variables de entorno configuradas en Vercel y `.env.local`:

```ini
# Proveedor Primario: SMTP (Google Workspace / Servidor Propio)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tu-correo@sportingsaladar.com
SMTP_PASS=tu-contraseña-de-aplicacion
EMAIL_FROM_NAME="Sporting Saladar"
EMAIL_REPLY_TO="csportingsaladar@gmail.com"

# Proveedor Secundario (Fallback): Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="Sporting Saladar <onboarding@resend.dev>"
EMAIL_REPLY_TO="csportingsaladar@gmail.com"

# Seguridad del Scheduler
CRON_SECRET=tu-token-secreto-de-cron
```

---

## 8. Guía para Desarrolladores: Cómo Emitir una Notificación

```typescript
import { NotificationService } from '@/lib/notifications/notification-service';
import { getConvocationEmailHtml } from '@/lib/email-service';

// Despacho individual o en lote
await NotificationService.dispatch({
  userId: tutorId,
  userEmail: tutorEmail,
  clubId: clubId,
  type: 'NEW_CONVOCATION',
  title: 'Convocatoria: Infantil A vs CF Gandía',
  content: 'Tu jugador ha sido convocado para el partido del sábado.',
  link: `/dashboard/family/e/${playerId}/partidos`,
  channels: ['IN_APP', 'EMAIL'],
  idempotencyKey: `convocation:${matchId}:${playerId}:${tutorId}`,
  emailSubject: '⚽ Convocatoria Oficial: Infantil A vs CF Gandía',
  emailHtml: getConvocationEmailHtml({ ... }),
});
```

---

## 9. Futura Integración Web Push

La arquitectura está preparada para habilitar Notificaciones Push para PWA y navegadores móviles en una fase posterior:
1. Registrar Service Worker en `public/sw.js`.
2. Almacenar suscripciones VAPID en `public.push_subscriptions`.
3. Activar el canal `'PUSH'` en `NotificationService` conectándolo a `web-push`.
