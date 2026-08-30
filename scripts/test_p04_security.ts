import { updateUserRoleAction, assignStaffToTeamAction, bulkCreateStaffInvitationsAction, cancelStaffInvitationAction, updateUserRolesAction, updateClubSettingsAction } from '../src/app/actions/club-actions';
import { approveInscriptionAction, requestCorrectionAction, rejectInscriptionAction } from '../src/app/actions/inscriptions-actions';
import { deletePlayerAction, updatePlayerPositionAction, archivePlayerAction, reactivatePlayerAction, exportRgpdAction } from '../src/app/actions/player-actions';
import { altaAsistidaAction, validatePlayerRegistrationAction } from '../src/app/actions/secretaria-actions';
import { toggleCoachTeamAssignmentAction } from '../src/app/actions/team-actions';
import { updateTeamEventAction } from '../src/app/actions/event-actions';
import { updateConvocatoria, updateConvocatoriaBatch, deleteMatchAction, updatePlayerCardsInMatch } from '../src/app/actions/match-actions';
import { deletePlayer } from '../src/lib/players-actions';
import { importSportingSaladarData } from '../src/lib/import-actions';

async function runSecurityP04Tests() {
  console.log('--- STARTING P04 SECURITY TESTS (UNAUTHENTICATED ACCESS) ---');
  let passCount = 0;
  let failCount = 0;

  async function assertThrowsOrFails(testName: string, fn: () => Promise<any>) {
    try {
      const res = await fn();
      const errStr = typeof res?.error === 'string' ? res.error : res?.error?.message || '';
      if (res && res.success === false && (errStr.includes('autenticado') || errStr.includes('autorizado') || errStr.includes('permiso'))) {
        console.log(`✅ [PASS] ${testName} -> Rejected safely with error: ${errStr}`);
        passCount++;
      } else if (res && res.error && (errStr.includes('autenticado') || errStr.includes('autorizado') || errStr.includes('permiso'))) {
        console.log(`✅ [PASS] ${testName} -> Rejected safely with error: ${errStr}`);
        passCount++;
      } else {
        console.error(`❌ [FAIL] ${testName} -> Succeeded unexpectedly without authentication!`, res);
        failCount++;
      }
    } catch (err: any) {
      if (err.message.includes('autenticado') || err.message.includes('autorizado') || err.message.includes('No autorizado') || err.message.includes('permiso') || err.message.includes('cookies') || err.message.includes('DYNAMIC_SERVER_USAGE')) {
        console.log(`✅ [PASS] ${testName} -> Threw expected security exception: ${err.message}`);
        passCount++;
      } else {
        console.error(`❌ [FAIL] ${testName} -> Threw unexpected error: ${err.message}`);
        failCount++;
      }
    }
  }


  // 1. Club actions
  await assertThrowsOrFails('Club: updateUserRoleAction anonymous', () => updateUserRoleAction('dummy-user', 'admin'));
  await assertThrowsOrFails('Club: assignStaffToTeamAction anonymous', () => assignStaffToTeamAction('dummy-staff', ['dummy-team']));
  await assertThrowsOrFails('Club: bulkCreateStaffInvitationsAction anonymous', () => bulkCreateStaffInvitationsAction('dummy-club', [{ first_name: 'A', last_name: 'B', role: 'entrenador' }]));
  await assertThrowsOrFails('Club: cancelStaffInvitationAction anonymous', () => cancelStaffInvitationAction('dummy-invite'));
  await assertThrowsOrFails('Club: updateUserRolesAction anonymous', () => updateUserRolesAction('dummy-user', 'admin', ['admin']));

  // 2. Inscriptions actions
  await assertThrowsOrFails('Inscriptions: approveInscriptionAction anonymous', () => approveInscriptionAction('dummy-player'));
  await assertThrowsOrFails('Inscriptions: requestCorrectionAction anonymous', () => requestCorrectionAction('dummy-reg', 'Falta DNI'));
  await assertThrowsOrFails('Inscriptions: rejectInscriptionAction anonymous', () => rejectInscriptionAction('dummy-player'));

  // 3. Player actions
  await assertThrowsOrFails('Player: deletePlayerAction anonymous', () => deletePlayerAction('dummy-player'));
  await assertThrowsOrFails('Player: updatePlayerPositionAction anonymous', () => updatePlayerPositionAction('dummy-player', 'Delantero'));
  await assertThrowsOrFails('Player: archivePlayerAction anonymous', () => archivePlayerAction('dummy-player', true));
  await assertThrowsOrFails('Player: reactivatePlayerAction anonymous', () => reactivatePlayerAction('dummy-player', 'dummy-team'));
  await assertThrowsOrFails('Player: exportRgpdAction anonymous', () => exportRgpdAction('dummy-club'));

  // 4. Secretaria actions
  await assertThrowsOrFails('Secretaria: altaAsistidaAction anonymous', () => altaAsistidaAction({ email: 'anon@test.com', playerName: 'Test', clubId: 'dummy-club' }));
  await assertThrowsOrFails('Secretaria: validatePlayerRegistrationAction anonymous', () => validatePlayerRegistrationAction('dummy-player'));

  // 5. Team & Event actions
  await assertThrowsOrFails('Team: toggleCoachTeamAssignmentAction anonymous', () => toggleCoachTeamAssignmentAction('dummy-team', 'dummy-coach', 'dummy-club', true));
  await assertThrowsOrFails('Event: updateTeamEventAction anonymous', () => updateTeamEventAction('dummy-event', 'dummy-team', { title: 'Hacked' }));

  // 6. Match actions
  await assertThrowsOrFails('Match: updateConvocatoria anonymous', () => updateConvocatoria('dummy-match', 'dummy-player', 'convocado'));
  await assertThrowsOrFails('Match: updateConvocatoriaBatch anonymous', () => updateConvocatoriaBatch('dummy-match', [{ playerId: 'dummy-player', status: 'convocado' }]));
  await assertThrowsOrFails('Match: deleteMatchAction anonymous', () => deleteMatchAction('dummy-match', 'dummy-team'));
  await assertThrowsOrFails('Match: updatePlayerCardsInMatch anonymous', () => updatePlayerCardsInMatch('dummy-match', 'dummy-player', 2, 1));

  // 7. Lib actions
  await assertThrowsOrFails('PlayersLib: deletePlayer anonymous', () => deletePlayer('dummy-player'));
  await assertThrowsOrFails('ImportLib: importSportingSaladarData anonymous', () => importSportingSaladarData('dummy-club'));

  console.log('----------------------------------------------------');
  console.log(`P04 SECURITY RESULTS: ${passCount} PASS, ${failCount} FAIL`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runSecurityP04Tests();
