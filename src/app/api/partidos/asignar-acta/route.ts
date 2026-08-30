import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedContext, canUserAccessMatch, STAFF_ROLES } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    // 1. Validar autenticación y contexto de usuario
    const { context, error: authError, statusCode } = await getAuthenticatedContext();
    if (!context || authError) {
      return NextResponse.json({ error: authError || "No autenticado" }, { status: statusCode || 401 });
    }

    // 2. Validar rol autorizado
    if (!STAFF_ROLES.includes(context.profile.role)) {
      return NextResponse.json(
        { error: "No tienes permisos de cuerpo técnico o administración para asignar actas." },
        { status: 403 }
      );
    }

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

      // 3. Validar que el partido pertenece al club del usuario
      const matchCheck = await canUserAccessMatch(supabase, context, partidoId);
      if (!matchCheck.allowed) {
        return NextResponse.json(
          { error: matchCheck.reason || "El partido no pertenece a tu club" },
          { status: 403 }
        );
      }

      // Validar tipo PDF
      if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json({ error: "Solo se admiten documentos en formato PDF" }, { status: 400 });
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

    // 3. Validar que el partido pertenece al club del usuario
    const matchCheck = await canUserAccessMatch(supabase, context, partidoId);
    if (!matchCheck.allowed) {
      return NextResponse.json(
        { error: matchCheck.reason || "El partido no pertenece a tu club" },
        { status: 403 }
      );
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

