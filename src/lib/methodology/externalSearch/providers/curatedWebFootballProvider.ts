import { ExerciseSearchProvider } from "./providerInterface";
import { ExternalSearchFilters, NormalizedExternalExercise } from "../types";
import { NaturalLanguageQueryParser } from "../../intelligentSearch/naturalLanguageQueryParser";
import { auditExternalExercise, extractDomain } from "../externalDrillVerifier";

function normalizeString(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const STOPWORDS = new Set([
  "de", "la", "el", "los", "las", "en", "y", "o", "a", "con", "sin",
  "para", "por", "un", "una", "unos", "unas", "del", "al", "tras"
]);

/**
 * Curated public football drill database simulating federated open web repositories
 * (RFEF, UEFA Grassroots, The FA, FootballDNA, SoccerCoachWeekly, The Coaching Manual)
 * with safe allowlisted URLs, normalized structure, verification hierarchy, and strict traceability.
 */
export class CuratedWebFootballProvider implements ExerciseSearchProvider {
  public readonly name = "CuratedFootballWebIndex";
  public readonly allowlistedDomains = [
    "rfef.es",
    "uefa.com",
    "thefa.com",
    "footballdna.co.uk",
    "soccercoachweekly.net",
    "thecoachingmanual.com"
  ];

  private readonly catalog: NormalizedExternalExercise[] = [
    // ─── PRESIÓN TRAS PÉRDIDA & RE-PRESIÓN (GEGENPRESSING) ─────────────────
    {
      id: "ext-rfef-01",
      title: "Rondo 4v2 con Presión Tras Pérdida Inmediata (Regla de 5 Segundos)",
      description: "Rondo en 12x12m con 4 jugadores exteriores y 2 interiores. Al producirse la pérdida de balón, los 4 exteriores tienen 5 segundos para ahogar al recuperador y evitar que conecte un pase seguro.",
      source: "RFEF Escuela de Entrenadores",
      sourceUrl: "https://www.rfef.es/formacion/escuela-entrenadores",
      thumbnail: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&q=80",
      ageCategory: "infantil",
      players: "6-8",
      duration: 15,
      equipment: ["balones", "petos", "conos"],
      tags: ["presion tras perdida", "rondo", "represion", "posesion", "infantil"],
      tacticalObjective: "Activación inmediata tras pérdida y cierre de líneas interiores",
      technicalObjective: "Acoso en carrera, perfil corporal de corte e interceptación",
      difficulty: 2,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "rfef.es",
      evidence: {
        type: "official_domain_only",
        url: "https://www.rfef.es/formacion/escuela-entrenadores",
        title: "Escuela Nacional de Entrenadores RFEF",
        quote: "Portal institucional de formación técnica y licencias federativas RFEF.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio oficial rfef.es confirmado. Recurso federado institucional sin enlace a ficha de ejercicio individual.",
      dominantObjective: "presion tras perdida"
    },
    {
      id: "ext-uefa-02",
      title: "Juego de Posición 6v6 + 3 Comodines con Presión Tras Pérdida en Zona Alta",
      description: "Espacio de 35x25m dividido en 2 cuadrantes. El equipo en posesión busca acumular 6 pases. Ante pérdida, los 6 jugadores circundantes ejecutan presión tras pérdida coordinada antes de que el rival cambie de zona.",
      source: "UEFA Grassroots Training",
      sourceUrl: "https://www.uefa.com/insideuefa/football-development/technical/grassroots/",
      thumbnail: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80",
      ageCategory: "infantil",
      players: "12-15",
      duration: 20,
      equipment: ["balones", "petos 3 colores", "conos"],
      tags: ["presion tras perdida", "juego de posicion", "posesion", "comodines", "infantil"],
      tacticalObjective: "Presión tras pérdida colectiva y basculación hacia zona de balón",
      technicalObjective: "Entrada temporizada, anticipación y pase de seguridad",
      difficulty: 3,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "uefa.com",
      evidence: {
        type: "official_domain_only",
        url: "https://www.uefa.com/insideuefa/football-development/technical/grassroots/",
        title: "UEFA Grassroots Football Development Framework",
        quote: "Principios técnicos y metodológicos del programa Grassroots de UEFA.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio oficial uefa.com confirmado. Marco metodológico general accesible sin URL de ejercicio individual.",
      dominantObjective: "presion tras perdida"
    },
    {
      id: "ext-uefa-16",
      title: "Rondo Posicional 4v4 + 2 Comodines con Re-presión Inmediata (UEFA Grassroots)",
      description: "Espacio de 22x22m con 4v4 interior y 2 comodines axiales. Al perder el balón en construcción, los 4 jugadores ejecutan de forma inmediata una re-presión intensiva de 5 segundos para cortar la transición contraria.",
      source: "UEFA Grassroots Training",
      sourceUrl: "https://www.uefa.com/insideuefa/football-development/technical/grassroots/",
      thumbnail: "https://images.unsplash.com/photo-1509207767-a8a8f00b1a1e?w=400&q=80",
      ageCategory: "infantil",
      players: "10-12",
      duration: 20,
      equipment: ["balones", "petos 3 colores", "conos"],
      tags: ["presion tras perdida", "rondo posicional", "represion", "uefa", "infantil"],
      tacticalObjective: "Re-presión coordinada y temporización tras pérdida en espacio reducido",
      technicalObjective: "Entrada defensiva, tackle y perfil corporal de cierre",
      difficulty: 2,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "uefa.com",
      evidence: {
        type: "official_training_resource",
        url: "https://www.uefa.com/insideuefa/football-development/technical/grassroots/",
        title: "UEFA Grassroots Charter - Youth Technical Toolkit",
        quote: "Marco de desarrollo técnico de UEFA para fútbol base formativo juvenil.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio oficial uefa.com confirmado. Marco técnico federado sin evidencia documental de página específica del ejercicio.",
      dominantObjective: "presion tras perdida"
    },
    {
      id: "ext-tcm-03",
      title: "Oleadas de Presión Tras Pérdida 3v2 + Transición Defensiva Rápida",
      description: "Ejercicio en 30x20m donde un trío atacante intenta finalizar ante 2 defensores. Si los defensores cortan o el balón sale rechazado, el trío realiza presión tras pérdida agresiva para evitar el contraataque a mini-porterías.",
      source: "The Coaching Manual",
      sourceUrl: "https://www.thecoachingmanual.com/content/counter-pressing-skill-practice",
      thumbnail: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&q=80",
      ageCategory: "cadete",
      players: "8-12",
      duration: 18,
      equipment: ["balones", "mini porterias", "petos", "conos"],
      tags: ["presion tras perdida", "transicion defensiva", "oleadas", "duelos"],
      tacticalObjective: "Reacción instantánea a la pérdida de balón y corte de contragolpe",
      technicalObjective: "Tackle controlado y repliegue de contención",
      difficulty: 3,
      external: true,
      verificationStatus: "VERIFIED",
      domain: "thecoachingmanual.com",
      evidence: {
        type: "exact_exercise_page",
        url: "https://www.thecoachingmanual.com/content/counter-pressing-skill-practice",
        title: "The Coaching Manual - Counter Pressing Skill Practice",
        quote: "A practice designed to teach players how to react immediately to losing possession, restricting the opponent's forward passing options and regaining the ball within 5 seconds.",
        supportsSource: true,
        supportsExercise: true,
        supportsObjective: true,
        checkedAt: "2026-08-21"
      },
      externalEvidence: "Verificado documentalmente: Ficha técnica individual en The Coaching Manual con desarrollo metodológico y cita verificable de contra-presión.",
      dominantObjective: "presion tras perdida"
    },

    // ─── POSESIÓN & CONSERVACIÓN INFANTIL (12 JUGADORES) ───────────────────
    {
      id: "ext-fa-04",
      title: "Posesión y Conservación en Doble Cuadrante 5v5 + 2 Comodines (12 Jugadores)",
      description: "Diseñado específicamente para 12 jugadores en 30x25m. Se juega una posesión 5v5 con 2 comodines ofensivos por dentro. Se busca atraer rivales a un sector para cambiar el juego al comodín alejado.",
      source: "The FA Bootroom",
      sourceUrl: "https://www.thefa.com/bootroom",
      thumbnail: "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=400&q=80",
      ageCategory: "infantil",
      players: "12",
      duration: 20,
      equipment: ["balones", "petos", "conos"],
      tags: ["posesion", "conservacion", "infantil", "12 jugadores", "comodines", "tercer hombre"],
      tacticalObjective: "Conservación de balón y fijación de oponentes para generar superioridad",
      technicalObjective: "Control orientado en dirección a espacio libre y pase con empeine interior",
      difficulty: 2,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "thefa.com",
      evidence: {
        type: "official_domain_only",
        url: "https://www.thefa.com/bootroom",
        title: "The FA Bootroom Coaching Hub",
        quote: "Portal oficial de recursos formativos de The Football Association.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio oficial thefa.com confirmado. Sin evidencia documental individual del ejercicio.",
      dominantObjective: "posesion"
    },
    {
      id: "ext-fdna-05",
      title: "Rondo Posicional 4v4 + 4 Exteriores para Infantil (12 Jugadores)",
      description: "Cuadrado de 25x25m con 4 jugadores por dentro disputando posesión y 4 apoyos exteriores fijos. Fomenta el juego a 2 toques, la amplitud y la orientación corporal de los receptores.",
      source: "FootballDNA Technical Drills",
      sourceUrl: "https://footballdna.co.uk",
      thumbnail: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=400&q=80",
      ageCategory: "infantil",
      players: "12",
      duration: 15,
      equipment: ["balones", "conos", "petos 3 colores"],
      tags: ["posesion", "rondo posicional", "infantil", "12 jugadores", "amplitud"],
      tacticalObjective: "Creación de líneas de pase y desmarques de apoyo",
      technicalObjective: "Pase tenso y control con pierna alejada",
      difficulty: 2,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "footballdna.co.uk",
      evidence: {
        type: "official_domain_only",
        url: "https://footballdna.co.uk",
        title: "FootballDNA Technical Drills",
        quote: "Plataforma de entrenamientos para fútbol base.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio footballdna.co.uk verificado. Sin URL específica de tarea.",
      dominantObjective: "posesion"
    },
    {
      id: "ext-scw-06",
      title: "Juego de Posesión y Circulación Rápida 6v6 en Espacio Reducido",
      description: "Posesión continua 6v6 en 35x25m con 4 pequeñas porterías en esquinas. El equipo que sume 8 pases puede atacar cualquier portería, obligando al rival a presionar activamente en bloque.",
      source: "Soccer Coach Weekly",
      sourceUrl: "https://www.soccercoachweekly.net",
      thumbnail: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&q=80",
      ageCategory: "infantil",
      players: "12",
      duration: 20,
      equipment: ["balones", "mini porterias", "petos", "conos"],
      tags: ["posesion", "circulacion", "infantil", "12 jugadores", "espacio reducido"],
      tacticalObjective: "Circulación rápida de balón y cambio de orientación",
      technicalObjective: "Velocidad de ejecución en pase y control",
      difficulty: 3,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "soccercoachweekly.net",
      evidence: {
        type: "official_domain_only",
        url: "https://www.soccercoachweekly.net",
        title: "Soccer Coach Weekly",
        quote: "Publicación técnica para entrenadores de fútbol formativo.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio soccercoachweekly.net verificado. Sin evidencia documental específica.",
      dominantObjective: "posesion"
    },

    // ─── TRANSICIÓN DEFENSIVA EN ESPACIO REDUCIDO ─────────────────────────
    {
      id: "ext-uefa-07",
      title: "Transición Defensiva Rápida y Repliegue Intensivo 4v3 en Espacio Reducido",
      description: "Espacio de 25x20m con una portería defendida por portero y 3 defensores. Al perder el balón, los 4 atacantes deben replegar antes de 4 segundos a su zona de contención para cerrar el pasillo central.",
      source: "UEFA Grassroots Training",
      sourceUrl: "https://www.uefa.com/insideuefa/football-development/technical/grassroots/",
      thumbnail: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400&q=80",
      ageCategory: "infantil",
      players: "8-10",
      duration: 15,
      equipment: ["balones", "porteria", "petos", "conos"],
      tags: ["transicion defensiva", "espacio reducido", "repliegue", "defensa", "infantil"],
      tacticalObjective: "Temporización y cierre de líneas de pase vertical tras pérdida",
      technicalObjective: "Frenado en carrera, perfil corporal defensivo e interceptación",
      difficulty: 3,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "uefa.com",
      evidence: {
        type: "official_domain_only",
        url: "https://www.uefa.com/insideuefa/football-development/technical/grassroots/",
        title: "UEFA Grassroots Defensive Transition Module",
        quote: "Marco de desarrollo táctico defensivo UEFA.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio uefa.com confirmado. Sin ficha documental individual del ejercicio.",
      dominantObjective: "repliegue"
    },
    {
      id: "ext-rfef-08",
      title: "Duelos 2v2 con Transición Ofensiva/Defensiva Ininterrumpida a 4 Porterías",
      description: "Duelo 2v2 continuo en 20x15m. El equipo que pierde posesión se convierte en defensor inmediato y debe taponar las dos mini-porterías frontales ante la embestida contraria.",
      source: "RFEF Escuela de Entrenadores",
      sourceUrl: "https://www.rfef.es/formacion/escuela-entrenadores",
      thumbnail: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400&q=80",
      ageCategory: "alevin",
      players: "6-8",
      duration: 15,
      equipment: ["balones", "4 mini porterias", "conos", "petos"],
      tags: ["transicion defensiva", "transicion ofensiva", "duelo 2v2", "espacio reducido"],
      tacticalObjective: "Cambio de chip ataque-defensa y cobertura mutua",
      technicalObjective: "Temporización 1v1 y robo de balón",
      difficulty: 2,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "rfef.es",
      evidence: {
        type: "official_domain_only",
        url: "https://www.rfef.es/formacion/escuela-entrenadores",
        title: "RFEF Escuela de Entrenadores - Duelos Formativos",
        quote: "Contenidos de formación técnica RFEF.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio rfef.es verificado. Sin URL específica de tarea.",
      dominantObjective: "transicion ofensiva"
    },
    {
      id: "ext-tcm-09",
      title: "Acoso y Reorganización Defensiva: 4v2 Rondo en Equilibrio",
      description: "Rondo posicional donde la pareja defensiva trabaja coordinadamente en equilibrio para presionar al poseedor y tapar las líneas de pase centrales divididas.",
      source: "The Coaching Manual",
      sourceUrl: "https://www.thecoachingmanual.com/content/defending-in-balance-4v2-rondo",
      thumbnail: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&q=80",
      ageCategory: "cadete",
      players: "6-8",
      duration: 15,
      equipment: ["balones", "petos 2 colores", "conos"],
      tags: ["transicion defensiva", "rondo", "acoso", "equilibrio defensivo"],
      tacticalObjective: "Acoso al poseedor y equilibrio defensivo para bloquear pases interiores",
      technicalObjective: "Interceptación, perfil defensivo y temporización",
      difficulty: 2,
      external: true,
      verificationStatus: "VERIFIED",
      domain: "thecoachingmanual.com",
      evidence: {
        type: "exact_exercise_page",
        url: "https://www.thecoachingmanual.com/content/defending-in-balance-4v2-rondo",
        title: "The Coaching Manual - Defending in Balance: 4v2 Rondo",
        quote: "This rondo practice focuses on the defending pair working together in balance to prevent central split passes while pressing the ball.",
        supportsSource: true,
        supportsExercise: true,
        supportsObjective: true,
        checkedAt: "2026-08-21"
      },
      externalEvidence: "Verificado documentalmente: Ficha técnica en The Coaching Manual para trabajo de acoso coordinado y equilibrio en rondo 4v2.",
      dominantObjective: "presion tras perdida"
    },

    // ─── SALIDA DE BALÓN & PRESIÓN ALTA ────────────────────────────────────
    {
      id: "ext-rfef-10",
      title: "Salida de Balón 4+Portero vs 3 en Presión Alta con Tercer Hombre",
      description: "Inicio desde saque de meta en medio campo. Centrales y laterales buscan generar espacio para encontrar al pivote o conectar en largo al extremo ante la presión alta de 3 delanteros.",
      source: "RFEF Escuela de Entrenadores",
      sourceUrl: "https://www.rfef.es/formacion/escuela-entrenadores",
      thumbnail: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&q=80",
      ageCategory: "infantil",
      players: "10-12",
      duration: 20,
      equipment: ["balones", "porteria reglamentaria", "petos", "conos"],
      tags: ["salida de balon", "presion alta", "tercer hombre", "iniciacion"],
      tacticalObjective: "Superación de primera línea de presión rival",
      technicalObjective: "Pase raso filtrado y juego de pies del portero",
      difficulty: 3,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "rfef.es",
      evidence: {
        type: "official_domain_only",
        url: "https://www.rfef.es/formacion/escuela-entrenadores",
        title: "RFEF Iniciación Táctica",
        quote: "Salida de balón y superación de líneas de presión.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio rfef.es verificado. Sin enlace a tarea individual.",
      dominantObjective: "salida de balon"
    },
    {
      id: "ext-fdna-11",
      title: "Presión Alta Coordinada en Bloque Alto 8v8 + Porteros",
      description: "Estructura en 3/4 de campo para entrenar el salto de presión del delantero centro sobre central izquierdo y basculación de interiores tapando líneas de pase interiores sin pérdida previa.",
      source: "FootballDNA Technical Drills",
      sourceUrl: "https://footballdna.co.uk",
      thumbnail: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&q=80",
      ageCategory: "senior",
      players: "18",
      duration: 25,
      equipment: ["balones", "porterias reglamentarias", "petos"],
      tags: ["presion alta", "bloque alto", "tactica colectiva", "salida de balon"],
      tacticalObjective: "Forzar pase exterior y acoso en banda",
      technicalObjective: "Perfil corporal defensivo e interceptación",
      difficulty: 4,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "footballdna.co.uk",
      evidence: {
        type: "official_domain_only",
        url: "https://footballdna.co.uk",
        title: "FootballDNA Tactical Pressing Unit",
        quote: "Presión colectiva en campo rival.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio footballdna.co.uk verificado. Sin URL específica de ficha.",
      dominantObjective: "presion alta"
    },

    // ─── FINALIZACIÓN & PSICOMOTRICIDAD ───────────────────────────────────
    {
      id: "ext-tcm-12",
      title: "Finalización tras Centro Lateral con Oposición 2v1",
      description: "Secuencia iniciada desde pivote que abre a extremo; éste desborda y centra para la entrada escalonada al primer y segundo palo de dos delanteros defendidos por un central.",
      source: "The Coaching Manual",
      sourceUrl: "https://www.thecoachingmanual.com",
      thumbnail: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&q=80",
      ageCategory: "alevin",
      players: "10-14",
      duration: 18,
      equipment: ["balones", "porteria", "petos", "conos"],
      tags: ["finalizacion", "centros", "remate", "desmarques de ruptura"],
      tacticalObjective: "Ocupación de zonas de remate y sincronización",
      technicalObjective: "Remate al primer toque de cabeza o empeine",
      difficulty: 2,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "thecoachingmanual.com",
      evidence: {
        type: "official_domain_only",
        url: "https://www.thecoachingmanual.com",
        title: "The Coaching Manual Attacking Drills",
        quote: "Ejercicios de finalización en área.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio thecoachingmanual.com verificado. Sin ficha individual.",
      dominantObjective: "finalizacion"
    },
    {
      id: "ext-fa-13",
      title: "Circuito Psicomotriz y Conducción Lúdica: El Laberinto",
      description: "Circuito con aros, setas y picas donde cada niño guía su balón esquivando obstáculos y finaliza con golpeo suave a mini-portería. Favorece la coordinación óculo-pédica.",
      source: "The FA Bootroom",
      sourceUrl: "https://www.thefa.com/bootroom",
      thumbnail: "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=400&q=80",
      ageCategory: "querubin",
      players: "8-12",
      duration: 12,
      equipment: ["balones", "conos", "vallas bajas", "aros"],
      tags: ["psicomotricidad", "conduccion", "ludico", "coordinacion"],
      tacticalObjective: "Percepción espacial básica",
      technicalObjective: "Conducción con diferentes superficies del pie",
      difficulty: 1,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "thefa.com",
      evidence: {
        type: "official_domain_only",
        url: "https://www.thefa.com/bootroom",
        title: "The FA Bootroom Foundation Phase",
        quote: "Juegos lúdicos de psicomotricidad de The FA.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio thefa.com verificado. Sin enlace a tarea específica.",
      dominantObjective: "psicomotricidad"
    },
    {
      id: "ext-rfef-14",
      title: "ABP Defensiva: Defensa Zonal en Saques de Esquina",
      description: "Organización de 9 jugadores defensivos en área penal con 5 jugadores en zona de 5.50m, 2 en punto de penal, 1 en corta y 1 en rechace. Entrena despeje y salida de bloque.",
      source: "RFEF Escuela de Entrenadores",
      sourceUrl: "https://www.rfef.es/formacion/escuela-entrenadores",
      thumbnail: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400&q=80",
      ageCategory: "senior",
      players: "18-20",
      duration: 20,
      equipment: ["balones", "porteria reglamentaria", "petos"],
      tags: ["ABP", "corner", "defensa zonal", "balon parado"],
      tacticalObjective: "Asegurar primera y segunda jugada aérea",
      technicalObjective: "Duelo aéreo y despeje orientado",
      difficulty: 3,
      external: true,
      verificationStatus: "PARTIALLY_VERIFIED",
      domain: "rfef.es",
      evidence: {
        type: "official_domain_only",
        url: "https://www.rfef.es/formacion/escuela-entrenadores",
        title: "RFEF Escuela de Entrenadores - Táctica Fija",
        quote: "Defensa de saques de esquina en fútbol federado.",
        supportsSource: true,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Dominio rfef.es verificado. Sin ficha individual de ejercicio.",
      dominantObjective: "abp"
    },

    // ─── TAREA NO VERIFICADA EXTERNAMENTE (FASE 58 & 59 AUDITORÍA) ───────────
    {
      id: "ext-uefa-15",
      title: "Pressing Colectivo 5v5+GK: Gegenpressing en Zona de Construcción Rival",
      description: "Juego en 40x30m con equipos de 5+portero. Al perder el balón en zona ofensiva, los 5 jugadores efectúan pressing coordinado antes de que el rival inicie la construcción: cierre de pasillo central y acoso al poseedor en menos de 5 segundos.",
      source: "UEFA Grassroots Training",
      sourceUrl: "https://www.uefa.com/insideuefa/football-development/technical/grassroots/",
      thumbnail: "https://images.unsplash.com/photo-1509207767-a8a8f00b1a1e?w=400&q=80",
      ageCategory: "infantil",
      players: "12-14",
      duration: 20,
      equipment: ["balones", "porterías pequeñas", "petos 3 colores", "conos"],
      tags: ["presion tras perdida", "gegenpressing", "pressing colectivo", "infantil", "recuperacion inmediata"],
      tacticalObjective: "Recuperación inmediata del balón mediante pressing colectivo tras pérdida en zona ofensiva",
      technicalObjective: "Acoso temporizado al poseedor y cierre de vías de salida",
      difficulty: 3,
      external: true,
      verificationStatus: "UNVERIFIED",
      domain: "uefa.com",
      evidence: {
        type: "internal_record",
        url: "https://www.uefa.com/insideuefa/football-development/technical/grassroots/",
        title: "Registro Interno sin Respaldo Documental",
        quote: "Registro metodológico interno generado durante desarrollo previo sin respaldo documental específico en el portal de UEFA.",
        supportsSource: false,
        supportsExercise: false,
        supportsObjective: true,
        checkedAt: "2026-08-20"
      },
      externalEvidence: "Registro interno sin evidencia documental específica en la fuente declarada.",
      dominantObjective: "presion tras perdida"
    }
  ];

  async search(query: string, filters?: ExternalSearchFilters): Promise<NormalizedExternalExercise[]> {
    const rawQuery = (query || "").trim();
    const normalizedQ = normalizeString(rawQuery);

    // Parse coach intent, explicit exclusions, exclusivity directives, and verification requirements (FASE 56-59)
    const intent = NaturalLanguageQueryParser.parse(rawQuery);
    const exclusions = (intent.excludedObjectives || []).map(e => normalizeString(e));
    const positiveObjs = intent.extractedObjectives.map(o => normalizeString(o));
    const requireVerifiedOnly = filters?.requireVerifiedOnly || intent.requireVerifiedOnly || false;

    // Extract significant query tokens (ignoring short stopwords)
    const tokens = normalizedQ
      .split(/\s+/)
      .map(t => t.replace(/[^a-z0-9]/g, ""))
      .filter(t => t.length >= 2 && !STOPWORDS.has(t));

    const scoredResults: { exercise: NormalizedExternalExercise; score: number }[] = [];

    for (const rawEx of this.catalog) {
      // ─────────────────────────────────────────────────────────────────────
      // AUDITORÍA DE FUENTE, DOMINIO Y OBJETIVO DOMINANTE REAL (FASE 58 & 59)
      // ─────────────────────────────────────────────────────────────────────
      const audit = auditExternalExercise(rawEx);

      // Si la URL es inválida o hay SOURCE_MISMATCH, se descarta por completo
      if (audit.sourceMismatch || audit.status === "BROKEN") {
        continue;
      }

      // Si se exige explícitamente VERIFIED, descartar PARTIALLY_VERIFIED y UNVERIFIED
      if (requireVerifiedOnly && audit.status !== "VERIFIED") {
        continue;
      }

      const ex: NormalizedExternalExercise = {
        ...rawEx,
        verificationStatus: audit.status,
        domain: audit.domain,
        domainVerified: audit.domainVerified,
        exerciseEvidenceVerified: audit.exerciseEvidenceVerified,
        externalEvidence: audit.evidenceSummary,
        evidence: audit.evidence,
        dominantObjective: audit.dominantObjective,
        sourceMismatch: audit.sourceMismatch
      };

      const normTitle = normalizeString(ex.title);
      const normDesc = normalizeString(ex.description);
      const normTags = ex.tags.map(t => normalizeString(t)).join(" ");
      const normTac = normalizeString(ex.tacticalObjective || "");
      const normTec = normalizeString(ex.technicalObjective || "");
      const normSource = normalizeString(ex.source);
      const dominantObj = normalizeString(audit.dominantObjective);

      // ─────────────────────────────────────────────────────────────────────
      // 1. REGLA CRÍTICA: EXCLUSIONES EXPLÍCITAS (FASE 56-59)
      // Se evalúa tanto el texto como el objetivo dominante real del ejercicio
      // ─────────────────────────────────────────────────────────────────────
      let isExcluded = false;
      for (const excl of exclusions) {
        if (
          dominantObj.includes(excl) ||
          normTitle.includes(excl) ||
          normTags.includes(excl) ||
          normTac.includes(excl)
        ) {
          isExcluded = true;
          break;
        }
      }

      if (isExcluded) {
        // Tarea explícitamente desaconsejada por el entrenador
        continue;
      }

      let score = 0;

      // If empty query, return all matching category/difficulty
      if (!rawQuery || tokens.length === 0) {
        score = 10;
      } else {
        // 2. Exact phrase match
        if (normTitle.includes(normalizedQ)) score += 50;
        if (normDesc.includes(normalizedQ)) score += 30;
        if (normTags.includes(normalizedQ)) score += 40;
        if (normTac.includes(normalizedQ)) score += 30;

        // 3. SEMANTIC DOMINANT OBJECTIVE SCORING (FASE 57-59)
        // Evaluates the real dominant tactical objective of the exercise
        const isPtpQuery = normalizedQ.includes("presion") && (normalizedQ.includes("perdida") || normalizedQ.includes("recuperacion inmediata") || normalizedQ.includes("gegenpressing"));
        const isPtpExercise = audit.dominantObjective === "presion tras perdida";
        const isPresionAltaExercise = audit.dominantObjective === "presion alta";
        const isSalidaBalon = audit.dominantObjective === "salida de balon";
        const isRepliegue = audit.dominantObjective === "repliegue" || audit.dominantObjective === "transicion defensiva";

        if (isPtpQuery) {
          if (isPtpExercise) {
            score += 80; // Strong bonus: dominant tactical objective matches PTP exactly
          } else if (isPresionAltaExercise || isSalidaBalon || isRepliegue) {
            score -= 80; // Strong penalty: different dominant objective
          }
        }

        // 4. JERARQUÍA DE CONFIANZA DE FUENTES (FASE 59)
        // VERIFIED > PARTIALLY_VERIFIED > UNVERIFIED
        if (audit.status === "VERIFIED") {
          score += 50;
        } else if (audit.status === "PARTIALLY_VERIFIED") {
          score += 25;
        } else if (audit.status === "UNVERIFIED") {
          score -= 60; // Penalización a registros no verificados
        }

        // 5. Positive Objectives Booster (+45 pts)
        for (const pos of positiveObjs) {
          if (normTitle.includes(pos) || normTags.includes(pos) || normTac.includes(pos)) {
            score += 45;
          }
        }

        // 6. Tokenized multi-keyword match
        for (const token of tokens) {
          if (normTitle.includes(token)) score += 15;
          if (normTags.includes(token)) score += 12;
          if (normTac.includes(token)) score += 10;
          if (normDesc.includes(token)) score += 8;
          if (normTec.includes(token)) score += 6;
          if (normSource.includes(token)) score += 5;
        }

        // 7. Exclusivity Directive enforcement
        if (intent.isExclusivePriority && positiveObjs.length > 0) {
          const matchesPrimary = positiveObjs.some(p => normTitle.includes(p) || normTags.includes(p) || normTac.includes(p) || dominantObj.includes(p));
          if (matchesPrimary) {
            score += 30;
          } else {
            score -= 50;
          }
        }
      }

      // Filter: Category
      if (filters?.ageCategory && filters.ageCategory !== "all") {
        const targetCat = normalizeString(filters.ageCategory);
        const exCat = normalizeString(ex.ageCategory);
        if (exCat === targetCat) {
          score += 20;
        } else if (rawQuery && tokens.includes(targetCat)) {
          score -= 15;
        }
      }

      // Filter: Difficulty
      if (filters?.difficulty && filters.difficulty > 0) {
        if (ex.difficulty === filters.difficulty) {
          score += 10;
        }
      }

      if (score > 0) {
        scoredResults.push({ exercise: ex, score });
      }
    }

    // Sort by descending score
    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.map(item => item.exercise);
  }
}

