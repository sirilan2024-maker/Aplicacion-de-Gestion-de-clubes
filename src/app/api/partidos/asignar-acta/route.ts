import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const contentType = req.headers.get("content-type") || "";

    // Opción A: Subida directa mediante FormData
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const partidoId = formData.get("partidoId") as string;

      if (!file || !partidoId) {
        return NextResponse.json({ error: "Faltan parámetros requeridos (file, partidoId)" }, { status: 400 });
      }

      const assignedPath = `partidos/${partidoId}/acta_oficial.pdf`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("actas-partidos")
        .upload(assignedPath, buffer, {
          contentType: "application/pdf",
          upsert: true
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { error: dbError } = await supabase
        .from("partidos")
        .update({ acta_oficial_url: assignedPath })
        .eq("id", partidoId);

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        assignedPath
      });
    }

    // Opción B: Asignación desde pending en JSON
    const { pendingPath, partidoId } = await req.json();

    if (!pendingPath || !partidoId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos (pendingPath, partidoId)" }, { status: 400 });
    }

    const assignedPath = `partidos/${partidoId}/acta_oficial.pdf`;

    // Copiar el archivo desde pending a partidos/[partidoId]/acta_oficial.pdf
    const { error: moveError } = await supabase.storage
      .from("actas-partidos")
      .move(pendingPath, assignedPath);

    if (moveError) {
      // Si el destino ya existe, intentar copy u overwrite
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("actas-partidos")
        .download(pendingPath);

      if (downloadError || !fileData) {
        return NextResponse.json({ error: downloadError?.message || "No se pudo leer el archivo pendiente" }, { status: 500 });
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("actas-partidos")
        .upload(assignedPath, buffer, {
          contentType: "application/pdf",
          upsert: true
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      // Borrar el original pendiente
      await supabase.storage.from("actas-partidos").remove([pendingPath]);
    }

    // Actualizar el partido en la base de datos
    const { error: dbError } = await supabase
      .from("partidos")
      .update({ acta_oficial_url: assignedPath })
      .eq("id", partidoId);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      assignedPath
    });
  } catch (err: any) {
    console.error("[asignar-acta] Error:", err);
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
