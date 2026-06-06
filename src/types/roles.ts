export type UserRole = 'admin' | 'coach' | 'metodologo' | 'familia';

export const USER_ROLES: Record<UserRole, string> = {
  admin: 'Administrador',
  coach: 'Entrenador',
  metodologo: 'Metodólogo',
  familia: 'Familia / Tutor'
};
