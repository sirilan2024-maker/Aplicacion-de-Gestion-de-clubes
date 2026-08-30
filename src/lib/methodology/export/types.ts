import { 
  EvidenceFreshnessStatus, 
  EvidenceHealthStatus, 
  ExternalEvidenceType, 
  ExternalVerificationStatus 
} from "../externalSearch/types";

export interface ExercisePdfAuditEntry {
  exerciseId: string;
  title: string;
  phase: string;
  durationMin: number;
  isExternal: boolean;
  verificationStatus: ExternalVerificationStatus;
  source?: string;
  sourceDomain?: string;
  evidence?: {
    type: ExternalEvidenceType;
    url?: string;
    title?: string;
    quote?: string;
    checkedAt?: string;
    contentHash?: string;
    supportsSource?: boolean;
    supportsExercise?: boolean;
    supportsObjective?: boolean;
  };
  health?: {
    status?: EvidenceHealthStatus;
    freshness?: EvidenceFreshnessStatus;
    httpStatus?: number;
    contentHash?: string;
    checkedAt?: string;
  };
  qrIncluded: boolean;
  qrUrl?: string;
  qrRejectionReason?: string;
}

export interface SessionPdfAuditManifest {
  documentId: string;
  generatedAt: string;
  sessionId?: string;
  sessionTitle: string;
  ageCategory: string;
  playersCount: number;
  totalDurationMinutes: number;
  primaryObjective: string;
  secondaryObjectives: string[];
  exercises: ExercisePdfAuditEntry[];
  hasLimitations: boolean;
  limitationNotice?: string;
  generatedContentHash: string;
  verifierVersion: string;
}

export interface PdfExportOptions {
  clubName?: string;
  teamName?: string;
  coachName?: string;
  includeQrCodes?: boolean;
  includeAuditMatrix?: boolean;
  includeLimitations?: boolean;
}

export interface PdfExportResult {
  success: boolean;
  documentId: string;
  pdfBytes: Uint8Array;
  base64: string;
  fileName: string;
  manifest: SessionPdfAuditManifest;
  qrCount: number;
  error?: string;
}
