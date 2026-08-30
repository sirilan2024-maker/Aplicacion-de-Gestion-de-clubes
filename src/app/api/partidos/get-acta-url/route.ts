import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedContext, canUserAccessMatch } from "@/lib/auth-helpers";

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
    let storagePath = match.acta_oficial_url;

    if (!storagePath) {
      storagePath = `partidos/${partidoId}/acta_oficial.pdf`;
    }

    // 3. Generar Signed URL con TTL de 900 segundos (15 minutos)
    const { data, error: urlError } = await supabase.storage
      .from("actas-partidos")
      .createSignedUrl(storagePath, 900);

    if (urlError || !data?.signedUrl) {
      const friendlyError = urlError?.message?.includes("not found")
        ? "Este partido aún no dispone de un acta oficial de la federación subida."
        : (urlError?.message || "El partido no dispone de acta oficial subida");

      return NextResponse.json({
        hasActa: false,
        error: friendlyError
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      hasActa: true,
      signedUrl: data.signedUrl,
      expiresAt: Date.now() + 900 * 1000
    });
  } catch (err: any) {
    console.error("[get-acta-url] Error:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

