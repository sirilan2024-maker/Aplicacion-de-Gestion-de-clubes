import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MethodologyAIProvider } from "@/lib/methodology/ai/methodologyAIProvider";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("club_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.club_id) {
      return NextResponse.json({ error: "Sin club asignado" }, { status: 403 });
    }

    const allowedRoles = ["admin", "metodologo", "coordinador", "entrenador"];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const body = await req.json();
    const { prompt, context } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "El prompt es obligatorio" }, { status: 400 });
    }

    if (!context || typeof context !== "object") {
      return NextResponse.json({ error: "El contexto es obligatorio" }, { status: 400 });
    }

    // Aislamiento Multi-tenant: Forzar que el club del contexto coincida con el club del usuario autenticado
    if (context.club?.id !== profile.club_id) {
      context.club = {
        ...context.club,
        id: profile.club_id
      };
    }

    const provider = new MethodologyAIProvider();
    const response = await provider.askAssistant(prompt, context);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error en API Methodology AI Assistant:", error);
    return NextResponse.json(
      { error: error.message || "Error interno en el asistente metodológico" },
      { status: 500 }
    );
  }
}
