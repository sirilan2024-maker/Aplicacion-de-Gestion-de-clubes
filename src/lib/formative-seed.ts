import { createAdminClient } from '@/lib/supabase/admin';

export interface SeedDataResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function seedFormativeEvaluationData(): Promise<SeedDataResult> {
  try {
    const supabase = createAdminClient();

    // 1. Módulos Maestros
    const modules = [
      {
        code: 'tecnico_analitico',
        name: 'Módulo Técnico-Analítico',
        display_order: 1,
        is_active: true
      },
      {
        code: 'tactico_global',
        name: 'Módulo Táctico-Global',
        display_order: 2,
        is_active: true
      },
      {
        code: 'fisico_coordinativo',
        name: 'Módulo Físico-Coordinativo',
        display_order: 3,
        is_active: true
      },
      {
        code: 'socio_afectivo',
        name: 'Módulo Socio-Afectivo y Resiliencia',
        display_order: 4,
        is_active: true
      }
    ];

    for (const mod of modules) {
      await supabase.from('evaluation_modules').upsert(mod, { onConflict: 'code' });
    }

    const { data: dbModules } = await supabase.from('evaluation_modules').select('id, code');
    const modMap = new Map((dbModules || []).map(m => [m.code, m.id]));

    // 2. Conceptos y Rúbricas (Categoría Infantil 12-14 años)
    const conceptsWithRubrics = [
      // --- TÉCNICO-ANALÍTICO ---
      {
        module_code: 'tecnico_analitico',
        code: 'control_orientado',
        name: 'Control Orientado y Primer Toque',
        category_target: 'Infantil (12-14)',
        display_order: 1,
        rubrics: [
          { score_level: 1, short_label: 'Iniciación', criteria_description: 'Controla el balón estático o pierde el control al perfilarse. Necesita más de 2 toques para estabilizar la trayectoria.' },
          { score_level: 2, short_label: 'Básico', criteria_description: 'Orienta el balón con su pierna dominante en situaciones sin presión, pero le cuesta si viene con velocidad.' },
          { score_level: 3, short_label: 'En desarrollo', criteria_description: 'Orienta eficazmente en 1 toque hacia la dirección prevista en situaciones de oposición media.' },
          { score_level: 4, short_label: 'Avanzado', criteria_description: 'Control fluido con ambas superficies que elimina al rival inmediato en la recepción.' },
          { score_level: 5, short_label: 'Dominio', criteria_description: 'Control orientado perfecto bajo máxima presión, acomodando el cuerpo para el pase/tiro posterior en un solo tiempo.' }
        ]
      },
      {
        module_code: 'tecnico_analitico',
        code: 'pierna_no_dominante',
        name: 'Uso de Pierna No Dominante',
        category_target: 'Infantil (12-14)',
        display_order: 2,
        rubrics: [
          { score_level: 1, short_label: 'Iniciación', criteria_description: 'Evita totalmente el uso de la pierna no dominante, comprometiendo la fluidez de la jugada.' },
          { score_level: 2, short_label: 'Básico', criteria_description: 'Realiza apoyos o controles simples pero no se atreve al golpeo medio/largo.' },
          { score_level: 3, short_label: 'En desarrollo', criteria_description: 'Pases cortos y controles precisos con pierna no hábil cuando la jugada lo exige con naturalidad.' },
          { score_level: 4, short_label: 'Avanzado', criteria_description: 'Golpeo consistente a media distancia y centros con buena trayectoria usando su pierna secundaria.' },
          { score_level: 5, short_label: 'Dominio', criteria_description: 'Manejo ambidiestro en controles, regates y golpeos con total precisión y confianza en partido.' }
        ]
      },
      {
        module_code: 'tecnico_analitico',
        code: 'golpeo_precision',
        name: 'Golpeo y Variabilidad de Superficies',
        category_target: 'Infantil (12-14)',
        display_order: 3,
        rubrics: [
          { score_level: 1, short_label: 'Iniciación', criteria_description: 'Solo utiliza empeine interior, falta de fuerza o precisión en envíos de más de 10 metros.' },
          { score_level: 2, short_label: 'Básico', criteria_description: 'Buena precisión en pase raso corto, pero impreciso en golpeo tenso o elevado.' },
          { score_level: 3, short_label: 'En desarrollo', criteria_description: 'Alterna empeine total, interior y exterior con criterio según distancia y requerimiento táctico.' },
          { score_level: 4, short_label: 'Avanzado', criteria_description: 'Golpeo potente y ajustado, buenos cambios de orientación superando líneas rivales.' },
          { score_level: 5, short_label: 'Dominio', criteria_description: 'Excelente golpeo con efecto, cambios de ritmo y precisión milimétrica en cualquier circunstancia.' }
        ]
      },
      {
        module_code: 'tecnico_analitico',
        code: 'conduccion_fintas',
        name: 'Conducción Dinámica y Fintas',
        category_target: 'Infantil (12-14)',
        display_order: 4,
        rubrics: [
          { score_level: 1, short_label: 'Iniciación', criteria_description: 'Conduce con la cabeza baja, sin visión periférica y balón excesivamente separado del pie.' },
          { score_level: 2, short_label: 'Básico', criteria_description: 'Conduce a velocidad moderada, pero frena la marcha al intentar cambiar de dirección.' },
          { score_level: 3, short_label: 'En desarrollo', criteria_description: 'Conducción con cambios de ritmo y fintas de cuerpo básicas para superar oposición.' },
          { score_level: 4, short_label: 'Avanzado', criteria_description: 'Protege el balón con el cuerpo mientras conduce a alta velocidad y sale a ambos perfiles.' },
          { score_level: 5, short_label: 'Dominio', criteria_description: 'Desborde explosivo, regate natural y fintas que desequilibran sistemáticamente a la defensa.' }
        ]
      },

      // --- TÁCTICO-GLOBAL ---
      {
        module_code: 'tactico_global',
        code: 'toma_decisiones_1v1',
        name: 'Toma de Decisiones en Situaciones de 1v1',
        category_target: 'Infantil (12-14)',
        display_order: 1,
        rubrics: [
          { score_level: 1, short_label: 'Iniciación', criteria_description: 'Fuerza el regate cuando tiene líneas de pase claras o duda y pierde la posesión.' },
          { score_level: 2, short_label: 'Básico', criteria_description: 'Reconoce situaciones de superioridad pero reacciona con lentitud.' },
          { score_level: 3, short_label: 'En desarrollo', criteria_description: 'Evalúa correctamente si encarar o asociarse según la distancia del defensor y ayudas.' },
          { score_level: 4, short_label: 'Avanzado', criteria_description: 'Genera ventajas espaciales fijando al par y soltando el balón en el momento exacto.' },
          { score_level: 5, short_label: 'Dominio', criteria_description: 'Lectura magistral del timing y espacio en 1v1 tanto ofensivo como defensivo.' }
        ]
      },
      {
        module_code: 'tactico_global',
        code: 'desmarques_apoyo_ruptura',
        name: 'Desmarques de Apoyo y Ruptura',
        category_target: 'Infantil (12-14)',
        display_order: 2,
        rubrics: [
          { score_level: 1, short_label: 'Iniciación', criteria_description: 'Permanece estático a la espalda de defensores o en fuera de juego constante.' },
          { score_level: 2, short_label: 'Básico', criteria_description: 'Se ofrece al pase corto pero le cuesta identificar cuándo romper al espacio libre.' },
          { score_level: 3, short_label: 'En desarrollo', criteria_description: 'Alterna desmarques de apoyo para dar línea de pase y rupturas a la espalda defensiva.' },
          { score_level: 4, short_label: 'Avanzado', criteria_description: 'Sincroniza la carrera con el poseedor del balón (timing de pase) con máxima eficacia.' },
          { score_level: 5, short_label: 'Dominio', criteria_description: 'Crea espacios libres para terceros mediante movimientos de arrastre inteligentes.' }
        ]
      },
      {
        module_code: 'tactico_global',
        code: 'perfilacion_defensiva',
        name: 'Perfilación Defensiva y Temporización',
        category_target: 'Infantil (12-14)',
        display_order: 3,
        rubrics: [
          { score_level: 1, short_label: 'Iniciación', criteria_description: 'Entra al bulto de frente sin perfilarse, siendo superado con facilidad por el atacante.' },
          { score_level: 2, short_label: 'Básico', criteria_description: 'Temporiza pero le cuesta orientar al atacante hacia la banda o pierna débil.' },
          { score_level: 3, short_label: 'En desarrollo', criteria_description: 'Buena postura corporal semi-perfilada, aguanta la entrada y frena el avance rival.' },
          { score_level: 4, short_label: 'Avanzado', criteria_description: 'Cierra líneas de pase interiores mientras orienta al adversario a zona de menor peligro.' },
          { score_level: 5, short_label: 'Dominio', criteria_description: 'Anticipación y recuperación limpia mediante colocación corporal y timing perfecto de robo.' }
        ]
      },
      {
        module_code: 'tactico_global',
        code: 'basculacion_transiciones',
        name: 'Ocupación de Espacios, Basculación y Transición',
        category_target: 'Infantil (12-14)',
        display_order: 4,
        rubrics: [
          { score_level: 1, short_label: 'Iniciación', criteria_description: 'Se desconecta tras pérdida o recuperación de balón; descolocado en el bloque.' },
          { score_level: 2, short_label: 'Básico', criteria_description: 'Bascula con el bloque pero con retardo en la reacción tras cambio de juego.' },
          { score_level: 3, short_label: 'En desarrollo', criteria_description: 'Mantiene distancias de seguridad con compañeros y activa presión tras pérdida.' },
          { score_level: 4, short_label: 'Avanzado', criteria_description: 'Rápida transición A-D / D-A, repliega o despliega ocupando carriles estratégicos.' },
          { score_level: 5, short_label: 'Dominio', criteria_description: 'Visión táctica colectiva, ordena y equilibra al equipo mediante su posicionamiento continuo.' }
        ]
      },

      // --- FÍSICO-COORDINATIVO ---
      {
        module_code: 'fisico_coordinativo',
        code: 'coordinacion_agilidad',
        name: 'Coordinación Dinámica y Agilidad',
        category_target: 'Infantil (12-14)',
        display_order: 1,
        rubrics: [
          { score_level: 1, short_label: 'Iniciación', criteria_description: 'Movimientos descoordinados en cambios de dirección bruscos o saltos.' },
          { score_level: 3, short_label: 'En desarrollo', criteria_description: 'Buena agilidad de pies y equilibrio tras disputa de balón o sprint corto.' },
          { score_level: 5, short_label: 'Dominio', criteria_description: 'Excelente destreza motriz, fluidez en desaceleración y aceleración instantánea.' }
        ]
      },

      // --- SOCIO-AFECTIVO Y RESILIENCIA ---
      {
        module_code: 'socio_afectivo',
        code: 'actitud_resiliencia',
        name: 'Actitud, Resiliencia y Compañerismo',
        category_target: 'Infantil (12-14)',
        display_order: 1,
        rubrics: [
          { score_level: 1, short_label: 'Iniciación', criteria_description: 'Se frustra fácilmente ante el error propio o de compañeros; desiste del esfuerzo.' },
          { score_level: 3, short_label: 'En desarrollo', criteria_description: 'Mantiene buena actitud, escucha correcciones del cuerpo técnico y anima al grupo.' },
          { score_level: 5, short_label: 'Dominio', criteria_description: 'Liderazgo positivo ejemplar, capacidad de superación ante la adversidad y máxima entrega.' }
        ]
      }
    ];

    for (const item of conceptsWithRubrics) {
      const moduleId = modMap.get(item.module_code);
      if (!moduleId) continue;

      const { data: savedConcept } = await supabase
        .from('evaluation_concepts')
        .upsert({
          module_id: moduleId,
          code: item.code,
          name: item.name,
          category_target: item.category_target,
          display_order: item.display_order
        }, { onConflict: 'code' })
        .select('id')
        .single();

      if (savedConcept?.id && item.rubrics) {
        for (const rub of item.rubrics) {
          await supabase.from('concept_rubrics').upsert({
            concept_id: savedConcept.id,
            score_level: rub.score_level,
            short_label: rub.short_label,
            criteria_description: rub.criteria_description
          }, { onConflict: 'concept_id,score_level' });
        }
      }
    }

    return { success: true, message: "Datos maestros y rúbricas formativas sembrados exitosamente" };
  } catch (err: any) {
    console.error("Error al sembrar datos formativos:", err);
    return { success: false, error: err.message };
  }
}
