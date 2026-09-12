import { ADMIN_ROLES, STAFF_ROLES } from './auth-helpers';
import type { SupabaseClient } from '@supabase/supabase-js';

export const PROTECTED_ACCOUNTS_BLACKLIST = [
  'sirilan2024@gmail.com',
  'saladecine2021@gmail.com',
  'info@clubsportingsaladar.com',
  'sirilan@hotmail.com',
] as const;

export const PROTECTED_DOMAINS = [
  'clubsportingsaladar.com',
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
] as const;

export const SAFE_E2E_DOMAINS = [
  'example.invalid',
  'test.invalid',
  'e2e.test',
  'test.local',
] as const;

/**
 * Genera una identidad de email 100% aislada para pruebas E2E.
 * Utiliza dominios reservados RFC 2606 / RFC 6761 para evitar colisiones con cuentas reales.
 */
export function generateSafeE2EIdentity(tag = 'reg'): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `e2e-${tag}-${timestamp}-${randomSuffix}@example.invalid`;
}

/**
 * Valida estrictamente que un email sea una identidad segura para pruebas E2E.
 * Lanza una excepción si el email pertenece a una cuenta protegida o dominio real.
 */
export function assertSafeE2ETestEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new Error('[E2E_SAFETY_VIOLATION] El email de prueba no puede estar vacío.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Comprobación contra lista negra explícita
  if (PROTECTED_ACCOUNTS_BLACKLIST.some(p => p.toLowerCase() === normalizedEmail)) {
    throw new Error(
      `[E2E_SAFETY_VIOLATION_FATAL] Se intentó utilizar el email protegido "${normalizedEmail}" como identidad E2E. Operación abortada de inmediato.`
    );
  }

  // 2. Comprobación contra dominios protegidos del club
  if (normalizedEmail.endsWith('@clubsportingsaladar.com')) {
    throw new Error(
      `[E2E_SAFETY_VIOLATION_FATAL] No se permite utilizar el dominio del club (@clubsportingsaladar.com) para pruebas destructivas E2E.`
    );
  }

  // 3. Comprobación de patrón E2E
  const isSafeDomain = SAFE_E2E_DOMAINS.some(domain => normalizedEmail.endsWith(`@${domain}`));
  const hasE2EPrefix = normalizedEmail.startsWith('e2e-') || normalizedEmail.startsWith('test-e2e-');

  if (!isSafeDomain || !hasE2EPrefix) {
    throw new Error(
      `[E2E_SAFETY_VIOLATION] El email "${normalizedEmail}" no cumple el patrón de identidad E2E segura (debe comenzar con "e2e-" y pertenecer a dominios reservados como @example.invalid).`
    );
  }
}

/**
 * Verifica si un usuario existente en la base de datos es seguro de eliminar por el script E2E.
 * Aborta inmediatamente si el usuario tiene rol administrativo o si no es una identidad E2E.
 */
export async function assertSafeToCleanUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
  expectedEmail?: string
): Promise<void> {
  if (!userId) {
    throw new Error('[E2E_SAFETY_VIOLATION] userId inválido para limpieza.');
  }

  // 1. Obtener usuario Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (authError || !authData?.user) {
    throw new Error(`[E2E_SAFETY_VIOLATION] No se pudo verificar el usuario Auth ID ${userId}: ${authError?.message}`);
  }

  const userEmail = authData.user.email?.toLowerCase() || '';

  // 2. Validar que el email del usuario sea un email E2E seguro
  assertSafeE2ETestEmail(userEmail);

  if (expectedEmail && userEmail !== expectedEmail.toLowerCase()) {
    throw new Error(
      `[E2E_SAFETY_VIOLATION] Discrepancia de identidad: Se esperaba limpiar "${expectedEmail}" pero el usuario ID ${userId} tiene el email "${userEmail}". Operación abortada.`
    );
  }

  // 3. Obtener perfil y comprobar roles administrativos
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, rol, roles')
    .eq('id', userId)
    .maybeSingle();

  if (profile) {
    const role = profile.role;
    const rol = profile.rol;
    const roles: string[] = Array.isArray(profile.roles) ? profile.roles : [];

    const isProtectedRole =
      (role && ADMIN_ROLES.includes(role)) ||
      (rol && ADMIN_ROLES.includes(rol)) ||
      roles.some(r => ADMIN_ROLES.includes(r)) ||
      (role && STAFF_ROLES.includes(role));

    if (isProtectedRole) {
      throw new Error(
        `[E2E_SAFETY_VIOLATION_FATAL] Se intentó limpiar una cuenta con rol administrativo/staff (role: "${role}", rol: "${rol}", roles: ${JSON.stringify(roles)}). Operación abortada.`
      );
    }
  }
}

/**
 * Gestor de seguimiento de recursos creados durante una ejecución E2E.
 * Garantiza que la limpieza se realice estrictamente por IDs creados durante esa ejecución.
 */
export class SafeE2EExecutionTracker {
  public readonly executionId: string;
  public readonly testIdentityEmail: string;
  public authUserId: string | null = null;
  public playerId: string | null = null;
  public familyId: string | null = null;
  public feeIds: string[] = [];
  public seasonHistoryIds: string[] = [];
  public playerTutorIds: string[] = [];

  constructor(tag = 'reg') {
    this.executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    this.testIdentityEmail = generateSafeE2EIdentity(tag);
    assertSafeE2ETestEmail(this.testIdentityEmail);
  }

  public registerAuthUser(userId: string): void {
    this.authUserId = userId;
  }

  public registerPlayer(playerId: string): void {
    this.playerId = playerId;
  }

  public registerFamily(familyId: string): void {
    this.familyId = familyId;
  }

  public registerFee(feeId: string): void {
    if (!this.feeIds.includes(feeId)) {
      this.feeIds.push(feeId);
    }
  }

  public registerSeasonHistory(historyId: string): void {
    if (!this.seasonHistoryIds.includes(historyId)) {
      this.seasonHistoryIds.push(historyId);
    }
  }

  public registerPlayerTutor(tutorLinkId: string): void {
    if (!this.playerTutorIds.includes(tutorLinkId)) {
      this.playerTutorIds.push(tutorLinkId);
    }
  }

  /**
   * Ejecuta la limpieza segura de los recursos registrados en esta ejecución específica.
   */
  public async cleanup(supabaseAdmin: SupabaseClient): Promise<{ success: boolean; cleanedItems: Record<string, number> }> {
    console.log(`[E2E_CLEANUP] Iniciando limpieza segura para la ejecución ${this.executionId}...`);
    const cleaned = {
      playerTutors: 0,
      fees: 0,
      seasonHistory: 0,
      families: 0,
      players: 0,
      profiles: 0,
      authUsers: 0,
    };

    // 1. Limpiar player_tutors por IDs registrados
    if (this.playerTutorIds.length > 0) {
      const { error } = await supabaseAdmin.from('player_tutors').delete().in('id', this.playerTutorIds);
      if (!error) cleaned.playerTutors = this.playerTutorIds.length;
    } else if (this.playerId) {
      const { data } = await supabaseAdmin.from('player_tutors').delete().eq('player_id', this.playerId).select('id');
      cleaned.playerTutors = data?.length || 0;
    }

    // 2. Limpiar fees por IDs registrados
    if (this.feeIds.length > 0) {
      const { error } = await supabaseAdmin.from('fees').delete().in('id', this.feeIds);
      if (!error) cleaned.fees = this.feeIds.length;
    } else if (this.playerId) {
      const { data } = await supabaseAdmin.from('fees').delete().eq('player_id', this.playerId).select('id');
      cleaned.fees = data?.length || 0;
    }

    // 3. Limpiar player_season_history
    if (this.seasonHistoryIds.length > 0) {
      const { error } = await supabaseAdmin.from('player_season_history').delete().in('id', this.seasonHistoryIds);
      if (!error) cleaned.seasonHistory = this.seasonHistoryIds.length;
    } else if (this.playerId) {
      const { data } = await supabaseAdmin.from('player_season_history').delete().eq('player_id', this.playerId).select('id');
      cleaned.seasonHistory = data?.length || 0;
    }

    // 4. Limpiar families por ID
    if (this.familyId) {
      const { error } = await supabaseAdmin.from('families').delete().eq('id', this.familyId);
      if (!error) cleaned.families = 1;
    } else if (this.authUserId) {
      const { data } = await supabaseAdmin.from('families').delete().eq('tutor_1_profile_id', this.authUserId).select('id');
      cleaned.families = data?.length || 0;
    }

    // 5. Limpiar player por ID
    if (this.playerId) {
      const { error } = await supabaseAdmin.from('players').delete().eq('id', this.playerId);
      if (!error) cleaned.players = 1;
    }

    // 6. Limpiar Auth User y Profile tras pasar el assertSafeToCleanUser
    if (this.authUserId) {
      await assertSafeToCleanUser(supabaseAdmin, this.authUserId, this.testIdentityEmail);

      const { error: profErr } = await supabaseAdmin.from('profiles').delete().eq('id', this.authUserId);
      if (!profErr) cleaned.profiles = 1;

      try {
        await supabaseAdmin.auth.admin.deleteUser(this.authUserId);
        cleaned.authUsers = 1;
      } catch (err: any) {
        console.error(`[E2E_CLEANUP] Error eliminando usuario Auth ID ${this.authUserId}:`, err.message);
      }
    }

    console.log(`[E2E_CLEANUP] Limpieza segura completada:`, cleaned);
    return { success: true, cleanedItems: cleaned };
  }
}
