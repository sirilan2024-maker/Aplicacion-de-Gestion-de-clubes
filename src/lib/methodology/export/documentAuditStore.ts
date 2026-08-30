import crypto from "crypto";
import { SessionPdfAuditManifest } from "./types";

export interface PublicDocumentVerificationView {
  found: boolean;
  documentId?: string;
  generatedAt?: string;
  sessionTitle?: string;
  ageCategory?: string;
  totalDurationMinutes?: number;
  primaryObjective?: string;
  secondaryObjectives?: string[];
  exercisesCount?: number;
  verifiedExternalCount?: number;
  partiallyVerifiedExternalCount?: number;
  unverifiedExternalCount?: number;
  officialCatalogCount?: number;
  exercises?: Array<{
    exerciseId: string;
    title: string;
    phase: string;
    durationMin: number;
    isExternal: boolean;
    verificationStatus: string;
    source?: string;
    sourceDomain?: string;
    evidenceType?: string;
    evidenceUrl?: string;
    evidenceQuote?: string;
    checkedAt?: string;
    contentHash?: string;
    healthStatus?: string;
  }>;
  hasLimitations?: boolean;
  limitationNotice?: string;
  generatedContentHash?: string;
  verifierVersion?: string;
  integrityStatus?: "VERIFIED_AUTHENTIC" | "CORRUPTED" | "NOT_FOUND";
  error?: string;
}

/**
 * Deterministic in-memory / persistent registry for exported document manifests.
 * Allows safe public verification of documents without exposing sensitive club/user information.
 */
export class DocumentAuditStore {
  private static instance: DocumentAuditStore;
  private documents: Map<string, SessionPdfAuditManifest> = new Map();

  private constructor() {}

  public static getInstance(): DocumentAuditStore {
    if (!DocumentAuditStore.instance) {
      DocumentAuditStore.instance = new DocumentAuditStore();
    }
    return DocumentAuditStore.instance;
  }

  /**
   * Resets the store (useful for clean test executions).
   */
  public reset(): void {
    this.documents.clear();
  }

  /**
   * Saves a generated document manifest into the registry.
   */
  public saveDocument(manifest: SessionPdfAuditManifest): void {
    if (!manifest || !manifest.documentId) return;
    this.documents.set(manifest.documentId.trim().toUpperCase(), manifest);
  }

  /**
   * Retrieves raw manifest by documentId.
   */
  public getDocument(documentId: string): SessionPdfAuditManifest | undefined {
    if (!documentId) return undefined;
    return this.documents.get(documentId.trim().toUpperCase());
  }

  /**
   * Generates a sanitized public verification view for a given documentId.
   * Ensures zero leakage of private user IDs, auth tokens, or internal database metadata.
   */
  public getPublicVerificationView(documentId: string): PublicDocumentVerificationView {
    if (!documentId || typeof documentId !== "string") {
      return { found: false, integrityStatus: "NOT_FOUND", error: "Identificador de documento no válido." };
    }

    const cleanId = documentId.trim().toUpperCase();
    
    // Validar formato estricto de identificador para evitar inyecciones o bypass
    if (!/^PDF-AUDIT-\d{8}-[A-F0-9]{8}$/.test(cleanId) && !/^TEST-/.test(cleanId)) {
      return { 
        found: false, 
        integrityStatus: "NOT_FOUND", 
        error: "Formato de identificador documental inválido." 
      };
    }

    const manifest = this.documents.get(cleanId);
    if (!manifest) {
      return {
        found: false,
        documentId: cleanId,
        integrityStatus: "NOT_FOUND",
        error: "No existe ningún documento emitido con este identificador en el registro de auditoría."
      };
    }

    // Comprobar integridad criptográfica del manifest
    const manifestSeed = JSON.stringify({
      id: manifest.documentId,
      title: manifest.sessionTitle,
      duration: manifest.totalDurationMinutes,
      drills: manifest.exercises
    });
    const recalculatedHash = crypto.createHash("sha256").update(manifestSeed).digest("hex");
    const isAuthentic = recalculatedHash === manifest.generatedContentHash;

    let verifiedCount = 0;
    let partialCount = 0;
    let unverifiedCount = 0;
    let officialCount = 0;

    const sanitizedExercises = manifest.exercises.map((ex) => {
      if (ex.isExternal) {
        if (ex.verificationStatus === "VERIFIED") verifiedCount++;
        else if (ex.verificationStatus === "PARTIALLY_VERIFIED") partialCount++;
        else unverifiedCount++;
      } else {
        officialCount++;
      }

      return {
        exerciseId: ex.exerciseId,
        title: ex.title,
        phase: ex.phase,
        durationMin: ex.durationMin,
        isExternal: ex.isExternal,
        verificationStatus: ex.verificationStatus,
        source: ex.source,
        sourceDomain: ex.sourceDomain,
        evidenceType: ex.evidence?.type,
        // Solo exponer URL pública si es VERIFIED para evitar propagar links rotos o no demostrados
        evidenceUrl: ex.verificationStatus === "VERIFIED" ? ex.evidence?.url : undefined,
        evidenceQuote: ex.evidence?.quote,
        checkedAt: ex.evidence?.checkedAt || ex.health?.checkedAt,
        contentHash: ex.evidence?.contentHash || ex.health?.contentHash,
        healthStatus: ex.health?.status
      };
    });

    return {
      found: true,
      documentId: manifest.documentId,
      generatedAt: manifest.generatedAt,
      sessionTitle: manifest.sessionTitle,
      ageCategory: manifest.ageCategory,
      totalDurationMinutes: manifest.totalDurationMinutes,
      primaryObjective: manifest.primaryObjective,
      secondaryObjectives: manifest.secondaryObjectives,
      exercisesCount: manifest.exercises.length,
      verifiedExternalCount: verifiedCount,
      partiallyVerifiedExternalCount: partialCount,
      unverifiedExternalCount: unverifiedCount,
      officialCatalogCount: officialCount,
      exercises: sanitizedExercises,
      hasLimitations: manifest.hasLimitations,
      limitationNotice: manifest.limitationNotice,
      generatedContentHash: manifest.generatedContentHash,
      verifierVersion: manifest.verifierVersion,
      integrityStatus: isAuthentic ? "VERIFIED_AUTHENTIC" : "CORRUPTED"
    };
  }
}
