# Tareas Pendientes y Mejoras Futuras (TODO)

## Estado de Funcionalidades de Email (Dejado en pausa a petición del usuario)
- [x] **Arquitectura y Plantillas de Email Listas**:
  - `src/lib/email-service.ts`: Servicio dual (SMTP / Resend) con plantillas maquetadas para *Confirmación de Inscripción* y *Avisos de Equipo*.
  - Disparadores conectados en `/api/register` y en `sendMessageAction`.
- [ ] **Activación final de credenciales SMTP / Dominio**:
  - Pendiente de introducir las credenciales SMTP (`SMTP_USER`, `SMTP_PASS`) o verificación de dominio en Resend cuando el usuario lo indique.

## Otras Funcionalidades Solicitadas por el Usuario
- [ ] **Envío automático de invitaciones por email al importar Excel**
