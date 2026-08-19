/**
 * Servicio Centralizado de Observabilidad Metodológica v1.0 (JS & TS)
 * Antigravity Methodology OS - Fase 5.7
 */

class MethodologyObservabilityService {
  constructor() {
    this.events = [];
    this.feedbackList = [];
  }

  logEvent(event) {
    const {
      type, // 'proposal_generated' | 'proposal_reviewed' | 'proposal_applied' | 'proposal_rejected' | 'simulation_executed' | 'fallback_triggered' | 'validation_failed'
      scope,
      teamId,
      clubId,
      metadata = {}
    } = event;

    if (!type || !clubId) {
      throw new Error("Parámetros obligatorios de observabilidad incompletos (type, clubId).");
    }

    const recorded = {
      id: `evt-${Date.now()}-${this.events.length}`,
      type,
      scope: scope || 'methodology_os',
      teamId: teamId || null,
      clubId,
      metadata,
      recordedAt: new Date().toISOString()
    };

    this.events.push(recorded);
    return recorded;
  }

  recordHumanFeedback(feedback) {
    const {
      proposalId,
      teamId,
      clubId,
      rating, // 'util' | 'parcialmente_util' | 'no_util'
      reason,
      coachComment
    } = feedback;

    if (!proposalId || !clubId || !rating) {
      throw new Error("Parámetros obligatorios de feedback humano incompletos.");
    }

    const recorded = {
      id: `fb-${Date.now()}-${this.feedbackList.length}`,
      proposalId,
      teamId: teamId || null,
      clubId,
      rating,
      reason: reason || null,
      coachComment: coachComment || null,
      recordedAt: new Date().toISOString()
    };

    this.feedbackList.push(recorded);
    return recorded;
  }

  getOperationalMetrics(clubId) {
    const clubEvents = clubId ? this.events.filter(e => e.clubId === clubId) : this.events;
    const clubFeedbacks = clubId ? this.feedbackList.filter(f => f.clubId === clubId) : this.feedbackList;

    const generated = clubEvents.filter(e => e.type === 'proposal_generated').length;
    const applied = clubEvents.filter(e => e.type === 'proposal_applied').length;
    const modified = clubEvents.filter(e => e.type === 'proposal_modified').length;
    const rejected = clubEvents.filter(e => e.type === 'proposal_rejected').length;
    const fallbackCount = clubEvents.filter(e => e.type === 'fallback_triggered').length;
    const validationFailed = clubEvents.filter(e => e.type === 'validation_failed').length;

    const totalDecisions = applied + modified + rejected;
    const acceptanceRate = totalDecisions > 0 ? Number(((applied / totalDecisions) * 100).toFixed(1)) : 0;
    const modificationRate = totalDecisions > 0 ? Number(((modified / totalDecisions) * 100).toFixed(1)) : 0;
    const rejectionRate = totalDecisions > 0 ? Number(((rejected / totalDecisions) * 100).toFixed(1)) : 0;
    const fallbackRate = generated > 0 ? Number(((fallbackCount / generated) * 100).toFixed(1)) : 0;

    return {
      totalEvents: clubEvents.length,
      proposals: {
        generated,
        applied,
        modified,
        rejected,
        acceptanceRate,
        modificationRate,
        rejectionRate
      },
      robustness: {
        fallbackCount,
        fallbackRate,
        validationFailedCount: validationFailed
      },
      feedbackSummary: {
        totalFeedback: clubFeedbacks.length,
        usefulCount: clubFeedbacks.filter(f => f.rating === 'util').length,
        partiallyUsefulCount: clubFeedbacks.filter(f => f.rating === 'parcialmente_util').length,
        notUsefulCount: clubFeedbacks.filter(f => f.rating === 'no_util').length
      }
    };
  }

  clear() {
    this.events = [];
    this.feedbackList = [];
  }
}

const defaultObservabilityService = new MethodologyObservabilityService();

module.exports = {
  MethodologyObservabilityService,
  defaultObservabilityService
};
