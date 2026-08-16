'use server';

import * as cheerio from 'cheerio';
import Groq from 'groq-sdk';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateDrillEmbedding } from '@/services/drillSearchService';
import type { FootballCategory, MicrocycleDay } from '@/types/microcycle';
import type { TacticalBoardData } from '@/types/exercises';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export interface ImportDrillResult {
  success: boolean;
  count?: number;
  drill?: any;
  drills?: any[];
  error?: string;
}

export interface DiscoveredDrillItem {
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
}

export interface DiscoverResult {
  success: boolean;
  isCatalog: boolean;
  pageTitle?: string;
  drills: DiscoveredDrillItem[];
  error?: string;
}

const MULTI_DRILL_SYSTEM_PROMPT = `Eres un Director Metodológico de Fútbol experto en digitalizar sesiones y ejercicios de fútbol.
Tu tarea es leer el contenido de una página web (que puede contener 1 solo ejercicio o UNA SESIÓN COMPLETA CON MÚLTIPLES EJERCICIOS) y devolver un JSON con un array 'drills' que contenga TODOS los ejercicios encontrados en la página, cada uno con su PIZARRA TÁCTICA SVG DETALLADA.

## REGLAS DE LA PIZARRA TÁCTICA (SVG) PARA CADA EJERCICIO:
1. 'cones': Delimitar el espacio con al menos 4 conos en las esquinas (coordenadas X entre 10-90, Y entre 10-60). Colores: 'orange', 'yellow', 'red', 'blue'.
2. 'players': Posicionar a TODOS los jugadores participantes (4 a 14 jugadores).
   - 'team': 'blue' (atacantes/poseedores), 'red' (defensores/presión), 'yellow' (comodines), 'white' (porteros).
   - 'label': Rol o número claro ("1", "2", "MC", "DC", "PO", "C1", "D1", "LAT").
3. 'balls': 1 o 2 balones en las coordenadas del poseedor inicial.
4. 'arrows':
   - 'type': 'pass' (línea dorada discontinua) para pases entre compañeros.
   - 'type': 'movement' (línea verde continua) para desmarques o carreras.
   - 'type': 'dribble' (línea morada) para conducción o 1v1.
5. 'miniGoals' o 'pikes' o 'zones' si aplica.

## FORMATO DE SALIDA (JSON ESTRICTO):
{
  "drills": [
    {
      "nombre": "Título del ejercicio",
      "tipo": "rondo|positional_game|possession|individual_technical|conditioned_game|passing_pattern|wave_attack",
      "descripcion": "Explicación detallada del funcionamiento y reglas.",
      "age_category": "querubin|prebenjamin|benjamin|alevin|infantil|cadete|juvenil|senior",
      "microcycle_day": "MD_minus_4|MD_minus_3|MD_minus_2|MD_minus_1|MD_plus_1",
      "game_phase": "attacking_build_up|attacking_progression|attacking_finishing|defending_high_press|transition_atk_to_def|transition_def_to_atk|motor_coordination",
      "min_players": 6,
      "max_players": 14,
      "intensity_level": 3,
      "duracion_recomendada": 15,
      "objetivo_tecnico": ["pase", "control orientado"],
      "objetivo_tactico": ["conservación", "apoyos"],
      "material": ["conos", "balones", "petos"],
      "variantes": ["Variante opcional"],
      "tactical_board_data": {
        "pitchType": "half",
        "description": "Descripción de la pizarra",
        "cones": [
          {"id":"c1","x":20,"y":15,"color":"orange"},
          {"id":"c2","x":60,"y":15,"color":"orange"},
          {"id":"c3","x":20,"y":55,"color":"orange"},
          {"id":"c4","x":60,"y":55,"color":"orange"}
        ],
        "players": [
          {"id":"p1","x":20,"y":35,"team":"blue","label":"1"},
          {"id":"p2","x":60,"y":35,"team":"blue","label":"2"},
          {"id":"p3","x":35,"y":33,"team":"red","label":"D1"}
        ],
        "balls": [{"id":"b1","x":22,"y":35}],
        "arrows": [{"id":"a1","fromX":22,"fromY":35,"toX":60,"toY":35,"type":"pass"}]
      }
    }
  ]
}

Responde ÚNICAMENTE con el JSON. Sin texto adicional.`;

/**
 * Llama a Groq con fallback automático entre modelos
 */
async function callGroqWithFallback(prompt: string): Promise<string | null> {
  const groqKey = (process.env.GROQ_API_KEY || '').replace(/^["']|["']$/g, '');
  if (!groqKey) return null;

  const groq = new Groq({ apiKey: groqKey });
  const models = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'];

  for (const model of models) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: MULTI_DRILL_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      });

      const content = completion.choices[0]?.message?.content;
      if (content && content.includes('{')) {
        return content;
      }
    } catch (err: any) {
      console.warn(`[callGroqWithFallback] Error con modelo ${model}:`, err.message);
    }
  }

  return null;
}

/**
 * Escanea una página web para descubrir enlaces de ejercicios individuales
 */
export async function discoverDrillsFromUrlAction(inputUrl: string): Promise<DiscoverResult> {
  try {
    if (!inputUrl || !inputUrl.trim().startsWith('http')) {
      return { success: false, isCatalog: false, drills: [], error: 'URL no válida' };
    }

    const response = await fetch(inputUrl.trim(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return { success: false, isCatalog: false, drills: [], error: `Error ${response.status} al acceder a la página web` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const baseUrl = new URL(inputUrl.trim());
    const pageTitle = $('title').text() || $('h1').first().text() || baseUrl.hostname;

    const drillMap = new Map<string, DiscoveredDrillItem>();

    // 1. Selector específico para CoachTruly (drill-card)
    $('[data-testid="public-drill-card"]').each((_, el) => {
      const linkEl = $(el).find('a[href]').first();
      const href = linkEl.attr('href');
      if (!href) return;
      try {
        const fullUrl = new URL(href, baseUrl).href;
        const title = $(el).find('[data-testid="public-drill-name"]').text() || $(el).find('h3').text() || 'Ejercicio';
        const desc = $(el).find('.text-gray-500').first().text().replace(/\s+/g, ' ').trim();
        const img = $(el).find('img').attr('src');
        drillMap.set(fullUrl, { url: fullUrl, title: title.trim(), description: desc, thumbnail: img });
      } catch {}
    });

    // 2. Selectores genéricos para cualquier blog o web de fútbol
    if (drillMap.size === 0) {
      $('article, .card, .drill-card, .post-item, .entry, .exercise-card, .item').each((_, el) => {
        const linkEl = $(el).find('a[href*="drill"], a[href*="exercise"], a[href*="ejercicio"], a[href*="tarea"], a[href]').first();
        const href = linkEl.attr('href');
        if (!href) return;
        try {
          const fullUrl = new URL(href, baseUrl).href;
          if (
            fullUrl.includes('/login') ||
            fullUrl.includes('/pricing') ||
            fullUrl.includes('/faq') ||
            fullUrl.includes('/terms') ||
            fullUrl.includes('/privacy') ||
            fullUrl.includes('/theme/') ||
            fullUrl.includes('/tag/') ||
            fullUrl.includes('/category/') ||
            fullUrl === baseUrl.href
          ) return;

          const title = $(el).find('h2, h3, h4, .title').first().text() || linkEl.text();
          if (!title || title.trim().length < 3) return;

          const desc = $(el).find('p, .desc, .excerpt').first().text().replace(/\s+/g, ' ').trim();
          const img = $(el).find('img').attr('src');
          drillMap.set(fullUrl, { url: fullUrl, title: title.trim(), description: desc, thumbnail: img });
        } catch {}
      });
    }

    // 3. Enlaces con rutas de ejercicios
    if (drillMap.size === 0) {
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const fullUrl = new URL(href, baseUrl).href;
          const text = $(el).text().replace(/\s+/g, ' ').trim();
          const isDrillLink =
            (fullUrl.includes('/drill') || fullUrl.includes('/exercise') || fullUrl.includes('/ejercicio')) &&
            !fullUrl.includes('/theme/') &&
            !fullUrl.includes('/tag/') &&
            !fullUrl.includes('/database') &&
            fullUrl !== baseUrl.href;

          if (isDrillLink && text.length > 3 && !drillMap.has(fullUrl)) {
            drillMap.set(fullUrl, { url: fullUrl, title: text });
          }
        } catch {}
      });
    }

    const drills = Array.from(drillMap.values());

    if (drills.length > 1) {
      return {
        success: true,
        isCatalog: true,
        pageTitle: pageTitle.trim(),
        drills,
      };
    }

    return {
      success: true,
      isCatalog: false,
      pageTitle: pageTitle.trim(),
      drills: drills.length === 1 ? drills : [{ url: inputUrl, title: pageTitle.trim() }],
    };
  } catch (err: any) {
    return { success: false, isCatalog: false, drills: [], error: err.message || 'Error al escanear la web' };
  }
}

/**
 * Importa TODOS los ejercicios contenidos en una URL (sea 1 solo o una sesión con 3, 4, 5+ ejercicios)
 */
export async function importDrillFromUrlAction(
  url: string,
  preferredCategory?: FootballCategory
): Promise<ImportDrillResult> {
  try {
    // 1. Validar URL
    if (!url || !url.trim().startsWith('http')) {
      return { success: false, error: 'Por favor introduce una URL válida (http:// o https://)' };
    }

    // 2. Obtener club del usuario con fallback robusto
    const supabase = await createClient();
    const adminClient = createAdminClient();
    let clubId: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('club_id')
          .eq('id', user.id)
          .single();
        clubId = profile?.club_id || null;
      }
    } catch {}

    if (!clubId) {
      const { data: club } = await adminClient
        .from('clubs')
        .select('id')
        .ilike('name', '%SPORTING SALADAR%')
        .limit(1)
        .single();
      clubId = club?.id || null;
    }

    if (!clubId) {
      const { data: firstClub } = await adminClient
        .from('clubs')
        .select('id')
        .limit(1)
        .single();
      clubId = firstClub?.id || null;
    }

    if (!clubId) {
      return { success: false, error: 'No se encontró ningún club registrado en la base de datos' };
    }

    // 3. Descargar HTML de la página web
    let html = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        next: { revalidate: 0 },
      });

      if (!response.ok) {
        return { success: false, error: `No se pudo acceder a la URL (${response.status}: ${response.statusText})` };
      }

      html = await response.text();
    } catch (err: any) {
      return { success: false, error: `Error de red al conectar con la página web: ${err.message}` };
    }

    // 4. Extracción de TODOS los ejercicios de la página
    const $ = cheerio.load(html);
    const snippets: string[] = [];

    // A. Buscar tarjetas de ejercicios en sesiones (.drill)
    $('.drill').each((i, el) => {
      const title = $(el).find('h3').text().trim();
      const theme = $(el).find('.theme-badge').text().trim();
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (title && text.length > 20) {
        snippets.push(`EJERCICIO ${i + 1}: ${title} [Tema: ${theme}]\n${text}`);
      }
    });

    // B. Buscar objeto __NEXT_DATA__ si es un ejercicio individual o sesión Next.js
    if (snippets.length === 0) {
      const nextDataRaw = $('#__NEXT_DATA__').html();
      if (nextDataRaw) {
        try {
          const nextData = JSON.parse(nextDataRaw);
          const drillObj = nextData.props?.pageProps?.drill;
          if (drillObj) {
            const rawDesc = (drillObj.description || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            snippets.push(`Título: ${drillObj.name || ''}\nTema: ${drillObj.theme || ''}\nDescripción: ${rawDesc}\nPuntos clave: ${JSON.stringify(drillObj.qualityFactors || drillObj.coachingPoints || '')}`);
          }
        } catch {}
      }
    }

    // C. Fallback a texto limpio general
    let fullPrompt = '';
    if (snippets.length > 0) {
      fullPrompt = `URL: ${url}\nLa página contiene ${snippets.length} ejercicios:\n\n` + snippets.join('\n\n---\n\n');
    } else {
      $('script, style, nav, footer, header, noscript, iframe, svg, form, .advertisement, .ad, #comments').remove();
      const pageTitle = $('title').text() || $('h1').first().text() || '';
      const mainText = $('main, article, #content, .content, body')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();

      if (!mainText || mainText.length < 30) {
        return { success: false, error: 'No se pudo extraer contenido suficiente de este enlace.' };
      }
      fullPrompt = `URL: ${url}\nTítulo: ${pageTitle}\nContenido:\n${mainText.slice(0, 5000)}`;
    }

    // 5. Analizar y generar TODOS los ejercicios con IA
    const rawResponse = await callGroqWithFallback(
      `Digitaliza TODOS los ejercicios que contiene esta página web en formato JSON estructurado con sus pizarras tácticas SVG:${preferredCategory ? `\nCategoría preferida: ${preferredCategory}` : ''}\n\n${fullPrompt}`
    );

    let parsedDrills: any[] = [];

    if (rawResponse) {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.drills) && parsed.drills.length > 0) {
            parsedDrills = parsed.drills;
          } else if (parsed.nombre) {
            parsedDrills = [parsed];
          }
        } catch {}
      }
    }

    // Fallback estructurado si las APIs de IA no devolvieran formato
    if (parsedDrills.length === 0) {
      const pageTitle = $('title').text() || $('h1').first().text() || 'Ejercicio Web';
      parsedDrills = [
        {
          nombre: pageTitle,
          tipo: 'positional_game',
          descripcion: 'Ejercicio importado desde ' + url,
          age_category: preferredCategory || 'senior',
          microcycle_day: 'MD_minus_3',
          game_phase: 'attacking_progression',
          min_players: 6,
          max_players: 14,
          intensity_level: 3,
          duracion_recomendada: 15,
          objetivo_tecnico: ['pase', 'control orientado'],
          objetivo_tactico: ['conservación del balón'],
          material: ['conos', 'balones', 'petos'],
          variantes: [],
          tactical_board_data: {
            pitchType: 'half',
            description: pageTitle,
            cones: [
              { id: 'c1', x: 20, y: 15, color: 'orange' },
              { id: 'c2', x: 60, y: 15, color: 'orange' },
              { id: 'c3', x: 20, y: 55, color: 'orange' },
              { id: 'c4', x: 60, y: 55, color: 'orange' },
            ],
            players: [
              { id: 'p1', x: 20, y: 35, team: 'blue', label: '1' },
              { id: 'p2', x: 60, y: 35, team: 'blue', label: '2' },
              { id: 'p3', x: 40, y: 15, team: 'blue', label: '3' },
              { id: 'p4', x: 40, y: 55, team: 'blue', label: '4' },
              { id: 'p5', x: 35, y: 33, team: 'red', label: 'D1' },
              { id: 'p6', x: 45, y: 37, team: 'red', label: 'D2' },
            ],
            balls: [{ id: 'b1', x: 22, y: 35 }],
            arrows: [{ id: 'a1', fromX: 22, fromY: 35, toX: 40, toY: 15, type: 'pass' }],
          },
        },
      ];
    }

    // 6. Guardar TODOS los ejercicios en la base de datos Supabase
    const savedDrills: any[] = [];

    for (const d of parsedDrills) {
      const category = preferredCategory || d.age_category || 'senior';
      const { data: insertedDrill, error: insertError } = await adminClient
        .from('banco_ejercicios')
        .insert({
          club_id: clubId,
          nombre: d.nombre || 'Ejercicio Web',
          tipo: d.tipo || 'positional_game',
          descripcion: d.descripcion || 'Ejercicio importado desde ' + url,
          age_category: category,
          microcycle_day: d.microcycle_day || 'MD_minus_3',
          game_phase: d.game_phase || 'attacking_progression',
          drill_structure: d.tipo || 'positional_game',
          min_players: d.min_players || 6,
          max_players: d.max_players || 16,
          intensity_level: d.intensity_level || 3,
          duracion_recomendada: d.duracion_recomendada || 15,
          tactical_board_data: d.tactical_board_data || null,
          objetivo_tecnico: d.objetivo_tecnico || [],
          objetivo_tactico: d.objetivo_tactico || [],
          material: d.material || ['conos', 'balones'],
          variantes: d.variantes || [],
          tags: [category, 'web_import', new URL(url).hostname.replace('www.', '')],
          dificultad: d.intensity_level || 3,
          categoria_edad: [category],
        })
        .select('*')
        .single();

      if (insertedDrill) {
        savedDrills.push(insertedDrill);

        // Embedding en segundo plano
        const embeddingText = `${insertedDrill.nombre} ${insertedDrill.descripcion} ${(insertedDrill.objetivo_tecnico || []).join(' ')}`;
        generateDrillEmbedding(embeddingText).then(async (embedding) => {
          if (embedding) {
            await adminClient
              .from('banco_ejercicios')
              .update({ embedding: JSON.stringify(embedding) })
              .eq('id', insertedDrill.id);
          }
        }).catch(() => {});
      }
    }

    // 7. Revalidar cachés
    revalidatePath('/dashboard/exercises');
    revalidatePath('/dashboard/training');

    if (savedDrills.length === 0) {
      return { success: false, error: 'No se pudo guardar ningún ejercicio en la base de datos.' };
    }

    return {
      success: true,
      count: savedDrills.length,
      drill: savedDrills[0],
      drills: savedDrills,
    };
  } catch (err: any) {
    console.error('[importDrillFromUrlAction] Excepción:', err);
    return { success: false, error: err.message || 'Error inesperado al importar el ejercicio' };
  }
}
