import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedContext, canUserAccessPlayer } from "@/lib/auth-helpers";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    // 1. Validar autenticación y contexto de usuario
    const { context, error: authError, statusCode } = await getAuthenticatedContext();
    if (!context || authError) {
      return NextResponse.json({ error: authError || "No autenticado" }, { status: statusCode || 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const playerId = formData.get("playerId") as string | null;

    if (!file || !playerId) {
      return NextResponse.json({ error: "Faltan datos: archivo o playerId" }, { status: 400 });
    }

    // 2. Validar tipo MIME
    const mimeType = file.type || "image/jpeg";
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG o WEBP." },
        { status: 400 }
      );
    }

    // 3. Validar tamaño máximo
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "El archivo supera el tamaño máximo permitido (5MB)." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 4. Validar permisos de acceso sobre el jugador (club_id y rol/relación)
    const accessCheck = await canUserAccessPlayer(adminClient, context, playerId);
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.reason || "No tienes permiso para modificar este jugador." },
        { status: 403 }
      );
    }

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${playerId}-${Date.now()}.${fileExt}`;
    const filePath = `jugadores/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Subir a Supabase Storage
    const { error: uploadError } = await adminClient.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = adminClient.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // 6. Actualizar la base de datos
    const { error: updateError } = await adminClient
      .from("players")
      .update({ avatar_url: publicUrl })
      .eq("id", playerId)
      .eq("club_id", context.profile.club_id);

    if (updateError) {
      console.error("DB update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, publicUrl });
  } catch (err: any) {
    console.error("upload-avatar API error:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

