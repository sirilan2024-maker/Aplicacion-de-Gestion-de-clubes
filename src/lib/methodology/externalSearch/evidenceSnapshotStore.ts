import { EvidenceHistoryEntry, ExternalEvidenceSnapshot } from "./types";

/**
 * In-memory & deterministic persistent store for external evidence snapshots and audit history.
 * Preserves full auditability and idempotency without touching the frozen public.banco_ejercicios table.
 */
export class EvidenceSnapshotStore {
  private static instance: EvidenceSnapshotStore;
  
  // Latest snapshot per external exercise ID
  private snapshots: Map<string, ExternalEvidenceSnapshot> = new Map();
  
  // Chronological history of transitions per external exercise ID
  private history: Map<string, EvidenceHistoryEntry[]> = new Map();

  private constructor() {}

  public static getInstance(): EvidenceSnapshotStore {
    if (!EvidenceSnapshotStore.instance) {
      EvidenceSnapshotStore.instance = new EvidenceSnapshotStore();
    }
    return EvidenceSnapshotStore.instance;
  }

  /**
   * Clears in-memory storage (useful for isolated deterministic test suites).
   */
  public reset(): void {
    this.snapshots.clear();
    this.history.clear();
  }

  /**
   * Retrieves the latest verified snapshot for a given external drill.
   */
  public getLatestSnapshot(externalExerciseId: string): ExternalEvidenceSnapshot | undefined {
    return this.snapshots.get(externalExerciseId);
  }

  /**
   * Returns all stored snapshots.
   */
  public getAllSnapshots(): ExternalEvidenceSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Stores a new snapshot and deterministically appends to audit history if state or content changed.
   */
  public saveSnapshot(snapshot: ExternalEvidenceSnapshot, reason = "Comprobación de evidencia periódica"): {
    isNew: boolean;
    stateChanged: boolean;
    contentChanged: boolean;
  } {
    const existing = this.snapshots.get(snapshot.externalExerciseId);
    let stateChanged = false;
    let contentChanged = false;

    if (!existing) {
      this.snapshots.set(snapshot.externalExerciseId, snapshot);
      this.appendHistory({
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        externalExerciseId: snapshot.externalExerciseId,
        timestamp: snapshot.checkedAt,
        previousStatus: "UNVERIFIED",
        newStatus: snapshot.verificationStatus,
        previousHealthStatus: "UNKNOWN",
        newHealthStatus: snapshot.healthStatus,
        reason: `Registro inicial: ${reason}`,
        httpStatus: snapshot.httpStatus,
        contentHash: snapshot.contentHash,
        checkedAt: snapshot.checkedAt
      });
      return { isNew: true, stateChanged: true, contentChanged: false };
    }

    stateChanged = existing.verificationStatus !== snapshot.verificationStatus || existing.healthStatus !== snapshot.healthStatus;
    contentChanged = Boolean(snapshot.contentHash && existing.contentHash && snapshot.contentHash !== existing.contentHash);

    // Actualizar snapshot
    this.snapshots.set(snapshot.externalExerciseId, snapshot);

    // Si hubo cambio de estado, cambio de contenido o degradación, registrar entrada histórica
    if (stateChanged || contentChanged) {
      this.appendHistory({
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        externalExerciseId: snapshot.externalExerciseId,
        timestamp: snapshot.checkedAt,
        previousStatus: existing.verificationStatus,
        newStatus: snapshot.verificationStatus,
        previousHealthStatus: existing.healthStatus,
        newHealthStatus: snapshot.healthStatus,
        reason: contentChanged ? "Contenido modificado en origen externo" : reason,
        httpStatus: snapshot.httpStatus,
        contentHash: snapshot.contentHash,
        checkedAt: snapshot.checkedAt
      });
    }

    return { isNew: false, stateChanged, contentChanged };
  }

  /**
   * Appends an entry to the audit history.
   */
  private appendHistory(entry: EvidenceHistoryEntry): void {
    const list = this.history.get(entry.externalExerciseId) || [];
    list.push(entry);
    this.history.set(entry.externalExerciseId, list);
  }

  /**
   * Retrieves chronological audit history for an exercise.
   */
  public getHistory(externalExerciseId: string): EvidenceHistoryEntry[] {
    return this.history.get(externalExerciseId) || [];
  }
}
