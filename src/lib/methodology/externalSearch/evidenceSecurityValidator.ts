import { extractDomain } from "./externalDrillVerifier";

export interface SecurityValidationResult {
  safe: boolean;
  normalizedUrl?: string;
  domain?: string;
  reason?: string;
  isPrivateOrLoopback?: boolean;
}

const PRIVATE_IP_REGEXES: RegExp[] = [
  /^127\./,                           // Loopback 127.0.0.0/8
  /^10\./,                            // Private Class A 10.0.0.0/8
  /^192\.168\./,                      // Private Class C 192.168.0.0/16
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,   // Private Class B 172.16.0.0/12
  /^169\.254\./,                      // Link-local / Cloud Metadata 169.254.0.0/16
  /^0\./,                             // Current network 0.0.0.0/8
  /^localhost$/i,                     // Localhost string
  /^::1$/,                            // IPv6 Loopback
  /^fe80:/i,                          // IPv6 Link-local
  /^fc00:/i,                          // IPv6 Unique local
  /^fd00:/i                           // IPv6 Unique local
];

const DISALLOWED_SCHEMES = new Set([
  "file:",
  "ftp:",
  "gopher:",
  "data:",
  "javascript:",
  "blob:",
  "mailto:",
  "tel:"
]);

export class EvidenceSecurityValidator {
  /**
   * Validates whether a given URL is safe to fetch server-side, preventing SSRF attacks.
   */
  public static validateUrl(url: string): SecurityValidationResult {
    if (!url || typeof url !== "string") {
      return { safe: false, reason: "URL vacía o no válida" };
    }

    const trimmed = url.trim();
    if (trimmed.length > 2048) {
      return { safe: false, reason: "URL excede longitud máxima de seguridad" };
    }

    let parsed: URL;
    try {
      if (trimmed.includes("://") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
        parsed = new URL(trimmed);
      } else {
        parsed = new URL(`https://${trimmed}`);
      }
    } catch {
      return { safe: false, reason: "Formato de URL no válido" };
    }

    // 1. Validar Esquema de Protocolo
    const protocol = parsed.protocol.toLowerCase();
    if (DISALLOWED_SCHEMES.has(protocol) || (protocol !== "http:" && protocol !== "https:")) {
      return { safe: false, reason: `Protocolo no permitido: ${parsed.protocol}` };
    }

    // 2. Extraer Hostname y filtrar Loopback / Redes Privadas
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");

    for (const regex of PRIVATE_IP_REGEXES) {
      if (regex.test(hostname)) {
        return {
          safe: false,
          domain: hostname,
          reason: `Dirección local, privada o metadata bloqueada por política de seguridad SSRF (${hostname})`,
          isPrivateOrLoopback: true
        };
      }
    }

    // 3. Bloquear intentos de bypass numérico o hexadecimal (ej. 0177.0.0.1, 2130706433)
    if (/^\d+$/.test(hostname) || /^0x[0-9a-f]+$/i.test(hostname)) {
      return {
        safe: false,
        domain: hostname,
        reason: "Formato numérico de IP codificado no permitido",
        isPrivateOrLoopback: true
      };
    }

    const domain = extractDomain(parsed.href);

    return {
      safe: true,
      normalizedUrl: parsed.href,
      domain
    };
  }

  /**
   * Validates that a redirect destination preserves source compatibility and SSRF safety.
   */
  public static validateRedirect(
    originalSource: string,
    redirectUrl: string
  ): { safe: boolean; reason?: string; finalDomain?: string } {
    const secValidation = this.validateUrl(redirectUrl);
    if (!secValidation.safe) {
      return {
        safe: false,
        reason: `Redirección insegura bloqueada: ${secValidation.reason}`,
        finalDomain: secValidation.domain
      };
    }

    return {
      safe: true,
      finalDomain: secValidation.domain
    };
  }
}
