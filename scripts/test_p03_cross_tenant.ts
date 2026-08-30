import {
  canUserDeleteTeam,
  canUserUpdateRegistrationEmail,
  canUserUpdateStaffProfile,
  canUserAccessFee,
  AuthenticatedContext,
  TREASURY_ADMIN_ROLES,
} from "../src/lib/auth-helpers";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log("  PASS: " + testName);
    passed++;
  } else {
    console.error("  FAIL: " + testName);
    failed++;
  }
}

const clubA = "11111111-1111-1111-1111-111111111111";
const clubB = "22222222-2222-2222-2222-222222222222";

const adminClubA: AuthenticatedContext = {
  user: { id: "admin-a-id", email: "admin@cluba.com" },
  profile: { id: "admin-a-id", role: "admin", club_id: clubA, first_name: "Admin", last_name: "Club A" }
};

const tesoreroClubA: AuthenticatedContext = {
  user: { id: "tesorero-a-id", email: "tesorero@cluba.com" },
  profile: { id: "tesorero-a-id", role: "tesorero", club_id: clubA, first_name: "Tesorero", last_name: "Club A" }
};

const coachClubA: AuthenticatedContext = {
  user: { id: "coach-a-id", email: "coach@cluba.com" },
  profile: { id: "coach-a-id", role: "coach", club_id: clubA, first_name: "Entrenador", last_name: "Club A" }
};

const familyA: AuthenticatedContext = {
  user: { id: "family-a-id", email: "family@cluba.com" },
  profile: { id: "family-a-id", role: "family", club_id: clubA, first_name: "Padre", last_name: "Familia A" }
};

const familyB: AuthenticatedContext = {
  user: { id: "family-b-id", email: "family@clubb.com" },
  profile: { id: "family-b-id", role: "family", club_id: clubB, first_name: "Padre", last_name: "Familia B" }
};

function createMockAdmin(db: any) {
  return {
    from: (table: string) => ({
      select: (...args: any[]) => {
        const buildQuery = (filters: Array<{ col: string; val: any }>) => ({
          eq: (col: string, val: any) => buildQuery([...filters, { col, val }]),
          in: (col: string, vals: any[]) => ({
            limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
            maybeSingle: async () => ({ data: null, error: null })
          }),
          limit: (n: number) => ({
            maybeSingle: async () => {
              const rows = db[table] || [];
              const found = rows.find((r: any) => filters.every(f => r[f.col] === f.val));
              return { data: found || null, error: null };
            }
          }),
          maybeSingle: async () => {
            const rows = db[table] || [];
            const found = rows.find((r: any) => filters.every(f => r[f.col] === f.val));
            return { data: found || null, error: null };
          },
          single: async () => {
            const rows = db[table] || [];
            const found = rows.find((r: any) => filters.every(f => r[f.col] === f.val));
            return found ? { data: found, error: null } : { data: null, error: { message: "Not found" } };
          }
        });
        return buildQuery([]);
      }
    })
  } as any;
}

async function runCrossTenantTests() {
  console.log("=== TEST SUITE P03: AUTORIZACIÓN, ROLES & CROSS-TENANT ===");

  const mockDb = {
    teams: [
      { id: "team-a1", name: "Infantil A", club_id: clubA },
      { id: "team-b1", name: "Infantil B", club_id: clubB },
    ],
    registrations: [
      { id: "reg-a1", club_id: clubA, form_data: { tutor1Email: "old-a@test.com" } },
      { id: "reg-b1", club_id: clubB, form_data: { tutor1Email: "old-b@test.com" } },
    ],
    profiles: [
      { id: "admin-a-id", club_id: clubA, role: "admin" },
      { id: "coach-a-id", club_id: clubA, role: "coach" },
      { id: "staff-2-id", club_id: clubA, role: "coach" },
      { id: "staff-b-id", club_id: clubB, role: "coach" },
      { id: "family-a-id", club_id: clubA, role: "family" },
      { id: "family-b-id", club_id: clubB, role: "family" },
    ],
    fees: [
      { id: "fee-a1", club_id: clubA, profile_id: "family-a-id", player_id: "player-a1", amount_cents: 20000, amount_paid_cents: 0 },
      { id: "fee-b1", club_id: clubB, profile_id: "family-b-id", player_id: "player-b1", amount_cents: 20000, amount_paid_cents: 0 },
    ],
    players: [
      { id: "player-a1", club_id: clubA, team_id: "team-a1", tutor_id: "family-a-id", user_auth_id: null },
      { id: "player-b1", club_id: clubB, team_id: "team-b1", tutor_id: "family-b-id", user_auth_id: null },
    ],
    player_tutors: [
      { id: "pt-1", player_id: "player-a1", tutor_id: "family-a-id" },
    ]
  };

  const adminClient = createMockAdmin(mockDb);

  // 1. FINANZAS — ROLES Y PERMISOS DE ESCRITURA
  // Comprobar que solo roles de tesorería pueden modificar cuotas
  assert(TREASURY_ADMIN_ROLES.includes(adminClubA.profile.role), "Admin tiene rol de tesorería para modificar cuotas");
  assert(TREASURY_ADMIN_ROLES.includes(tesoreroClubA.profile.role), "Tesorero tiene rol de tesorería para modificar cuotas");
  assert(!TREASURY_ADMIN_ROLES.includes(coachClubA.profile.role), "Entrenador NO tiene rol de tesorería para modificar cuotas");
  assert(!TREASURY_ADMIN_ROLES.includes(familyA.profile.role), "Familia NO tiene rol de tesorería para modificar cuotas");

  // canUserAccessFee para registrar pagos
  const feeAcc1 = await canUserAccessFee(adminClient, familyA, "fee-a1");
  assert(feeAcc1.allowed, "Familia A puede autorizarse en su propia cuota para pago parcial");

  const feeAcc2 = await canUserAccessFee(adminClient, familyA, "fee-b1");
  assert(!feeAcc2.allowed, "Familia A intentando pagar/ver cuota de Club B -> DENEGADO (Cross-tenant)");

  const feeAcc3 = await canUserAccessFee(adminClient, familyB, "fee-a1");
  assert(!feeAcc3.allowed, "Familia B intentando pagar/ver cuota de Familia A -> DENEGADO (IDOR)");

  const feeAcc4 = await canUserAccessFee(adminClient, adminClubA, "fee-b1");
  assert(!feeAcc4.allowed, "Admin Club A intentando acceder a Cuota Club B -> DENEGADO (Cross-tenant)");

  // 2. CUENTAS — CAMBIO DE EMAIL EN INSCRIPCIONES
  const r1 = await canUserUpdateRegistrationEmail(adminClient, coachClubA, "reg-a1", "family-a-id");
  assert(!r1.allowed, "Entrenador intentando modificar email de inscripción -> DENEGADO (Falta rol)");

  const r2 = await canUserUpdateRegistrationEmail(adminClient, adminClubA, "reg-b1", "family-b-id");
  assert(!r2.allowed, "Admin Club A intentando modificar inscripción Club B -> DENEGADO (Cross-tenant)");

  const r3 = await canUserUpdateRegistrationEmail(adminClient, adminClubA, "reg-a1", "family-b-id");
  assert(!r3.allowed, "Admin Club A intentando asociar usuario de Club B -> DENEGADO (Cross-tenant userId)");

  const r4 = await canUserUpdateRegistrationEmail(adminClient, adminClubA, "reg-a1", "family-a-id");
  assert(r4.allowed, "Admin Club A modificando inscripción de su Club A -> PERMITIDO");

  // 3. CUENTAS — PERFIL DE STAFF
  const s1 = await canUserUpdateStaffProfile(adminClient, coachClubA, "staff-2-id");
  assert(!s1.allowed, "Staff intentando modificar perfil de otro compañero sin ser admin -> DENEGADO");

  const s2 = await canUserUpdateStaffProfile(adminClient, coachClubA, "coach-a-id");
  assert(s2.allowed, "Staff modificando su propio perfil -> PERMITIDO");

  const s3 = await canUserUpdateStaffProfile(adminClient, adminClubA, "staff-b-id");
  assert(!s3.allowed, "Admin Club A intentando modificar staff de Club B -> DENEGADO (Cross-tenant)");

  const s4 = await canUserUpdateStaffProfile(adminClient, adminClubA, "staff-2-id");
  assert(s4.allowed, "Admin Club A modificando staff de Club A -> PERMITIDO");

  // 4. EQUIPOS — BORRADO DE EQUIPOS
  const t1 = await canUserDeleteTeam(adminClient, familyA, "team-a1");
  assert(!t1.allowed, "Familia intentando borrar equipo -> DENEGADO (Falta rol admin)");

  const t2 = await canUserDeleteTeam(adminClient, coachClubA, "team-a1");
  assert(!t2.allowed, "Entrenador intentando borrar equipo -> DENEGADO (Falta rol admin)");

  const t3 = await canUserDeleteTeam(adminClient, adminClubA, "team-b1");
  assert(!t3.allowed, "Admin Club A intentando borrar equipo de Club B -> DENEGADO (Cross-tenant)");

  const t4 = await canUserDeleteTeam(adminClient, adminClubA, "team-a1");
  assert(t4.allowed, "Admin Club A borrando equipo de Club A -> PERMITIDO");

  console.log(`\nRESUMEN P03 CROSS-TENANT: ${passed} PASSED / ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

runCrossTenantTests();