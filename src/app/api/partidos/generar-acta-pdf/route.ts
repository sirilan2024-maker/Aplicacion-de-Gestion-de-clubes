import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchMatchDetails } from "@/lib/ffcv/client";
import { syncFFCVActaToConvocatorias } from "@/lib/ffcv/acta-sync";
import { generateFfcvActaPdfBuffer } from "@/lib/ffcv/acta-pdf-generator";

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Configuración de servidor incompleta.");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function resolvePartidoAndCodacta(
  supabase: any,
  partidoId?: string | null,
  codactaParam?: string | null
): Promise<{ partido: any | null; codacta: string | null }> {
  let partido: any = null;
  let codacta: string | null = codactaParam ? String(codactaParam).trim() : null;

  if (partidoId) {
    const { data: p } = await supabase
      .from("partidos")
      .select("id, acta_oficial_url, equipo_id, rival_nombre, fecha_hora, lugar, season_id")
      .eq("id", partidoId)
      .maybeSingle();
    if (p) {
      partido = p;
      if (!codacta && p.acta_oficial_url) {
        const m = p.acta_oficial_url.match(/CodPartido=(\d+)/i);
        if (m) codacta = m[1];
      }
    }
  }

  if (!partido && codacta) {
    const { data: matched } = await supabase
      .from("partidos")
      .select("id, acta_oficial_url, equipo_id, rival_nombre, fecha_hora, lugar, season_id")
      .neq("season_id", "584f508a-fc1a-4339-b5b2-4296ffde2f4c")
      .ilike("acta_oficial_url", `%${codacta}%`)
      .limit(1);
    if (matched && matched.length > 0) {
      partido = matched[0];
    }
  }

  // Fallback: buscar codacta en ffcv_matches si tenemos partido pero no codacta
  if (partido && !codacta && partido.equipo_id && partido.fecha_hora) {
    const { data: team } = await supabase
      .from("teams")
      .select("ffcv_group_id, ffcv_season_id")
      .eq("id", partido.equipo_id)
      .neq("season_id", "584f508a-fc1a-4339-b5b2-4296ffde2f4c")
      .maybeSingle();

    if (team?.ffcv_group_id) {
      const pDate = new Date(partido.fecha_hora);
      const minDate = new Date(pDate.getTime() - 5 * 86400000).toISOString().split("T")[0];
      const maxDate = new Date(pDate.getTime() + 5 * 86400000).toISOString().split("T")[0];

      const { data: fMatches } = await supabase
        .from("ffcv_matches")
        .select("ffcv_match_id, codacta, home_team_name, away_team_name, match_date")
        .eq("ffcv_group_id", team.ffcv_group_id)
        .neq("ffcv_season_id", "21")
        .gte("match_date", minDate)
        .lte("match_date", maxDate);

      if (fMatches && fMatches.length > 0) {
        const rivalClean = (partido.rival_nombre || "").toLowerCase().trim();
        const found = fMatches.find((fm: any) => {
          const h = (fm.home_team_name || "").toLowerCase();
          const a = (fm.away_team_name || "").toLowerCase();
          const involvesSaladar = h.includes("saladar") || a.includes("saladar");
          if (!involvesSaladar) return false;
          const fmRival = h.includes("saladar") ? a : h;
          const words = rivalClean.split(/\s+/).filter((w: string) => w.length > 3);
          return words.length === 0 || words.some((w: string) => fmRival.includes(w));
        });
        if (found) {
          codacta = String(found.codacta || found.ffcv_match_id || "");
        }
      }
    }
  }

  return { partido, codacta: codacta || null };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const partidoId = searchParams.get("partidoId");
    const codactaParam = searchParams.get("codacta");
    const download = searchParams.get("download") === "1";
    const force = searchParams.get("force") === "1";

    const supabase = getAdminSupabase();
    const { partido, codacta } = await resolvePartidoAndCodacta(supabase, partidoId, codactaParam);

    // Si existe un PDF original FFCV ya subido en Storage (>= 25 KB) y no se fuerza regeneración, servirlo directamente
    if (partido?.id && !force) {
      const folderPath = `partidos/${partido.id}`;
      const { data: existingFiles } = await supabase.storage
        .from("actas-partidos")
        .list(folderPath, { search: "acta_oficial.pdf" });
      const existing = Array.isArray(existingFiles)
        ? existingFiles.find((f: any) => f.name === "acta_oficial.pdf")
        : null;
      const existingSize = Number(existing?.metadata?.size || 0);

      if (existing && existingSize >= 25000) {
        const storagePath = `${folderPath}/acta_oficial.pdf`;
        if (download) {
          const { data: fileBlob } = await supabase.storage
            .from("actas-partidos")
            .download(storagePath);
          if (fileBlob) {
            const arrayBuf = await fileBlob.arrayBuffer();
            const rivalSlug = (partido?.rival_nombre || codacta || "partido")
              .replace(/[^a-zA-Z0-9_-]/g, "_")
              .slice(0, 40);
            return new NextResponse(Buffer.from(arrayBuf), {
              status: 200,
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Acta_Oficial_FFCV_${codacta || partido.id}_${rivalSlug}.pdf"`,
                "Cache-Control": "no-store",
              },
            });
          }
        } else {
          const { data: signed } = await supabase.storage
            .from("actas-partidos")
            .createSignedUrl(storagePath, 3600);
          if (signed?.signedUrl) {
            return NextResponse.json({
              success: true,
              signedUrl: signed.signedUrl,
              isExternal: false,
              codacta,
              partidoId: partido.id,
              pdfGenerated: false,
            });
          }
        }
      }
    }

    if (!codacta) {
      return NextResponse.json(
        { error: "No se encontró el código de acta oficial FFCV para este partido." },
        { status: 404 }
      );
    }

    const details = await fetchMatchDetails({ matchId: codacta });
    if (!details) {
      return NextResponse.json(
        { error: `No se pudo obtener el acta oficial #${codacta} desde la FFCV.` },
        { status: 404 }
      );
    }

    // Sincronizar alineación y tarjetas oficiales con convocatorias (garantiza coherencia 100% con el informe del partido)
    await syncFFCVActaToConvocatorias(codacta, details, supabase).catch((e) =>
      console.warn("[generar-acta-pdf] Warning syncing convocatorias:", e)
    );

    const pdfBytes = await generateFfcvActaPdfBuffer(details, codacta);

    if (partido?.id) {
      const storagePath = `partidos/${partido.id}/acta_oficial.pdf`;
      await supabase.storage
        .from("actas-partidos")
        .upload(storagePath, Buffer.from(pdfBytes), {
          contentType: "application/pdf",
          upsert: true,
        });
    }

    if (download) {
      const rivalSlug = (partido?.rival_nombre || details.equipo_visitante || codacta)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 40);
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Acta_Oficial_FFCV_${codacta}_${rivalSlug}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    let signedUrl: string | null = null;
    if (partido?.id) {
      const storagePath = `partidos/${partido.id}/acta_oficial.pdf`;
      const { data: signed } = await supabase.storage
        .from("actas-partidos")
        .createSignedUrl(storagePath, 3600);
      if (signed?.signedUrl) {
        signedUrl = signed.signedUrl;
      }
    }

    if (!signedUrl) {
      signedUrl = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}`;
    }

    return NextResponse.json({
      success: true,
      signedUrl,
      isExternal: false,
      codacta,
      partidoId: partido?.id || partidoId || null,
      pdfGenerated: true,
    });
  } catch (err: any) {
    console.error("[generar-acta-pdf GET] Error:", err);
    return NextResponse.json(
      { error: err.message || "Error al generar el PDF del acta oficial." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const partidoId = body.partidoId || null;
    const codactaParam = body.codacta || null;

    const supabase = getAdminSupabase();
    const { partido, codacta } = await resolvePartidoAndCodacta(supabase, partidoId, codactaParam);

    if (!codacta) {
      return NextResponse.json(
        { error: "No se encontró el código de acta oficial FFCV para este partido." },
        { status: 404 }
      );
    }

    const details = await fetchMatchDetails({ matchId: codacta });
    if (!details) {
      return NextResponse.json(
        { error: `No se pudo obtener el acta oficial #${codacta} desde la FFCV.` },
        { status: 404 }
      );
    }

    // Sincronizar alineación y tarjetas oficiales con convocatorias
    await syncFFCVActaToConvocatorias(codacta, details, supabase).catch((e) =>
      console.warn("[generar-acta-pdf POST] Warning syncing convocatorias:", e)
    );

    const pdfBytes = await generateFfcvActaPdfBuffer(details, codacta);

    let signedUrl: string | null = null;
    if (partido?.id) {
      const storagePath = `partidos/${partido.id}/acta_oficial.pdf`;
      const { error: upErr } = await supabase.storage
        .from("actas-partidos")
        .upload(storagePath, Buffer.from(pdfBytes), {
          contentType: "application/pdf",
          upsert: true,
        });

      if (!upErr) {
        const { data: signed } = await supabase.storage
          .from("actas-partidos")
          .createSignedUrl(storagePath, 3600);
        if (signed?.signedUrl) {
          signedUrl = signed.signedUrl;
        }
      }
    }

    if (!signedUrl) {
      signedUrl = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}`;
    }

    return NextResponse.json({
      success: true,
      signedUrl,
      isExternal: false,
      codacta,
      partidoId: partido?.id || partidoId || null,
      pdfGenerated: true,
    });
  } catch (err: any) {
    console.error("[generar-acta-pdf POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Error al generar y guardar el PDF del acta oficial." },
      { status: 500 }
    );
  }
}
