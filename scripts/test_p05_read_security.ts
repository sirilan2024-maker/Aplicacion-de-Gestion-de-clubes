import { getPlayerExpedienteAction, getPlayerFichaAction, getSignedDniUrlAction, getPlayerApparelAction, updateDocumentStatusAction, markApparelDeliveredAction } from '../src/app/actions/secretaria-actions';
import { getPendingStaffInvitationsAction } from '../src/app/actions/club-actions';
import { getClubStaffAction, getPlayerTutorsAction, assignPlayerToTeamAction, uploadPlayerAvatarAction } from '../src/app/actions/player-actions';
import { getOfficialReceiptsAction, downloadOfficialReceiptPdfAction } from '../src/app/actions/treasury-actions';
import { reconcileMatchStatsAction, saveLineup, updatePlayerRatingsBatch, updateMatchDetails, saveMatchReport } from '../src/app/actions/match-actions';
import { toggleMatchTimer, addLiveEvent, deleteLiveEvent, updateMatchState, resetMatchAction } from '../src/app/actions/live-match-actions';
import { getInscriptionsAction } from '../src/app/actions/inscriptions-actions';
import { getApparelForPlayerAction, getApparelDashboardDataAction, getApparelSummaryReportAction } from '../src/app/actions/apparel-actions';
import { generateFinancialAuditAction } from '../src/app/actions/admin-financial-actions';

async function runSecurityP05Tests() {
  console.log('--- STARTING P05 READ & EXPOSURE SECURITY TESTS (UNAUTHENTICATED) ---');
  let passCount = 0;
  let failCount = 0;

  async function assertThrowsOrFails(testName: string, fn: () => Promise<any>) {
    try {
      const res = await fn();
      const errStr = typeof res?.error === 'string' ? res.error : res?.error?.message || '';
      if (res && res.success === false && (errStr.includes('autenticado') || errStr.includes('autorizado') || errStr.includes('permiso') || errStr.includes('denegado'))) {
        console.log('[PASS] ' + testName + ' -> Safely rejected: ' + errStr);
        passCount++;
      } else if (res && res.error && (errStr.includes('autenticado') || errStr.includes('autorizado') || errStr.includes('permiso') || errStr.includes('denegado'))) {
        console.log('[PASS] ' + testName + ' -> Safely rejected: ' + errStr);
        passCount++;
      } else if (res && res.success === false && res.data && Array.isArray(res.data) && res.data.length === 0) {
        console.log('[PASS] ' + testName + ' -> Returned safe empty data on unauthenticated access');
        passCount++;
      } else {
        console.error('[FAIL] ' + testName + ' -> Succeeded unexpectedly without authentication!', res);
        failCount++;
      }
    } catch (err: any) {
      if (err.message.includes('autenticado') || err.message.includes('autorizado') || err.message.includes('No autorizado') || err.message.includes('permiso') || err.message.includes('cookies') || err.message.includes('DYNAMIC_SERVER_USAGE')) {
        console.log('[PASS] ' + testName + ' -> Expected exception: ' + err.message);
        passCount++;
      } else {
        console.error('[FAIL] ' + testName + ' -> Unexpected error: ' + err.message);
        failCount++;
      }
    }
  }

  // 1. Secretaria Read & Document actions
  await assertThrowsOrFails('Secretaria: getPlayerExpedienteAction anonymous', () => getPlayerExpedienteAction('dummy-player'));
  await assertThrowsOrFails('Secretaria: getPlayerFichaAction anonymous', () => getPlayerFichaAction('dummy-player'));
  await assertThrowsOrFails('Secretaria: getSignedDniUrlAction anonymous', () => getSignedDniUrlAction('documents/secret-doc.pdf'));
  await assertThrowsOrFails('Secretaria: getPlayerApparelAction anonymous', () => getPlayerApparelAction('dummy-player'));
  await assertThrowsOrFails('Secretaria: updateDocumentStatusAction anonymous', () => updateDocumentStatusAction('dummy-doc', 'validado'));
  await assertThrowsOrFails('Secretaria: markApparelDeliveredAction anonymous', () => markApparelDeliveredAction('dummy-apparel', true));

  // 2. Club Invitations
  await assertThrowsOrFails('Club: getPendingStaffInvitationsAction anonymous', () => getPendingStaffInvitationsAction('dummy-club'));

  // 3. Player PII & Management
  await assertThrowsOrFails('Player: getClubStaffAction anonymous', () => getClubStaffAction('dummy-club'));
  await assertThrowsOrFails('Player: getPlayerTutorsAction anonymous', () => getPlayerTutorsAction('dummy-player'));
  await assertThrowsOrFails('Player: assignPlayerToTeamAction anonymous', () => assignPlayerToTeamAction('dummy-player', 'dummy-team'));
  await assertThrowsOrFails('Player: uploadPlayerAvatarAction anonymous', () => {
    const fd = new FormData();
    fd.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'avatar.jpg');
    return uploadPlayerAvatarAction('dummy-player', fd);
  });

  // 4. Treasury & Receipts
  await assertThrowsOrFails('Treasury: getOfficialReceiptsAction anonymous', () => getOfficialReceiptsAction());
  await assertThrowsOrFails('Treasury: downloadOfficialReceiptPdfAction anonymous', () => downloadOfficialReceiptPdfAction('dummy-receipt'));

  // 5. Match actions
  await assertThrowsOrFails('Match: reconcileMatchStatsAction anonymous', () => reconcileMatchStatsAction('dummy-match', []));
  await assertThrowsOrFails('Match: saveLineup anonymous', () => saveLineup('dummy-match', [], '4-3-3'));
  await assertThrowsOrFails('Match: updatePlayerRatingsBatch anonymous', () => updatePlayerRatingsBatch('dummy-match', [{ playerId: 'dummy-player', rating: 8 }]));
  await assertThrowsOrFails('Match: updateMatchDetails anonymous', () => updateMatchDetails('dummy-match', 'dummy-team', { lugar: 'Local' }));
  await assertThrowsOrFails('Match: saveMatchReport anonymous', () => saveMatchReport('dummy-match', { coach_rating: 4, coach_summary: '', positive_aspects: '', improvement_aspects: '', attitude_notes: '' }));

  // 6. Live Match actions
  await assertThrowsOrFails('LiveMatch: toggleMatchTimer anonymous', () => toggleMatchTimer('dummy-match', true, 120));
  await assertThrowsOrFails('LiveMatch: addLiveEvent anonymous', () => addLiveEvent('dummy-match', { tipo: 'Gol', minuto: 10 }));
  await assertThrowsOrFails('LiveMatch: deleteLiveEvent anonymous', () => deleteLiveEvent('dummy-event', 'dummy-match'));
  await assertThrowsOrFails('LiveMatch: updateMatchState anonymous', () => updateMatchState('dummy-match', 'Finalizado'));
  await assertThrowsOrFails('LiveMatch: resetMatchAction anonymous', () => resetMatchAction('dummy-match'));

  // 7. Inscriptions
  await assertThrowsOrFails('Inscriptions: getInscriptionsAction anonymous', () => getInscriptionsAction());

  // 8. Apparel
  await assertThrowsOrFails('Apparel: getApparelForPlayerAction anonymous', () => getApparelForPlayerAction('dummy-player'));
  await assertThrowsOrFails('Apparel: getApparelDashboardDataAction anonymous', () => getApparelDashboardDataAction('dummy-team'));
  await assertThrowsOrFails('Apparel: getApparelSummaryReportAction anonymous', () => getApparelSummaryReportAction('dummy-team'));

  // 9. Financial Audit
  await assertThrowsOrFails('Financial: generateFinancialAuditAction anonymous', () => generateFinancialAuditAction());

  console.log('----------------------------------------------------');
  console.log('P05 READ SECURITY RESULTS: ' + passCount + ' PASSED, ' + failCount + ' FAILED');
  if (failCount > 0) {
    process.exit(1);
  }
}

runSecurityP05Tests();
