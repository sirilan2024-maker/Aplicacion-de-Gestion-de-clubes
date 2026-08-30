export type ExternalVerificationStatus = "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "BROKEN";

export type ExternalEvidenceType =
  | "exact_exercise_page"
  | "official_document"
  | "official_training_resource"
  | "official_domain_only"
  | "internal_record"
  | "unavailable";

export interface ExternalEvidence {
  type: ExternalEvidenceType;
  url?: string;
  quote?: string;
  title?: string;
  checkedAt?: string;
  supportsExercise: boolean;
  supportsSource: boolean;
  supportsObjective?: boolean;
}

export interface ExternalSearchFilters {
  ageCategory?: string;
  phase?: string;
  difficulty?: number;
  minPlayers?: number;
  maxPlayers?: number;
  durationMin?: number;
  equipment?: string[];
  tags?: string[];
  requireVerifiedOnly?: boolean;
}

export interface NormalizedExternalExercise {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  thumbnail?: string;
  ageCategory: string;
  players: string;
  duration: number;
  equipment: string[];
  tags: string[];
  tacticalObjective?: string;
  technicalObjective?: string;
  difficulty: number;
  external: true;
  verificationStatus?: ExternalVerificationStatus;
  domain?: string;
  domainVerified?: boolean;
  exerciseEvidenceVerified?: boolean;
  externalEvidence?: string;
  evidence?: ExternalEvidence;
  dominantObjective?: string;
  sourceMismatch?: boolean;
}

export interface ExternalSearchResponse {
  success: boolean;
  provider: string;
  query: string;
  totalResults: number;
  results: NormalizedExternalExercise[];
  cached?: boolean;
  responseTimeMs: number;
  error?: string;
}

// ─── FASE 61: PERSISTENCIA, CACHÉ AUDITABLE Y MONITORIZACIÓN ─────────────────

export type EvidenceHealthStatus =
  | "HEALTHY"
  | "STALE"
  | "CONTENT_CHANGED"
  | "REDIRECTED"
  | "UNREACHABLE"
  | "DOMAIN_MISMATCH"
  | "INVALID_URL"
  | "UNKNOWN";

export type EvidenceFreshnessStatus = "FRESH" | "STALE" | "EXPIRED";

export interface ExternalEvidenceSnapshot {
  id: string;
  externalExerciseId: string;
  source: string;
  sourceDomain: string;
  evidenceUrl?: string;
  evidenceType: ExternalEvidenceType;
  title?: string;
  quote?: string;
  verificationStatus: ExternalVerificationStatus;
  healthStatus: EvidenceHealthStatus;
  supportsSource: boolean;
  supportsExercise: boolean;
  supportsObjective?: boolean;
  sourceMismatch: boolean;
  checkedAt: string;
  httpStatus?: number;
  contentHash?: string;
  previousContentHash?: string;
  redirectCount?: number;
  finalUrl?: string;
  failureReason?: string;
  verifierVersion: string;
  responseTimeMs?: number;
}

export interface EvidenceHistoryEntry {
  id: string;
  externalExerciseId: string;
  timestamp: string;
  previousStatus: ExternalVerificationStatus;
  newStatus: ExternalVerificationStatus;
  previousHealthStatus?: EvidenceHealthStatus;
  newHealthStatus: EvidenceHealthStatus;
  reason: string;
  httpStatus?: number;
  contentHash?: string;
  checkedAt: string;
}

export interface HealthCheckResult {
  externalExerciseId: string;
  source: string;
  url?: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  verificationStatus: ExternalVerificationStatus;
  healthStatus: EvidenceHealthStatus;
  httpStatus?: number;
  redirectCount: number;
  finalUrl?: string;
  contentHash?: string;
  previousContentHash?: string;
  changeDetected: boolean;
  failureReason?: string;
  snapshot: ExternalEvidenceSnapshot;
}



