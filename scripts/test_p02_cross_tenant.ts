import { canUserAccessPlayer, canUserAccessFamily, canUserAccessMatch, canUserAccessFee, AuthenticatedContext } from "../src/lib/auth-helpers";

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
  console.log("=== TEST SUITE P02: CROSS-TENANT & AUTORIZACIÓN DETALLADA ===");

  const mockDb = {
    players: [
      { id: "player-a1", club_id: clubA, team_id: "team-1", tutor_id: "family-a-id", user_auth_id: null },
      { id: "player-b1", club_id: clubB, team_id: "team-b", tutor_id: "family-b-id", user_auth_id: null },
    ],
    profiles: [
      { id: "family-a-id", club_id: clubA },
      { id: "family-b-id", club_id: clubB },
    ],
    partidos: [
      { id: "match-a1", equipo_id: "team-1", equipo: { id: "team-1", name: "Equipo A", club_id: clubA } },
      { id: "match-b1", equipo_id: "team-b", equipo: { id: "team-b", name: "Equipo B", club_id: clubB } },
    ],
    fees: [
      { id: "fee-a1", club_id: clubA, profile_id: "family-a-id", player_id: "player-a1", players: { tutor_id: "family-a-id", user_auth_id: null } },
      { id: "fee-b1", club_id: clubB, profile_id: "family-b-id", player_id: "player-b1", players: { tutor_id: "family-b-id", user_auth_id: null } },
    ],
    team_coaches: [
      { id: "tc-1", team_id: "team-1", profile_id: "coach-a-id" },
    ],
    player_tutors: [
      { id: "pt-1", player_id: "player-a1", tutor_id: "family-a-id" },
    ]
  };

  const adminClient = createMockAdmin(mockDb);

  // 1. Cross-tenant Player Access
  const p1 = await canUserAccessPlayer(adminClient, adminClubA, "player-b1");
  assert(!p1.allowed, "Admin Club A intentando acceder a Jugador Club B -> DENEGADO (Cross-tenant)");

  const p2 = await canUserAccessPlayer(adminClient, adminClubA, "player-a1");
  assert(p2.allowed, "Admin Club A accediendo a Jugador Club A -> PERMITIDO");

  const p3 = await canUserAccessPlayer(adminClient, familyA, "player-a1");
  assert(p3.allowed, "Familia A accediendo a su propio hijo en Club A -> PERMITIDO");

  const p4 = await canUserAccessPlayer(adminClient, familyB, "player-a1");
  assert(!p4.allowed, "Familia Club B intentando acceder a Jugador Club A -> DENEGADO");

  // 2. Cross-tenant Family Access
  const f1 = await canUserAccessFamily(adminClient, adminClubA, "family-b-id");
  assert(!f1.allowed, "Admin Club A intentando consultar cuotas de Familia Club B -> DENEGADO (Cross-tenant)");

  const f2 = await canUserAccessFamily(adminClient, adminClubA, "family-a-id");
  assert(f2.allowed, "Admin Club A consultando Familia Club A -> PERMITIDO");

  const f3 = await canUserAccessFamily(adminClient, familyA, "family-a-id");
  assert(f3.allowed, "Familia A consultando sus propias cuotas -> PERMITIDO");

  const f4 = await canUserAccessFamily(adminClient, familyA, "family-b-id");
  assert(!f4.allowed, "Familia A intentando consultar cuotas de Familia B -> DENEGADO (IDOR)");

  // 3. Cross-tenant Match Access
  const m1 = await canUserAccessMatch(adminClient, adminClubA, "match-b1");
  assert(!m1.allowed, "Admin Club A intentando asignar/ver acta de Partido Club B -> DENEGADO (Cross-tenant)");

  const m2 = await canUserAccessMatch(adminClient, adminClubA, "match-a1");
  assert(m2.allowed, "Admin Club A accediendo a Partido Club A -> PERMITIDO");

  // 4. Cross-tenant Fee Access
  const fee1 = await canUserAccessFee(adminClient, adminClubA, "fee-b1");
  assert(!fee1.allowed, "Admin Club A intentando ver Cuota Club B -> DENEGADO (Cross-tenant)");

  const fee2 = await canUserAccessFee(adminClient, adminClubA, "fee-a1");
  assert(fee2.allowed, "Admin Club A viendo Cuota Club A -> PERMITIDO");

  const fee3 = await canUserAccessFee(adminClient, familyA, "fee-a1");
  assert(fee3.allowed, "Familia A viendo su propia Cuota -> PERMITIDO");

  const fee4 = await canUserAccessFee(adminClient, familyB, "fee-a1");
  assert(!fee4.allowed, "Familia B intentando ver Cuota de Familia A -> DENEGADO (IDOR)");

  console.log(`\nRESUMEN CROSS-TENANT: ${passed} PASSED / ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

runCrossTenantTests();