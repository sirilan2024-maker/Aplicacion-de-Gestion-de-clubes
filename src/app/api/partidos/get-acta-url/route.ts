import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedContext, canUserAccessMatch } from "@/lib/auth-helpers";
import { fetchMatchDetails } from "@/lib/ffcv/client";
import { syncFFCVActaToConvocatorias } from "@/lib/ffcv/acta-sync";
import { generateFfcvActaPdfBuffer } from "@/lib/ffcv/acta-pdf-generator";

export async function GET(req: NextRequest) {
  try {
    // 1. Validar autenticación y contexto de usuario
    const { context, error: authError, statusCode } = await getAuthenticatedContext();
    if (!context || authError) {
      return NextResponse.json({ error: authError || "No autenticado" }, { status: statusCode || 401 });
    }

    const { searchParams } = new URL(req.url);
    const partidoId = searchParams.get("partidoId");

    if (!partidoId) {
      return NextResponse.json({ error: "Falta el parámetro partidoId" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 2. Validar que el partido pertenece al club del usuario
    const matchCheck = await canUserAccessMatch(supabase, context, partidoId);
    if (!matchCheck.allowed || !matchCheck.match) {
      return NextResponse.json(
        { error: matchCheck.reason || "Partido no encontrado o no autorizado" },
        { status: 403 }
      );
    }

    const match = matchCheck.match;
    const rawUrl = match.acta_oficial_url || "";
    const isHttpUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://");
    const codactaMatch = rawUrl.match(/CodPartido=(\d+)/i);
    const codacta: string | null = codactaMatch ? codactaMatch[1] : (match.ffcv_match_id || null);

    // Determinar la ruta interna en Storage para el PDF del partido
    const defaultPdfPath = `partidos/${partidoId}/acta_oficial.pdf`;
    const internalStoragePath = !isHttpUrl && rawUrl ? rawUrl : defaultPdfPath;

    // 3. Comprobar si ya existe un archivo PDF subido o generado en Supabase Storage
    const folderParts = internalStoragePath.split("/");
    const fileName = folderParts.pop() || "acta_oficial.pdf";
    const folderPath = folderParts.join("/");

    const { data: existingFiles } = await supabase.storage
      .from("actas-partidos")
      .list(folderPath, { search: fileName });

    const matchedFile = Array.isArray(existingFiles)
      ? existingFiles.find(f => f.name === fileName)
      : null;
    // Un PDF oficial CTA FFCV de 3 páginas (subido o generado con logo oficial) ocupa > 15 KB.
    // Si tiene menos de 12 KB era la versión antigua de 1 página y se regenera al formato CTA de 3 páginas.
    const fileSize = Number(matchedFile?.metadata?.size || 0);
    const fileExistsInStorage = Boolean(matchedFile && (fileSize === 0 || fileSize >= 12000));

    if (fileExistsInStorage) {
      // Si además tiene codacta FFCV, sincronizar en segundo plano las convocatorias para asegurar coherencia de tarjetas
      if (codacta) {
        fetchMatchDetails({ matchId: codacta })
          .then(details => {
            if (details) {
              return syncFFCVActaToConvocatorias(codacta, details, supabase);
            }
          })
          .catch(() => {});
      }

      const { data: signedData, error: signErr } = await supabase.storage
        .from("actas-partidos")
        .createSignedUrl(internalStoragePath, 3600);

      if (!signErr && signedData?.signedUrl) {
        return NextResponse.json({
          success: true,
          hasActa: true,
          isExternal: false,
          signedUrl: signedData.signedUrl,
          codacta,
          expiresAt: Date.now() + 3600 * 1000
        });
      }
    }

    // 4. Si no existe aún el PDF en Storage pero disponemos de codacta FFCV, generarlo automáticamente y guardarlo
    if (codacta) {
      try {
        const details = await fetchMatchDetails({ matchId: codacta });
        if (details) {
          // Sincronizar alineación y tarjetas oficiales con convocatorias (corrige cualquier discrepancia)
          await syncFFCVActaToConvocatorias(codacta, details, supabase).catch(e =>
            console.warn("[get-acta-url] Warning syncing convocatorias:", e)
          );

          const pdfBytes = await generateFfcvActaPdfBuffer(details, codacta);

          const { error: uploadErr } = await supabase.storage
            .from("actas-partidos")
            .upload(defaultPdfPath, Buffer.from(pdfBytes), {
              contentType: "application/pdf",
              upsert: true,
            });

          if (!uploadErr) {
            const { data: signedData } = await supabase.storage
              .from("actas-partidos")
              .createSignedUrl(defaultPdfPath, 3600);

            if (signedData?.signedUrl) {
              return NextResponse.json({
                success: true,
                hasActa: true,
                isExternal: false,
                signedUrl: signedData.signedUrl,
                codacta,
                pdfGenerated: true,
                expiresAt: Date.now() + 3600 * 1000
              });
            }
          }

          // Fallback en base64 si el bucket no devolvió signedUrl
          const dataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}`;
          return NextResponse.json({
            success: true,
            hasActa: true,
            isExternal: false,
            signedUrl: dataUri,
            codacta,
            pdfGenerated: true
          });
        }
      } catch (genErr: any) {
        console.warn("[get-acta-url] Could not auto-generate PDF from FFCV, falling back:", genErr?.message);
      }

      // Fallback externo si la API de FFCV no respondió en este instante
      const ffcvUrl = isHttpUrl ? rawUrl : `https://ffcv.es/dep/actas?CodPartido=${codacta}`;
      return NextResponse.json({
        success: true,
        hasActa: true,
        isExternal: true,
        actaUrl: ffcvUrl,
        signedUrl: ffcvUrl,
        codacta
      });
    }

    // 5. Si era una URL externa sin CodPartido (ej. Apúntamelo / Liga Brave)
    if (isHttpUrl) {
      return NextResponse.json({
        success: true,
        hasActa: true,
        isExternal: true,
        actaUrl: rawUrl,
        signedUrl: rawUrl,
        codacta: null
      });
    }

    return NextResponse.json({
      hasActa: false,
      error: "Este partido aún no dispone de un acta oficial de la federación subida."
    }, { status: 404 });
  } catch (err: any) {
    console.error("[get-acta-url] Error:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
