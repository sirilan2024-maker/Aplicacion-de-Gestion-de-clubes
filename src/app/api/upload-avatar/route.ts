import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const playerId = formData.get("playerId") as string | null;

    if (!file || !playerId) {
      return NextResponse.json({ error: "Faltan datos: archivo o playerId" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${playerId}-${Date.now()}.${fileExt}`;
    const filePath = `jugadores/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Supabase Storage con admin client (bypasa RLS)
    const { error: uploadError } = await adminClient.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = adminClient.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Actualizar la DB
    const { error: updateError } = await adminClient
      .from("players")
      .update({ avatar_url: publicUrl })
      .eq("id", playerId);

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
