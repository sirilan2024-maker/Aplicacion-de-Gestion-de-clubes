import { 
  CompetencyDefinition, 
  CompetencyArea, 
  PlayerPosition, 
  RubricLevel, 
  CompetencyRubric 
} from "./types";

function createStandardRubric(
  conceptName: string,
  level1: string,
  level2: string,
  level3: string,
  level4: string,
  level5: string
): Record<RubricLevel, CompetencyRubric> {
  return {
    1: { level: 1, label: 'Inicial', criteria: level1 },
    2: { level: 2, label: 'En desarrollo', criteria: level2 },
    3: { level: 3, label: 'Adecuado', criteria: level3 },
    4: { level: 4, label: 'Avanzado', criteria: level4 },
    5: { level: 5, label: 'Excelente', criteria: level5 }
  };
}

export class CompetencyMatrixService {
  private static instance: CompetencyMatrixService;
  private readonly competencies: Map<string, CompetencyDefinition> = new Map();

  private constructor() {
    this.initializeCompetencies();
  }

  public static getInstance(): CompetencyMatrixService {
    if (!CompetencyMatrixService.instance) {
      CompetencyMatrixService.instance = new CompetencyMatrixService();
    }
    return CompetencyMatrixService.instance;
  }

  private register(comp: CompetencyDefinition) {
    this.competencies.set(comp.id, comp);
    this.competencies.set(comp.code, comp);
  }

  private initializeCompetencies() {
    // ─── 1. ÁREA TÉCNICA ──────────────────────────────────────────────────────
    this.register({
      id: 'tec_pase',
      code: 'pase',
      name: 'Precisión y Timing de Pase',
      area: 'tecnica',
      description: 'Capacidad para entregar el balón con la velocidad, altura y dirección adecuadas al compañero.',
      indicators: ['Pase raso tenso', 'Pase con pierna no dominante', 'Pase en ventaja'],
      categoryWeights: { 'U6-U8': 0.8, 'U9-U12': 1.0, 'U13-U16': 1.2, 'Senior': 1.2 },
      rubrics: createStandardRubric(
        'Pase',
        'Impreciso en distancias medias/cortas. Dificultad para ajustar la fuerza.',
        'Pase correcto en situaciones sin oposición con pierna dominante.',
        'Pase eficaz con ambas piernas bajo oposición media y buen timing.',
        'Pase con ventaja que supera líneas defensivas con gran precisión.',
        'Dominio absoluto: pases milimétricos bajo máxima presión y con recursos variados.'
      )
    });

    this.register({
      id: 'tec_control',
      code: 'control',
      name: 'Control Orientado y Primer Toque',
      area: 'tecnica',
      description: 'Habilidad para orientar el balón hacia el espacio libre en el primer contacto.',
      indicators: ['Orientación en 1 toque', 'Control con superficies variadas', 'Control bajo presión'],
      categoryWeights: { 'U6-U8': 0.9, 'U9-U12': 1.2, 'U13-U16': 1.2, 'Senior': 1.0 },
      rubrics: createStandardRubric(
        'Control Orientado',
        'Control estático, pierde la posesión si el balón viene rápido.',
        'Orienta con pierna dominante pero necesita 2 o más toques para estabilizar.',
        'Control orientado eficaz hacia la dirección deseada con oposición media.',
        'Elimina al par en el primer toque y acelera la jugada.',
        'Primer toque perfecto que genera ventajas espaciotemporales inmediatas.'
      )
    });

    this.register({
      id: 'tec_conduccion',
      code: 'conduccion',
      name: 'Conducción y Fijación',
      area: 'tecnica',
      description: 'Progresión con el balón pegado al pie manteniendo la visión del entorno.',
      indicators: ['Visión periférica al conducir', 'Cambios de ritmo', 'Fijación de rivales'],
      categoryWeights: { 'U6-U8': 1.2, 'U9-U12': 1.0, 'U13-U16': 0.9, 'Senior': 0.8 },
      rubrics: createStandardRubric(
        'Conducción',
        'Conduce mirando solo al balón, pierde la trayectoria fácilmente.',
        'Conduce en línea recta a ritmo constante sin levantar la cabeza con frecuencia.',
        'Conducción fluida con visión periférica y cambios de dirección básicos.',
        'Conduce fijando rivales y soltando en el momento óptimo de atracción.',
        'Conducción desequilibrante con variaciones de velocidad y protección impecable.'
      )
    });

    this.register({
      id: 'tec_regate',
      code: 'regate',
      name: 'Regate y Desborde 1v1',
      area: 'tecnica',
      description: 'Capacidad de superar al oponente directo mediante fintas y cambios de ritmo.',
      indicators: ['Uso de fintas corporales', 'Cambio de aceleración post-finta', 'Eficacia en 1v1'],
      rubrics: createStandardRubric(
        'Regate',
        'Inseguro en el 1v1 ofensivo, tiende a chocar o retrasar el juego.',
        'Intenta fintas previsibles pero suele ser neutralizado por el defensor.',
        'Supera al rival directo cuando dispone de espacio para acelerar.',
        'Desborde recurrente en uno contra uno por ambos perfiles.',
        'Especialista en desequilibrio individual, genera ventajas numéricas continuas.'
      )
    });

    this.register({
      id: 'tec_finalizacion',
      code: 'finalizacion',
      name: 'Finalización y Remate',
      area: 'tecnica',
      description: 'Eficacia y variedad en el remate a portería en situaciones de gol.',
      indicators: ['Remate a 1 toque', 'Selección de superficie de golpeo', 'Sangre fría en área'],
      rubrics: createStandardRubric(
        'Finalización',
        'Remate precipitado o falto de potencia/dirección en el área.',
        'Acierta en situaciones francas sin portero u oposición encima.',
        'Buen golpeo a portería cuando dispone de tiempo para armar la pierna.',
        'Definición precisa a 1-2 toques buscando palos alejados o espacios vacíos.',
        'Eficacia clínica y serenidad máxima ante el portero en cualquier ángulo.'
      )
    });

    this.register({
      id: 'tec_perfil_corporal',
      code: 'perfil_corporal',
      name: 'Perfil Corporal y Orientación Espacial',
      area: 'tecnica',
      description: 'Colocación corporal antes de recibir para ampliar el campo visual y las opciones.',
      indicators: ['Orientación semiabierta', 'Perfil defensivo escalonado', 'Recepción de espaldas/cara'],
      rubrics: createStandardRubric(
        'Perfil Corporal',
        'Recibe totalmente de espaldas a la jugada cerrándose opciones.',
        'Se perfila adecuadamente solo tras recordatorio verbal del entrenador.',
        'Adopta perfiles semiabiertos de forma autónoma antes de recibir.',
        'Excelente perfil corporal que le permite jugar a 1 toque hacia delante.',
        'Lectura postural perfecta tanto en fase ofensiva como en duelos defensivos.'
      )
    });

    // ─── 2. ÁREA TÁCTICA ──────────────────────────────────────────────────────
    this.register({
      id: 'tac_toma_decisiones',
      code: 'toma_decisiones',
      name: 'Toma de Decisiones bajo Presión',
      area: 'tactica',
      description: 'Elección de la mejor opción técnico-táctica en función del tiempo y espacio.',
      indicators: ['Velocidad de procesamiento', 'Lectura de ventajas', 'Minimización de pérdidas'],
      categoryWeights: { 'U6-U8': 0.7, 'U9-U12': 1.0, 'U13-U16': 1.3, 'Senior': 1.3 },
      rubrics: createStandardRubric(
        'Toma de Decisiones',
        'Se precipita o retiene en exceso el balón bajo presión.',
        'Toma decisiones correctas cuando dispone de tiempo y espacio.',
        'Buena elección de opciones en situaciones habituales de juego.',
        'Resuelve con rapidez y criterio situaciones complejas con oposición.',
        'Visión superior: elige sistemáticamente la opción más ventajosa para el equipo.'
      )
    });

    this.register({
      id: 'tac_ocupacion_espacios',
      code: 'ocupacion_espacios',
      name: 'Ocupación Racional de Espacios y Distancias',
      area: 'tactica',
      description: 'Mantenimiento de las distancias de relación y ocupación de zonas libres.',
      indicators: ['Amplitud y profundidad', 'Líneas de pase libres', 'Equilibrio posicional'],
      rubrics: createStandardRubric(
        'Ocupación de Espacios',
        'Tiende a aglutinarse en torno al balón desestructurando al equipo.',
        'Ocupa su posición fija pero le cuesta interpretar permutas o desmarques.',
        'Mantiene distancias correctas y ofrece apoyos constantes con sentido.',
        'Interpreta cuándo dar amplitud, profundidad o fijar en pasillos interiores.',
        'Maestría posicional: genera y aprovecha espacios para compañeros continuamente.'
      )
    });

    this.register({
      id: 'tac_transicion_defensiva',
      code: 'transicion_defensiva',
      name: 'Transición Defensiva y Reacción Tras Pérdida',
      area: 'tactica',
      description: 'Activación inmediata tras perder el balón para presionar o replegar.',
      indicators: ['Acoso en <3 segundos', 'Cierre de líneas de pase', 'Evitación de contraataque'],
      rubrics: createStandardRubric(
        'Transición Defensiva',
        'Se desconecta tras perder el balón o protesta sin replegar/presionar.',
        'Reacciona con retraso permitiendo al rival armar la transición ofensiva.',
        'Acoso inmediato al poseedor en los primeros 3 segundos tras pérdida.',
        'Excelente presión tras pérdida combinada con anticipación de apoyos rivales.',
        'Líder en la activación post-pérdida: recupera o neutraliza contras con regularidad.'
      )
    });

    this.register({
      id: 'tac_presion',
      code: 'presion',
      name: 'Presión y Orientación del Salto Defensivo',
      area: 'tactica',
      description: 'Intensidad y orientación corporal en los saltos a la presión defensiva.',
      indicators: ['Acoso coordinado', 'Tapar pierna hábil / línea de pase', 'Uso del cuerpo'],
      rubrics: createStandardRubric(
        'Presión',
        'Salta a destiempo y es superado con facilidad por un regate o pase.',
        'Presiona con esfuerzo pero sin orientar la trayectoria del atacante.',
        'Presiona con buen timing tapando la opción de pase más peligrosa.',
        'Presión asfixiante y sincronizada que fuerza errores continuos en el rival.',
        'Referente defensivo: orienta y coordina la presión de todo el bloque alto.'
      )
    });

    this.register({
      id: 'tac_salida_balon',
      code: 'salida_balon',
      name: 'Salida de Balón e Iniciación del Juego',
      area: 'tactica',
      description: 'Capacidad para iniciar la fase ofensiva superando la primera línea de presión rival.',
      indicators: ['Pase de seguridad vs progresión', 'Tercer hombre', 'Conducción atrayente'],
      rubrics: createStandardRubric(
        'Salida de Balón',
        'Inseguridad al iniciar el juego, recurre al pelotazo sin criterio.',
        'Combina con jugadores cercanos pero arriesga pases comprometidos.',
        'Encuentra al hombre libre y da continuidad a la salida de balón.',
        'Domina el concepto del tercer hombre y rompe líneas de presión con soltura.',
        'Organizador de la iniciación: calma, claridad táctica y ejecución impecable.'
      )
    });

    // ─── 3. ÁREA FÍSICA ───────────────────────────────────────────────────────
    this.register({
      id: 'fis_aceleracion_velocidad',
      code: 'velocidad',
      name: 'Velocidad y Capacidad de Aceleración',
      area: 'fisica',
      description: 'Rapidez en los primeros metros y velocidad punta en acciones de partido.',
      indicators: ['Aceleración 0-10m', 'Velocidad en carrera continua', 'Cambio de dirección'],
      rubrics: createStandardRubric(
        'Velocidad',
        'Ritmo lento de desplazamiento, superado en carreras directas.',
        'Velocidad media, suficiente para tareas posicionales pero justa en duelos.',
        'Buena aceleración en distancias cortas y ritmo competitivo adecuado.',
        'Muy rápido en distancias cortas y largas, gana la mayoría de carreras divididas.',
        'Velocidad y potencia élite: desequilibra físicamente cualquier acción.'
      )
    });
    this.competencies.set('fis_velocidad', this.competencies.get('fis_aceleracion_velocidad')!);

    this.register({
      id: 'fis_resistencia',
      code: 'resistencia',
      name: 'Resistencia y Repetición de Esfuerzos',
      area: 'fisica',
      description: 'Capacidad de mantener la intensidad física y concentración a lo largo de los 90 min.',
      indicators: ['Recuperación entre esfuerzos', 'Mantenimiento del ritmo en 2ª parte'],
      rubrics: createStandardRubric(
        'Resistencia',
        'Muestra fatiga acusada a partir del ecuador de la sesión o partido.',
        'Completa el tiempo reglamentario pero bajando notablemente la intensidad.',
        'Buen fondo físico, mantiene un nivel competitivo constante todo el partido.',
        'Alta capacidad de trabajo y rápida recuperación entre sprints intensos.',
        'Motor incombustible: repite esfuerzos de máxima exigencia sin decaimiento.'
      )
    });

    this.register({
      id: 'fis_coordinacion_agilidad',
      code: 'coordinacion',
      name: 'Coordinación Dinámica y Agilidad',
      area: 'fisica',
      description: 'Control motriz, equilibrio dinámico y fluidez de movimientos en campo.',
      indicators: ['Equilibrio en giros', 'Frecuencia de apoyos', 'Caídas y reincorporaciones'],
      rubrics: createStandardRubric(
        'Coordinación',
        'Movimientos rígidos o descoordinados en cambios de dirección rápidos.',
        'Coordinación aceptable en carrera recta, pierde equilibrio en giros forzados.',
        'Ágil y coordinado en todas las acciones habituales de fútbol.',
        'Gran fluidez de apoyos y equilibrio sobresaliente en disputas dinámicas.',
        'Destreza motriz excepcional: reacciona y se reequilibra al instante.'
      )
    });
    this.competencies.set('fis_coordinacion', this.competencies.get('fis_coordinacion_agilidad')!);

    // ─── 4. ÁREA PSICOLÓGICA / SOCIO-AFECTIVA ────────────────────────────────
    this.register({
      id: 'psi_concentracion',
      code: 'concentracion',
      name: 'Concentración y Foco Competitivo',
      area: 'psicologica',
      description: 'Atención sostenida en el juego sin despistes en balón parado o transiciones.',
      indicators: ['Atención en jugadas a balón parado', 'Cero despistes en marcas', 'Enfoque continuo'],
      rubrics: createStandardRubric(
        'Concentración',
        'Frecuentes pérdidas de foco, se desentiende de la jugada con regularidad.',
        'Atento en fases activas pero propenso a despistes en balones parados.',
        'Mantiene la concentración adecuada durante toda la sesión o partido.',
        'Gran nivel de alerta constante, anticipa desatenciones del rival.',
        'Foco competitivo inquebrantable desde el minuto 1 hasta el final.'
      )
    });

    this.register({
      id: 'psi_comunicacion',
      code: 'comunicacion',
      name: 'Comunicación y Liderazgo en Campo',
      area: 'psicologica',
      description: 'Uso de la voz para ordenar, avisar y motivar a los compañeros.',
      indicators: ['Avisos de "solo/hombre"', 'Orientación a la línea', 'Ánimo tras error'],
      rubrics: createStandardRubric(
        'Comunicación',
        'Silencioso en el campo, no avisa a compañeros ni pide el balón con claridad.',
        'Se comunica de forma puntual pero sin asumir un rol de ayuda mutua.',
        'Voz activa para dar avisos claros ("solo", "gira", "deja") a sus compañeros.',
        'Excelente organizador verbal, ordena líneas y mantiene al equipo conectado.',
        'Líder natural dentro del campo: guía, contagia energía y corrige con respeto.'
      )
    });

    this.register({
      id: 'psi_compromiso_resiliencia',
      code: 'compromiso',
      name: 'Compromiso, Esfuerzo y Resiliencia al Error',
      area: 'psicologica',
      description: 'Actitud positiva ante la adversidad, constancia en el trabajo y respeto grupal.',
      indicators: ['Reacción constructiva al error', 'Puntualidad y esfuerzo', 'Espíritu de equipo'],
      rubrics: createStandardRubric(
        'Compromiso',
        'Se frustra con facilidad ante el fallo y baja los brazos.',
        'Trabaja duro pero le cuesta recomponerse anímicamente tras un error grave.',
        'Gran actitud de superación, acepta correcciones y mantiene el esfuerzo.',
        'Excelente espíritu de equipo, empuja al grupo y no se rinde jamás.',
        'Ejemplo absoluto de resiliencia, valores deportivos y cultura de esfuerzo.'
      )
    });

    // ─── 5. COMPETENCIAS ESPECÍFICAS POR POSICIÓN ────────────────────────────
    // Portero
    this.register({
      id: 'pos_gk_blocaje',
      code: 'gk_blocaje',
      name: 'Blocaje y Juego Aéreo (Portero)',
      area: 'tecnica',
      description: 'Seguridad en el agarre del balón y dominio del área en centros aéreos.',
      indicators: ['Blocaje frontal', 'Salidas aéreas', 'Desvíos a zonas seguras'],
      isPositional: true,
      positionTarget: ['portero'],
      rubrics: createStandardRubric(
        'Blocaje y Juego Aéreo',
        'Falta de seguridad en el agarre, rechaces peligrosos hacia el centro.',
        'Bloca bien disparos frontales pero duda en salidas por alto.',
        'Seguro en el blocaje de media distancia y eficaz en balones aéreos en área pequeña.',
        'Domina el área grande por alto y desvía con solvencia balones difíciles.',
        'Máxima solvencia: imbatible por alto y blocajes limpios bajo cualquier condición.'
      )
    });

    // Central
    this.register({
      id: 'pos_cb_duelo_cobertura',
      code: 'cb_duelos',
      name: 'Duelos Aéreos y Coberturas Defensivas (Central)',
      area: 'tactica',
      description: 'Dominio de los balones largos rivales y basculación de seguridad a laterales.',
      indicators: ['Despeje de cabeza orientado', 'Timing de cobertura', 'Contención 1v1'],
      isPositional: true,
      positionTarget: ['defensa_central'],
      rubrics: createStandardRubric(
        'Duelos y Coberturas',
        'Pierde la posición en balones a la espalda y duda en coberturas.',
        'Fuerte en el contacto físico pero le cuesta calcular botes largos.',
        'Gana la mayoría de duelos directos y realiza coberturas a tiempo.',
        'Excelente anticipación aérea y lectura de coberturas a sus laterales.',
        'Mariscal de la zaga: contundencia, salida limpia y coberturas perfectas.'
      )
    });

    // Lateral
    this.register({
      id: 'pos_fb_incorporacion',
      code: 'fb_incorporacion',
      name: 'Incorporación Ofensiva y Centros (Lateral)',
      area: 'tactica',
      description: 'Desdoble por banda, llegada a línea de fondo y precisión en centros al área.',
      indicators: ['Timing de desdoble', 'Precisión de centro en carrera', 'Repliegue post-subida'],
      isPositional: true,
      positionTarget: ['lateral'],
      rubrics: createStandardRubric(
        'Incorporación y Centros',
        'Sube sin criterio dejando su espalda desprotegida o centra sin mirar.',
        'Sube ocasionalmente pero sus centros carecen de precisión.',
        'Elige buenos momentos para desdoblar y coloca centros con peligro.',
        'Gran profundidad ofensiva con centros tensos y repliegue veloz asegurado.',
        'Lateral total: genera superioridades constantes y centros milimétricos de gol.'
      )
    });

    // Delantero
    this.register({
      id: 'pos_st_desmarques_remate',
      code: 'st_desmarques',
      name: 'Desmarques de Ruptura y Fijación (Delantero)',
      area: 'tactica',
      description: 'Movilidad entre centrales, desmarques de apoyo/ruptura y gol en pocos toques.',
      indicators: ['Desmarque a la espalda', 'Juego de espaldas protegiendo balón', 'Olfato de gol'],
      isPositional: true,
      positionTarget: ['delantero'],
      rubrics: createStandardRubric(
        'Desmarques y Remate',
        'Estático entre los centrales, cae continuamente en fuera de juego.',
        'Se desmarca pero le cuesta descargar de espaldas a portería.',
        'Buenos movimientos de arrastre y desmarques al espacio libre.',
        'Fija centrales, descarga con criterio y ataca los centros al primer palo.',
        'Delantero de referencia: constante amenaza al espacio y letal en el área.'
      )
    });
  }

  public getAllCompetencies(): CompetencyDefinition[] {
    const list: CompetencyDefinition[] = [];
    const seen = new Set<string>();
    for (const comp of this.competencies.values()) {
      if (!seen.has(comp.id)) {
        seen.add(comp.id);
        list.push(comp);
      }
    }
    return list;
  }

  public getCompetenciesForCategory(category: string): CompetencyDefinition[] {
    return this.getAllCompetencies().filter(c => !c.isPositional);
  }

  public getCompetenciesForPosition(position: PlayerPosition | string): CompetencyDefinition[] {
    const all = this.getAllCompetencies();
    return all.filter(c => {
      if (!c.isPositional) return true;
      if (!c.positionTarget) return false;
      return c.positionTarget.includes(position as PlayerPosition);
    });
  }

  public getCompetenciesByArea(area: CompetencyArea): CompetencyDefinition[] {
    return this.getAllCompetencies().filter(c => c.area === area);
  }

  public getCompetency(idOrCode: string): CompetencyDefinition | undefined {
    return this.competencies.get(idOrCode);
  }
}
