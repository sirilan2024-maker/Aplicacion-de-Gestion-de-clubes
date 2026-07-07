# Tareas Pendientes y Mejoras Futuras (TODO)

## Funcionalidades Solicitadas por el Usuario
- [ ] **Envío automático de invitaciones por email (Integración con Resend)**
  - *Contexto*: Al importar un archivo Excel (o al invitar un staff manualmente si se tiene su email), el sistema debería enviar un correo automático en lugar de requerir que el admin copie y pegue el enlace manualmente.
  - *Requisitos*:
    1. Añadir columna "Email" al importador Excel para entrenadores (y opcionalmente jugadores/padres).
    2. Instalar el SDK de `resend` en el proyecto (`npm install resend`).
    3. Crear una API route en Next.js (`/api/send-invite`) o una Edge Function en Supabase.
    4. Diseñar una plantilla de correo atractiva con los colores del club usando React Email.
    5. Actualizar `bulkCreateStaffInvitationsAction` para disparar el correo al generar la invitación.
    6. Actualizar la UI del directorio de miembros para mostrar el estado "Invitación enviada por email".
