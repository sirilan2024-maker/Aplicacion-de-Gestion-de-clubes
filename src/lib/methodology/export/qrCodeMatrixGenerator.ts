import QRCode from "qrcode";
import { PDFDocument, PDFImage } from "pdf-lib";
import { EvidenceSecurityValidator } from "../externalSearch/evidenceSecurityValidator";

export interface QrGenerationResult {
  valid: boolean;
  pngBytes?: Buffer;
  url?: string;
  rejectionReason?: string;
}

export class QrCodeMatrixGenerator {
  /**
   * Generates a verified QR code buffer only if URL meets strict security and verification criteria.
   */
  public static async generateQrPng(
    url: string,
    verificationStatus: string,
    isExternal: boolean
  ): Promise<QrGenerationResult> {
    // 1. Strict status check: Only VERIFIED external exercises can have a documentary QR
    if (!isExternal || verificationStatus !== "VERIFIED") {
      return {
        valid: false,
        rejectionReason: `QR no disponible: el estado de verificación es "${verificationStatus}" (requiere "VERIFIED").`
      };
    }

    if (!url || typeof url !== "string" || !url.trim()) {
      return {
        valid: false,
        rejectionReason: "QR no disponible: URL de evidencia ausente."
      };
    }

    const trimmedUrl = url.trim();

    // 2. Strict HTTPS protocol check
    if (!trimmedUrl.startsWith("https://")) {
      return {
        valid: false,
        rejectionReason: "QR no disponible: La URL debe utilizar protocolo seguro HTTPS."
      };
    }

    // 3. Security SSRF validation
    const secCheck = EvidenceSecurityValidator.validateUrl(trimmedUrl);
    if (!secCheck.safe) {
      return {
        valid: false,
        rejectionReason: `QR rechazado por política de seguridad: ${secCheck.reason}`
      };
    }

    try {
      // 4. Generate standard ISO/IEC 18004 QR code PNG buffer
      const pngBuffer = await QRCode.toBuffer(trimmedUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 256,
        color: {
          dark: "#1e1b4b", // Deep indigo
          light: "#ffffff"
        }
      });

      return {
        valid: true,
        pngBytes: pngBuffer,
        url: trimmedUrl
      };
    } catch (err: any) {
      return {
        valid: false,
        rejectionReason: `Error al codificar QR: ${err?.message || "Fallo en motor QR"}`
      };
    }
  }

  /**
   * Helper to embed QR code directly into a pdf-lib PDFDocument instance.
   */
  public static async embedQrInPdf(
    pdfDoc: PDFDocument,
    url: string,
    verificationStatus: string,
    isExternal: boolean
  ): Promise<{ image?: PDFImage; result: QrGenerationResult }> {
    const res = await this.generateQrPng(url, verificationStatus, isExternal);
    if (!res.valid || !res.pngBytes) {
      return { result: res };
    }

    const image = await pdfDoc.embedPng(res.pngBytes);
    return { image, result: res };
  }
}
