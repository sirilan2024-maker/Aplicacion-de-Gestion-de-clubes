import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const partidoId = searchParams.get("partidoId");

    if (!partidoId) {
      return NextResponse.json({ error: "Falta el parámetro partidoId" }, { status: 400 });
    }

    // Consultar la ruta en la base de datos
    const { data: match, error: dbError } = await supabase
      .from("partidos")
      .select("id, acta_oficial_url")
      .eq("id", partidoId)
      .single();

    let storagePath = match?.acta_oficial_url;

    if (!storagePath) {
      // Probar si existe la ruta por defecto
      storagePath = `partidos/${partidoId}/acta_oficial.pdf`;
    }

    // Generar Signed URL con TTL de 900 segundos (15 minutos)
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
