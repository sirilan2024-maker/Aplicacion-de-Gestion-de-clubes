import { 
  canUserAccessPlayer, 
  canUserAccessMatch,
  canUserAccessFee,
  canUserManageClubStaff,
  canUserManageTeam,
  AuthenticatedContext 
} from '../src/lib/auth-helpers';

async function runCrossTenantP05Tests() {
  console.log('--- STARTING P05 READ CROSS-TENANT & IDOR TESTS ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log('✅ [PASS] ' + testName + (detail ? ' (' + detail + ')' : ''));
      passCount++;
    } else {
      console.error('❌ [FAIL] ' + testName + (detail ? ' (' + detail + ')' : ''));
      failCount++;
    }
  }

  const mockAdminClubA: AuthenticatedContext = {
    user: { id: 'admin-a-id', email: 'admin@cluba.com' },
    profile: { id: 'admin-a-id', role: 'admin', roles: ['admin'], club_id: 'club-a-uuid' }
  };

  const mockAdminClubB: AuthenticatedContext = {
    user: { id: 'admin-b-id', email: 'admin@clubb.com' },
    profile: { id: 'admin-b-id', role: 'admin', roles: ['admin'], club_id: 'club-b-uuid' }
  };

  const mockFamilyClubA: AuthenticatedContext = {
    user: { id: 'family-a-id', email: 'family@cluba.com' },
    profile: { id: 'family-a-id', role: 'familia', roles: ['familia'], club_id: 'club-a-uuid' }
  };

  const mockFamilyClubB: AuthenticatedContext = {
    user: { id: 'family-b-id', email: 'family@clubb.com' },
    profile: { id: 'family-b-id', role: 'familia', roles: ['familia'], club_id: 'club-b-uuid' }
  };

  const mockCoachClubA: AuthenticatedContext = {
    user: { id: 'coach-a-id', email: 'coach@cluba.com' },
    profile: { id: 'coach-a-id', role: 'entrenador', roles: ['entrenador'], club_id: 'club-a-uuid' }
  };

  // Mock DB clients
  const createMockAdminClient = (dbData: any) => ({
    from: (tableName: string) => ({
      select: (fields: string) => ({
        eq: (col1: string, val1: any) => ({
          eq: (col2: string, val2: any) => ({
            maybeSingle: async () => {
              const rows = dbData[tableName] || [];
              const found = rows.find((r: any) => r[col1] === val1 && r[col2] === val2);
              return { data: found || null, error: null };
            },
            single: async () => {
              const rows = dbData[tableName] || [];
              const found = rows.find((r: any) => r[col1] === val1 && r[col2] === val2);
              return { data: found || null, error: found ? null : { message: 'Not found' } };
            }
          }),
          maybeSingle: async () => {
            const rows = dbData[tableName] || [];
            const found = rows.find((r: any) => r[col1] === val1);
            return { data: found || null, error: null };
          },
          single: async () => {
            const rows = dbData[tableName] || [];
            const found = rows.find((r: any) => r[col1] === val1);
            return { data: found || null, error: found ? null : { message: 'Not found' } };
          }
        })
      })
    })
  });

  const mockDbData = {
    players: [
      { id: 'player-a-child', club_id: 'club-a-uuid', tutor_id: 'family-a-id', team_id: 'team-a-1' },
      { id: 'player-a-other', club_id: 'club-a-uuid', tutor_id: 'other-tutor-id', team_id: 'team-a-2' },
      { id: 'player-b-child', club_id: 'club-b-uuid', tutor_id: 'family-b-id', team_id: 'team-b-1' }
    ],
    partidos: [
      { id: 'match-a-1', club_id: 'club-a-uuid', equipo_id: 'team-a-1', equipo: { id: 'team-a-1', name: 'Team A', club_id: 'club-a-uuid' } },
      { id: 'match-b-1', club_id: 'club-b-uuid', equipo_id: 'team-b-1', equipo: { id: 'team-b-1', name: 'Team B', club_id: 'club-b-uuid' } }
    ],
    fees: [
      { id: 'fee-a-child', club_id: 'club-a-uuid', player_id: 'player-a-child', profile_id: 'family-a-id', players: { tutor_id: 'family-a-id' } },
      { id: 'fee-a-other', club_id: 'club-a-uuid', player_id: 'player-a-other', profile_id: 'other-tutor-id', players: { tutor_id: 'other-tutor-id' } },
      { id: 'fee-b-child', club_id: 'club-b-uuid', player_id: 'player-b-child', profile_id: 'family-b-id', players: { tutor_id: 'family-b-id' } }
    ],
    profiles: [
      { id: 'admin-a-id', role: 'admin', club_id: 'club-a-uuid' },
      { id: 'coach-a-id', role: 'entrenador', club_id: 'club-a-uuid' },
      { id: 'coach-b-id', role: 'entrenador', club_id: 'club-b-uuid' }
    ],
    teams: [
      { id: 'team-a-1', club_id: 'club-a-uuid' },
      { id: 'team-b-1', club_id: 'club-b-uuid' }
    ],
    team_coaches: [
      { team_id: 'team-a-1', profile_id: 'coach-a-id' }
    ]
  };


  const client = createMockAdminClient(mockDbData) as any;

  // 1. Cross-Tenant Player Reading (Expediente, Ficha, Tallas, etc.)
  const p1 = await canUserAccessPlayer(client, mockAdminClubA, 'player-b-child');
  assert(!p1.allowed, 'Admin Club A cannot read Player of Club B (IDOR/Cross-Tenant blocked)', p1.reason);

  const p2 = await canUserAccessPlayer(client, mockCoachClubA, 'player-b-child');
  assert(!p2.allowed, 'Coach Club A cannot read Player of Club B (Cross-Tenant blocked)', p2.reason);

  const p3 = await canUserAccessPlayer(client, mockFamilyClubA, 'player-b-child');
  assert(!p3.allowed, 'Family Club A cannot read Player of Club B (Cross-Tenant blocked)', p3.reason);

  const p4 = await canUserAccessPlayer(client, mockFamilyClubA, 'player-a-other');
  assert(!p4.allowed, 'Family Club A cannot read other family player in Club A (Horizontal escalation blocked)', p4.reason);

  const p5 = await canUserAccessPlayer(client, mockFamilyClubA, 'player-a-child');
  assert(p5.allowed, 'Family Club A can read their own child player ficha/expediente');

  const p6 = await canUserAccessPlayer(client, mockAdminClubA, 'player-a-child');
  assert(p6.allowed, 'Admin Club A can read player of own club');

  // 2. Cross-Tenant Match Reading & Editing
  const m1 = await canUserAccessMatch(client, mockAdminClubA, 'match-b-1');
  assert(!m1.allowed, 'Admin Club A cannot read/manage Match of Club B (Cross-Tenant blocked)', m1.reason);

  const m2 = await canUserAccessMatch(client, mockCoachClubA, 'match-b-1');
  assert(!m2.allowed, 'Coach Club A cannot read/manage Match of Club B (Cross-Tenant blocked)', m2.reason);

  const m3 = await canUserAccessMatch(client, mockFamilyClubA, 'match-b-1');
  assert(!m3.allowed, 'Family Club A cannot read/manage Match of Club B (Cross-Tenant blocked)', m3.reason);

  const m4 = await canUserAccessMatch(client, mockAdminClubA, 'match-a-1');
  assert(m4.allowed, 'Admin Club A can access Match of own club');

  const m5 = await canUserAccessMatch(client, mockCoachClubA, 'match-a-1');
  assert(m5.allowed, 'Coach Club A can access assigned match of own team');

  // 3. Cross-Tenant Financial Fees & Receipts
  const f1 = await canUserAccessFee(client, mockAdminClubA, 'fee-b-child');
  assert(!f1.allowed, 'Admin Club A cannot access Fee/Receipt of Club B (Cross-Tenant blocked)', f1.reason);

  const f2 = await canUserAccessFee(client, mockFamilyClubA, 'fee-b-child');
  assert(!f2.allowed, 'Family Club A cannot access Fee/Receipt of Club B (Cross-Tenant blocked)', f2.reason);

  const f3 = await canUserAccessFee(client, mockFamilyClubA, 'fee-a-other');
  assert(!f3.allowed, 'Family Club A cannot access other family Fee/Receipt in Club A (Horizontal escalation blocked)', f3.reason);

  const f4 = await canUserAccessFee(client, mockFamilyClubA, 'fee-a-child');
  assert(f4.allowed, 'Family Club A can access own child Fee/Receipt');

  const f5 = await canUserAccessFee(client, mockAdminClubA, 'fee-a-child');
  assert(f5.allowed, 'Admin Club A can access Fee of own club');

  // 4. Cross-Tenant Staff Reading & Management
  const s1 = await canUserManageClubStaff(client, mockAdminClubA, 'coach-b-id');
  assert(!s1.allowed, 'Admin Club A cannot read/manage Staff of Club B (Cross-Tenant blocked)', s1.reason);

  const s2 = await canUserManageClubStaff(client, mockCoachClubA, 'admin-a-id');
  assert(!s2.allowed, 'Coach Club A cannot manage Admin of Club A (Vertical escalation blocked)', s2.reason);

  const s3 = await canUserManageClubStaff(client, mockAdminClubA, 'coach-a-id');
  assert(s3.allowed, 'Admin Club A can manage Staff of own club');

  // 5. Cross-Tenant Team Management
  const t1 = await canUserManageTeam(client, mockAdminClubA, 'team-b-1');
  assert(!t1.allowed, 'Admin Club A cannot access/manage Team of Club B (Cross-Tenant blocked)', t1.reason);

  const t2 = await canUserManageTeam(client, mockCoachClubA, 'team-b-1');
  assert(!t2.allowed, 'Coach Club A cannot access/manage Team of Club B (Cross-Tenant blocked)', t2.reason);

  const t3 = await canUserManageTeam(client, mockAdminClubA, 'team-a-1');
  assert(t3.allowed, 'Admin Club A can manage Team of own club');

  console.log('----------------------------------------------------');
  console.log('P05 READ CROSS-TENANT RESULTS: ' + passCount + ' PASSED, ' + failCount + ' FAILED');
  if (failCount > 0) {
    process.exit(1);
  }
}

runCrossTenantP05Tests();
