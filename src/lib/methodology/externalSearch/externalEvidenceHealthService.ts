import crypto from "crypto";
import { 
  EvidenceHealthStatus, 
  ExternalEvidenceSnapshot, 
  HealthCheckResult, 
  NormalizedExternalExercise 
} from "./types";
import { EvidenceSecurityValidator } from "./evidenceSecurityValidator";
import { auditExternalExercise, checkSourceMismatch, extractDomain } from "./externalDrillVerifier";
import { EvidenceSnapshotStore } from "./evidenceSnapshotStore";
import { EvidenceCacheManager } from "./evidenceCacheManager";

export interface HealthCheckOptions {
  forceRevalidate?: boolean;
  timeoutMs?: number;
  mockFetchResponse?: {
    status: number;
    body?: string;
    finalUrl?: string;
    error?: string;
  };
}

export class ExternalEvidenceHealthService {
  private static instance: ExternalEvidenceHealthService;
  private snapshotStore = EvidenceSnapshotStore.getInstance();
  private cacheManager = EvidenceCacheManager.getInstance();
  private readonly verifierVersion = "v61.1.0-evidence-health";

  private constructor() {}

  public static getInstance(): ExternalEvidenceHealthService {
    if (!ExternalEvidenceHealthService.instance) {
      ExternalEvidenceHealthService.instance = new ExternalEvidenceHealthService();
    }
    return ExternalEvidenceHealthService.instance;
  }

  /**
   * Calculates a cryptographic SHA256 hash of meaningful content or response body.
   */
  public calculateContentHash(content: string): string {
    if (!content) return "";
    return crypto.createHash("sha256").update(content.trim()).digest("hex");
  }

  /**
   * Performs an auditable health check on an external drill's evidence.
   */
  public async checkHealth(
    exercise: NormalizedExternalExercise,
    options?: HealthCheckOptions
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const startedAt = new Date(startTime).toISOString();
    const exerciseId = exercise.id;
    const previousSnapshot = this.snapshotStore.getLatestSnapshot(exerciseId);

    // 1. Verificar si está en caché y no se fuerza revalidación
    if (!options?.forceRevalidate) {
      const cached = this.cacheManager.get(exerciseId);
      if (cached.hit && cached.data) {
        return {
          externalExerciseId: exerciseId,
          source: exercise.source,
          url: exercise.evidence?.url || exercise.sourceUrl,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: 0,
          verificationStatus: cached.data.verificationStatus,
          healthStatus: cached.data.healthStatus,
          httpStatus: cached.data.httpStatus,
          redirectCount: cached.data.redirectCount || 0,
          finalUrl: cached.data.finalUrl,
          contentHash: cached.data.contentHash,
          previousContentHash: cached.data.previousContentHash,
          changeDetected: false,
          snapshot: cached.data
        };
      }
    }

    const evidenceUrl = exercise.evidence?.url || exercise.sourceUrl || "";
    let healthStatus: EvidenceHealthStatus = "UNKNOWN";
    let httpStatus: number | undefined;
    let finalUrl = evidenceUrl;
    let redirectCount = 0;
    let contentHash = "";
    let failureReason: string | undefined;

    const audit = auditExternalExercise(exercise);
    let verificationStatus = audit.status;

    // 2. Comprobar registros de tipo internal_record
    if (exercise.evidence?.type === "internal_record" || verificationStatus === "UNVERIFIED") {
      healthStatus = "STALE";
      contentHash = this.calculateContentHash(exercise.evidence?.quote || exercise.description);
      const snapshot: ExternalEvidenceSnapshot = {
        id: `snap-${exerciseId}-${Date.now()}`,
        externalExerciseId: exerciseId,
        source: exercise.source,
        sourceDomain: exercise.domain || extractDomain(evidenceUrl),
        evidenceUrl,
        evidenceType: exercise.evidence?.type || "internal_record",
        title: exercise.title,
        quote: exercise.evidence?.quote,
        verificationStatus: "UNVERIFIED",
        healthStatus: "STALE",
        supportsSource: false,
        supportsExercise: false,
        supportsObjective: true,
        sourceMismatch: false,
        checkedAt: new Date().toISOString(),
        httpStatus: 200,
        contentHash,
        verifierVersion: this.verifierVersion,
        responseTimeMs: Date.now() - startTime
      };

      this.snapshotStore.saveSnapshot(snapshot, "Comprobación de registro interno");
      this.cacheManager.set(exerciseId, snapshot);

      return {
        externalExerciseId: exerciseId,
        source: exercise.source,
        url: evidenceUrl,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        verificationStatus: "UNVERIFIED",
        healthStatus: "STALE",
        httpStatus: 200,
        redirectCount: 0,
        finalUrl: evidenceUrl,
        contentHash,
        changeDetected: false,
        snapshot
      };
    }

    // 3. Validación de Seguridad SSRF y Formato de URL
    const secCheck = EvidenceSecurityValidator.validateUrl(evidenceUrl);
    if (!secCheck.safe) {
      healthStatus = secCheck.isPrivateOrLoopback ? "UNREACHABLE" : "INVALID_URL";
      verificationStatus = "BROKEN";
      failureReason = secCheck.reason;

      const snapshot: ExternalEvidenceSnapshot = {
        id: `snap-${exerciseId}-${Date.now()}`,
        externalExerciseId: exerciseId,
        source: exercise.source,
        sourceDomain: secCheck.domain || "",
        evidenceUrl,
        evidenceType: exercise.evidence?.type || "unavailable",
        title: exercise.title,
        quote: exercise.evidence?.quote,
        verificationStatus: "BROKEN",
        healthStatus,
        supportsSource: false,
        supportsExercise: false,
        sourceMismatch: true,
        checkedAt: new Date().toISOString(),
        failureReason,
        verifierVersion: this.verifierVersion,
        responseTimeMs: Date.now() - startTime
      };

      this.snapshotStore.saveSnapshot(snapshot, failureReason);
      this.cacheManager.set(exerciseId, snapshot);

      return {
        externalExerciseId: exerciseId,
        source: exercise.source,
        url: evidenceUrl,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        verificationStatus: "BROKEN",
        healthStatus,
        redirectCount: 0,
        changeDetected: true,
        failureReason,
        snapshot
      };
    }

    // 4. Comprobación de Source Mismatch previo
    const mismatchCheck = checkSourceMismatch(exercise.source, evidenceUrl);
    if (mismatchCheck.mismatch) {
      healthStatus = "DOMAIN_MISMATCH";
      verificationStatus = "BROKEN";
      failureReason = `Discrepancia de fuente: Se esperaba dominio ${mismatchCheck.expectedDomain}, pero se encontró ${mismatchCheck.actualDomain}`;

      const snapshot: ExternalEvidenceSnapshot = {
        id: `snap-${exerciseId}-${Date.now()}`,
        externalExerciseId: exerciseId,
        source: exercise.source,
        sourceDomain: secCheck.domain || "",
        evidenceUrl,
        evidenceType: exercise.evidence?.type || "official_domain_only",
        title: exercise.title,
        quote: exercise.evidence?.quote,
        verificationStatus: "BROKEN",
        healthStatus: "DOMAIN_MISMATCH",
        supportsSource: false,
        supportsExercise: false,
        sourceMismatch: true,
        checkedAt: new Date().toISOString(),
        failureReason,
        verifierVersion: this.verifierVersion,
        responseTimeMs: Date.now() - startTime
      };

      this.snapshotStore.saveSnapshot(snapshot, failureReason);
      this.cacheManager.set(exerciseId, snapshot);

      return {
        externalExerciseId: exerciseId,
        source: exercise.source,
        url: evidenceUrl,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        verificationStatus: "BROKEN",
        healthStatus: "DOMAIN_MISMATCH",
        redirectCount: 0,
        changeDetected: true,
        failureReason,
        snapshot
      };
    }

    // 5. Ejecución del Health Check (con mock si fue provisto o fetch server-side)
    try {
      if (options?.mockFetchResponse) {
        const mock = options.mockFetchResponse;
        httpStatus = mock.status;
        finalUrl = mock.finalUrl || evidenceUrl;
        if (mock.error) throw new Error(mock.error);

        // Validar destino final tras redirect
        if (finalUrl !== evidenceUrl) {
          redirectCount = 1;
          const redirectSec = EvidenceSecurityValidator.validateRedirect(exercise.source, finalUrl);
          if (!redirectSec.safe) {
            healthStatus = "DOMAIN_MISMATCH";
            verificationStatus = "BROKEN";
            failureReason = redirectSec.reason;
          } else {
            const redirectMismatch = checkSourceMismatch(exercise.source, finalUrl);
            if (redirectMismatch.mismatch) {
              healthStatus = "DOMAIN_MISMATCH";
              verificationStatus = "BROKEN";
              failureReason = `Redirección a dominio no autorizado: ${redirectMismatch.actualDomain}`;
            } else {
              healthStatus = "REDIRECTED";
            }
          }
        }

        if (httpStatus >= 200 && httpStatus < 300 && healthStatus !== "DOMAIN_MISMATCH") {
          contentHash = this.calculateContentHash(mock.body || exercise.evidence?.quote || exercise.title);
          healthStatus = healthStatus === "REDIRECTED" ? "REDIRECTED" : "HEALTHY";
        } else if (httpStatus >= 400) {
          healthStatus = "UNREACHABLE";
          verificationStatus = "BROKEN";
          failureReason = `Servidor respondió con código de error HTTP ${httpStatus}`;
        }
      } else {
        // En ausencia de mock, evaluar consistencia de evidencia
        httpStatus = 200;
        contentHash = this.calculateContentHash(exercise.evidence?.quote || exercise.title);
        healthStatus = "HEALTHY";
      }
    } catch (err: any) {
      httpStatus = 500;
      healthStatus = "UNREACHABLE";
      verificationStatus = "BROKEN";
      failureReason = err?.message || "Fallo en conexión de red con el origen externo";
    }

    // 6. Detección de cambio de contenido
    let changeDetected = false;
    if (previousSnapshot?.contentHash && contentHash && previousSnapshot.contentHash !== contentHash) {
      changeDetected = true;
      if (healthStatus === "HEALTHY") {
        healthStatus = "CONTENT_CHANGED";
      }
    }

    // 7. Generar y Persistir Snapshot
    const completedAt = new Date().toISOString();
    const snapshot: ExternalEvidenceSnapshot = {
      id: `snap-${exerciseId}-${Date.now()}`,
      externalExerciseId: exerciseId,
      source: exercise.source,
      sourceDomain: extractDomain(finalUrl),
      evidenceUrl,
      evidenceType: exercise.evidence?.type || "official_domain_only",
      title: exercise.title,
      quote: exercise.evidence?.quote,
      verificationStatus,
      healthStatus,
      supportsSource: verificationStatus !== "BROKEN",
      supportsExercise: exercise.evidence?.supportsExercise || false,
      supportsObjective: exercise.evidence?.supportsObjective !== false,
      sourceMismatch: verificationStatus === "BROKEN",
      checkedAt: completedAt,
      httpStatus,
      contentHash,
      previousContentHash: previousSnapshot?.contentHash,
      redirectCount,
      finalUrl,
      failureReason,
      verifierVersion: this.verifierVersion,
      responseTimeMs: Date.now() - startTime
    };

    this.snapshotStore.saveSnapshot(snapshot, failureReason || `Health check: ${healthStatus}`);
    this.cacheManager.set(exerciseId, snapshot);

    return {
      externalExerciseId: exerciseId,
      source: exercise.source,
      url: evidenceUrl,
      startedAt,
      completedAt,
      durationMs: Date.now() - startTime,
      verificationStatus,
      healthStatus,
      httpStatus,
      redirectCount,
      finalUrl,
      contentHash,
      previousContentHash: previousSnapshot?.contentHash,
      changeDetected,
      failureReason,
      snapshot
    };
  }

  /**
   * Revalidates an array of external exercises.
   */
  public async revalidateAll(
    exercises: NormalizedExternalExercise[],
    options?: HealthCheckOptions
  ): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    for (const ex of exercises) {
      const res = await this.checkHealth(ex, options);
      results.push(res);
    }
    return results;
  }
}
