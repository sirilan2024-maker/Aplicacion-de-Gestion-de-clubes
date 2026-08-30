import { 
  canUserManageClubStaff, 
  canUserManageTeam, 
  canUserManageRegistration, 
  canUserAccessPlayer, 
  canUserAccessMatch,
  canUserAccessFee,
  canUserDeleteTeam,
  canUserUpdateRegistrationEmail,
  canUserUpdateStaffProfile,
  AuthenticatedContext
} from '../src/lib/auth-helpers';

async function runCrossTenantP04Tests() {
  console.log('--- STARTING P04 CROSS-TENANT & PRIVILEGE ESCALATION TESTS ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
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
    profile: { id: 'family-a-id', role: 'family', roles: ['family'], club_id: 'club-a-uuid' }
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
              return { data: found || null, error: found ? null : new Error('Not found') };
            }
          }),
          single: async () => {
            const rows = dbData[tableName] || [];
            const found = rows.find((r: any) => r[col1] === val1);
            return { data: found || null, error: found ? null : new Error('Not found') };
          },
          maybeSingle: async () => {
            const rows = dbData[tableName] || [];
            const found = rows.find((r: any) => r[col1] === val1);
            return { data: found || null, error: null };
          }
        }),
        in: (col: string, vals: any[]) => ({
          eq: (col2: string, val2: any) => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null, error: null })
            })
          })
        })
      })
    })
  });

  const mockDb = {
    profiles: [
      { id: 'admin-a-id', role: 'admin', club_id: 'club-a-uuid' },
      { id: 'coach-a-id', role: 'entrenador', club_id: 'club-a-uuid' },
      { id: 'family-a-id', role: 'family', club_id: 'club-a-uuid' },
      { id: 'admin-b-id', role: 'admin', club_id: 'club-b-uuid' },
      { id: 'staff-b-id', role: 'entrenador', club_id: 'club-b-uuid' },
    ],
    teams: [
      { id: 'team-a-uuid', name: 'Cadete A', club_id: 'club-a-uuid' },
      { id: 'team-b-uuid', name: 'Juvenil B', club_id: 'club-b-uuid' },
    ],
    players: [
      { id: 'player-a-uuid', first_name: 'Player', last_name: 'A', club_id: 'club-a-uuid', team_id: 'team-a-uuid', tutor_id: 'family-a-id' },
      { id: 'player-b-uuid', first_name: 'Player', last_name: 'B', club_id: 'club-b-uuid', team_id: 'team-b-uuid', tutor_id: 'family-b-id' },
    ],
    partidos: [
      { id: 'match-a-uuid', equipo_id: 'team-a-uuid', equipo: { id: 'team-a-uuid', club_id: 'club-a-uuid' } },
      { id: 'match-b-uuid', equipo_id: 'team-b-uuid', equipo: { id: 'team-b-uuid', club_id: 'club-b-uuid' } },
    ],
    registrations: [
      { id: 'reg-a-uuid', club_id: 'club-a-uuid', status: 'PENDING' },
      { id: 'reg-b-uuid', club_id: 'club-b-uuid', status: 'PENDING' },
    ],
    fees: [
      { id: 'fee-a-uuid', club_id: 'club-a-uuid', profile_id: 'family-a-id', player_id: 'player-a-uuid' },
      { id: 'fee-b-uuid', club_id: 'club-b-uuid', profile_id: 'family-b-id', player_id: 'player-b-uuid' },
    ],
    team_coaches: [
      { id: 'tc-a-uuid', team_id: 'team-a-uuid', profile_id: 'coach-a-id', club_id: 'club-a-uuid' }
    ],
    player_tutors: [
      { id: 'pt-a-uuid', player_id: 'player-a-uuid', tutor_id: 'family-a-id' }
    ]
  };

  const mockClient = createMockAdminClient(mockDb) as any;

  // 1. Staff management
  const res1 = await canUserManageClubStaff(mockClient, mockAdminClubA, 'coach-a-id');
  assert(res1.allowed === true, 'Club A admin can manage Club A staff');

  const res2 = await canUserManageClubStaff(mockClient, mockAdminClubA, 'staff-b-id');
  assert(res2.allowed === false, 'Cross-tenant: Club A admin CANNOT manage Club B staff', res2.reason);

  const res3 = await canUserManageClubStaff(mockClient, mockFamilyClubA, 'coach-a-id');
  assert(res3.allowed === false, 'Privilege Escalation: Family CANNOT manage staff', res3.reason);

  // 2. Team management
  const res4 = await canUserManageTeam(mockClient, mockAdminClubA, 'team-a-uuid');
  assert(res4.allowed === true, 'Club A admin can manage Club A team');

  const res5 = await canUserManageTeam(mockClient, mockAdminClubA, 'team-b-uuid');
  assert(res5.allowed === false, 'Cross-tenant: Club A admin CANNOT manage Club B team', res5.reason);

  const res6 = await canUserManageTeam(mockClient, mockCoachClubA, 'team-a-uuid');
  assert(res6.allowed === true, 'Assigned coach can manage assigned team');

  const res7 = await canUserManageTeam(mockClient, mockFamilyClubA, 'team-a-uuid');
  assert(res7.allowed === false, 'Privilege Escalation: Family CANNOT manage team', res7.reason);

  // 3. Registrations
  const res8 = await canUserManageRegistration(mockClient, mockAdminClubA, 'reg-a-uuid');
  assert(res8.allowed === true, 'Club A admin can manage Club A registration');

  const res9 = await canUserManageRegistration(mockClient, mockAdminClubA, 'reg-b-uuid');
  assert(res9.allowed === false, 'Cross-tenant: Club A admin CANNOT manage Club B registration', res9.reason);

  const res10 = await canUserManageRegistration(mockClient, mockFamilyClubA, 'reg-a-uuid');
  assert(res10.allowed === false, 'Privilege Escalation: Family CANNOT approve registrations', res10.reason);

  // 4. Players
  const res11 = await canUserAccessPlayer(mockClient, mockAdminClubA, 'player-a-uuid');
  assert(res11.allowed === true, 'Club A admin can access Club A player');

  const res12 = await canUserAccessPlayer(mockClient, mockAdminClubA, 'player-b-uuid');
  assert(res12.allowed === false, 'Cross-tenant: Club A admin CANNOT access Club B player', res12.reason);

  const res13 = await canUserAccessPlayer(mockClient, mockFamilyClubA, 'player-a-uuid');
  assert(res13.allowed === true, 'Tutor can access own player');

  const res14 = await canUserAccessPlayer(mockClient, mockFamilyClubA, 'player-b-uuid');
  assert(res14.allowed === false, 'Cross-tenant/IDOR: Tutor CANNOT access other club player', res14.reason);

  // 5. Matches
  const res15 = await canUserAccessMatch(mockClient, mockAdminClubA, 'match-a-uuid');
  assert(res15.allowed === true, 'Club A admin can access Club A match');

  const res16 = await canUserAccessMatch(mockClient, mockAdminClubA, 'match-b-uuid');
  assert(res16.allowed === false, 'Cross-tenant: Club A admin CANNOT access Club B match', res16.reason);

  // 6. Fees
  const res17 = await canUserAccessFee(mockClient, mockAdminClubA, 'fee-a-uuid');
  assert(res17.allowed === true, 'Club A admin can access Club A fee');

  const res18 = await canUserAccessFee(mockClient, mockAdminClubA, 'fee-b-uuid');
  assert(res18.allowed === false, 'Cross-tenant: Club A admin CANNOT access Club B fee', res18.reason);

  console.log('----------------------------------------------------');
  console.log(`P04 CROSS-TENANT RESULTS: ${passCount} PASS, ${failCount} FAIL`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runCrossTenantP04Tests();
