"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import {
  RotateCcw,
  Eye,
  ZoomIn,
  ZoomOut,
  Orbit,
  Columns2,
  X,
  Sparkles,
  MousePointer
} from "lucide-react"

export type LateralityType = "izquierda" | "derecha" | "bilateral" | "central" | "no_aplica"

export interface AnatomicalPieceData {
  id: string
  region: string
  laterality: LateralityType
  structures: string[]
  defaultStructure: string
  displayName: string
  viewSide?: "front" | "back" | "both"
}

interface AnatomicalMannequin3DProps {
  selectedRegionId?: string | null
  selectedLaterality?: LateralityType | null
  displayMode?: "orbit" | "dual"
  onSelectPiece: (piece: AnatomicalPieceData) => void
  onError?: (err: Error) => void
}

// Catálogo enriquecido con el listado oficial de Mapeo Anatómico de Lesiones Musculares en el Fútbol
export const MANNEQUIN_PIECES: Record<string, AnatomicalPieceData> = {
  // Cabeza y Cuello
  cabeza: {
    id: "cabeza",
    region: "Cabeza",
    laterality: "central",
    structures: ["Cabeza", "Cráneo", "Cara", "Mandíbula"],
    defaultStructure: "Cabeza",
    displayName: "Cabeza / Cara",
    viewSide: "both"
  },
  cuello: {
    id: "cuello",
    region: "Cuello",
    laterality: "central",
    structures: ["Cuello", "Musculatura cervical"],
    defaultStructure: "Cuello",
    displayName: "Cuello / Cervical",
    viewSide: "both"
  },

  // Tronco y Core (Listado de Fútbol)
  pecho: {
    id: "pecho",
    region: "Tronco",
    laterality: "central",
    structures: ["Pectoral mayor", "Clavícula", "Esternón", "Pecho"],
    defaultStructure: "Pectoral mayor",
    displayName: "Pectorales / Clavícula",
    viewSide: "front"
  },
  abdomen: {
    id: "abdomen",
    region: "Tronco",
    laterality: "central",
    structures: ["Recto abdominal", "Oblicuo interno / externo", "Abdomen", "Serrato anterior"],
    defaultStructure: "Recto abdominal",
    displayName: "Recto abdominal / Oblicuos (Core)",
    viewSide: "front"
  },
  espalda: {
    id: "espalda",
    region: "Tronco",
    laterality: "central",
    structures: ["Dorsal ancho", "Trapecio", "Romboides", "Espalda"],
    defaultStructure: "Dorsal ancho",
    displayName: "Dorsal ancho / Trapecio",
    viewSide: "back"
  },
  lumbar: {
    id: "lumbar",
    region: "Tronco",
    laterality: "central",
    structures: ["Erectores de la columna", "Zona lumbar", "Erectores espinales"],
    defaultStructure: "Erectores de la columna",
    displayName: "Erectores de la columna (Lumbar)",
    viewSide: "back"
  },

  // Ingle y Cadera (Aductores y Flexores del Fútbol)
  cadera_izq: {
    id: "cadera_izq",
    region: "Cadera / Pelvis",
    laterality: "izquierda",
    structures: [
      "Aductor largo (medio)",
      "Aductor mayor",
      "Pectíneo",
      "Grácil (Recto interno)",
      "Psoas ilíaco",
      "Tensor de la fascia lata",
      "Aductores",
      "Cadera",
      "Ingle"
    ],
    defaultStructure: "Aductor largo (medio)",
    displayName: "Aductores / Ingle izquierda",
    viewSide: "both"
  },
  cadera_der: {
    id: "cadera_der",
    region: "Cadera / Pelvis",
    laterality: "derecha",
    structures: [
      "Aductor largo (medio)",
      "Aductor mayor",
      "Pectíneo",
      "Grácil (Recto interno)",
      "Psoas ilíaco",
      "Tensor de la fascia lata",
      "Aductores",
      "Cadera",
      "Ingle"
    ],
    defaultStructure: "Aductor largo (medio)",
    displayName: "Aductores / Ingle derecha",
    viewSide: "both"
  },
  gluteo_izq: {
    id: "gluteo_izq",
    region: "Cadera / Pelvis",
    laterality: "izquierda",
    structures: ["Glúteo mayor", "Glúteo medio", "Pelvis posterior"],
    defaultStructure: "Glúteo mayor",
    displayName: "Glúteo izquierdo",
    viewSide: "back"
  },
  gluteo_der: {
    id: "gluteo_der",
    region: "Cadera / Pelvis",
    laterality: "derecha",
    structures: ["Glúteo mayor", "Glúteo medio", "Pelvis posterior"],
    defaultStructure: "Glúteo mayor",
    displayName: "Glúteo derecho",
    viewSide: "back"
  },

  // Hombro y Miembros Superiores (Incluye exclusivos de portero)
  hombro_izq: {
    id: "hombro_izq",
    region: "Hombro",
    laterality: "izquierda",
    structures: ["Supraespinoso (Hombro)", "Subescapular / Redondo mayor", "Deltoides", "Articulación acromioclavicular", "Hombro"],
    defaultStructure: "Supraespinoso (Hombro)",
    displayName: "Hombro izquierdo / Manguito rotador",
    viewSide: "both"
  },
  hombro_der: {
    id: "hombro_der",
    region: "Hombro",
    laterality: "derecha",
    structures: ["Supraespinoso (Hombro)", "Subescapular / Redondo mayor", "Deltoides", "Articulación acromioclavicular", "Hombro"],
    defaultStructure: "Supraespinoso (Hombro)",
    displayName: "Hombro derecho / Manguito rotador",
    viewSide: "both"
  },
  brazo_izq: {
    id: "brazo_izq",
    region: "Brazo",
    laterality: "izquierda",
    structures: ["Bíceps", "Tríceps"],
    defaultStructure: "Bíceps",
    displayName: "Brazo izquierdo (Bíceps/Tríceps)",
    viewSide: "both"
  },
  brazo_der: {
    id: "brazo_der",
    region: "Brazo",
    laterality: "derecha",
    structures: ["Bíceps", "Tríceps"],
    defaultStructure: "Bíceps",
    displayName: "Brazo derecho (Bíceps/Tríceps)",
    viewSide: "both"
  },
  codo_izq: {
    id: "codo_izq",
    region: "Codo",
    laterality: "izquierda",
    structures: ["Codo", "Epicóndilo", "Articulación"],
    defaultStructure: "Codo",
    displayName: "Codo izquierdo",
    viewSide: "both"
  },
  codo_der: {
    id: "codo_der",
    region: "Codo",
    laterality: "derecha",
    structures: ["Codo", "Epicóndilo", "Articulación"],
    defaultStructure: "Codo",
    displayName: "Codo derecho",
    viewSide: "both"
  },
  antebrazo_izq: {
    id: "antebrazo_izq",
    region: "Antebrazo",
    laterality: "izquierda",
    structures: ["Musculatura flexora", "Musculatura extensora", "Radio", "Cúbito"],
    defaultStructure: "Musculatura flexora",
    displayName: "Antebrazo izquierdo",
    viewSide: "both"
  },
  antebrazo_der: {
    id: "antebrazo_der",
    region: "Antebrazo",
    laterality: "derecha",
    structures: ["Musculatura flexora", "Musculatura extensora", "Radio", "Cúbito"],
    defaultStructure: "Musculatura flexora",
    displayName: "Antebrazo derecho",
    viewSide: "both"
  },
  muneca_izq: {
    id: "muneca_izq",
    region: "Muñeca",
    laterality: "izquierda",
    structures: ["Muñeca", "Escafoides"],
    defaultStructure: "Muñeca",
    displayName: "Muñeca izquierda",
    viewSide: "both"
  },
  muneca_der: {
    id: "muneca_der",
    region: "Muñeca",
    laterality: "derecha",
    structures: ["Muñeca", "Escafoides"],
    defaultStructure: "Muñeca",
    displayName: "Muñeca derecha",
    viewSide: "both"
  },
  mano_izq: {
    id: "mano_izq",
    region: "Mano",
    laterality: "izquierda",
    structures: ["Mano", "Metacarpos", "Dedos"],
    defaultStructure: "Mano",
    displayName: "Mano izquierda",
    viewSide: "both"
  },
  mano_der: {
    id: "mano_der",
    region: "Mano",
    laterality: "derecha",
    structures: ["Mano", "Metacarpos", "Dedos"],
    defaultStructure: "Mano",
    displayName: "Mano derecha",
    viewSide: "both"
  },

  // Muslo Anterior - Cuádriceps (Listado de Fútbol)
  muslo_ant_izq: {
    id: "muslo_ant_izq",
    region: "Muslo anterior",
    laterality: "izquierda",
    structures: [
      "Recto anterior (cuádriceps)",
      "Vasto lateral (cuádriceps)",
      "Vasto medial (cuádriceps)",
      "Sartorio",
      "Cuádriceps",
      "Recto femoral"
    ],
    defaultStructure: "Recto anterior (cuádriceps)",
    displayName: "Cuádriceps izquierdo (Muslo anterior)",
    viewSide: "front"
  },
  muslo_ant_der: {
    id: "muslo_ant_der",
    region: "Muslo anterior",
    laterality: "derecha",
    structures: [
      "Recto anterior (cuádriceps)",
      "Vasto lateral (cuádriceps)",
      "Vasto medial (cuádriceps)",
      "Sartorio",
      "Cuádriceps",
      "Recto femoral"
    ],
    defaultStructure: "Recto anterior (cuádriceps)",
    displayName: "Cuádriceps derecho (Muslo anterior)",
    viewSide: "front"
  },

  // Muslo Posterior - Isquiotibiales (Listado de Fútbol)
  muslo_post_izq: {
    id: "muslo_post_izq",
    region: "Muslo posterior",
    laterality: "izquierda",
    structures: [
      "Bíceps femoral (Cabeza larga)",
      "Bíceps femoral (Cabeza corta)",
      "Semitendinoso",
      "Semimembranoso",
      "Isquiotibiales"
    ],
    defaultStructure: "Bíceps femoral (Cabeza larga)",
    displayName: "Isquiotibiales izquierdos (Muslo posterior)",
    viewSide: "back"
  },
  muslo_post_der: {
    id: "muslo_post_der",
    region: "Muslo posterior",
    laterality: "derecha",
    structures: [
      "Bíceps femoral (Cabeza larga)",
      "Bíceps femoral (Cabeza corta)",
      "Semitendinoso",
      "Semimembranoso",
      "Isquiotibiales"
    ],
    defaultStructure: "Bíceps femoral (Cabeza larga)",
    displayName: "Isquiotibiales derechos (Muslo posterior)",
    viewSide: "back"
  },

  // Rodilla
  rodilla_izq: {
    id: "rodilla_izq",
    region: "Rodilla",
    laterality: "izquierda",
    structures: ["Rodilla", "Rótula", "Tendón rotuliano"],
    defaultStructure: "Rodilla",
    displayName: "Rodilla izquierda",
    viewSide: "both"
  },
  rodilla_der: {
    id: "rodilla_der",
    region: "Rodilla",
    laterality: "derecha",
    structures: ["Rodilla", "Rótula", "Tendón rotuliano"],
    defaultStructure: "Rodilla",
    displayName: "Rodilla derecha",
    viewSide: "both"
  },

  // Pierna Inferior - Pantorrilla (Listado de Fútbol)
  pierna_izq_ant: {
    id: "pierna_izq_ant",
    region: "Pierna",
    laterality: "izquierda",
    structures: ["Tibial anterior", "Peroneo lateral largo / corto"],
    defaultStructure: "Tibial anterior",
    displayName: "Tibial anterior izquierdo",
    viewSide: "front"
  },
  pierna_der_ant: {
    id: "pierna_der_ant",
    region: "Pierna",
    laterality: "derecha",
    structures: ["Tibial anterior", "Peroneo lateral largo / corto"],
    defaultStructure: "Tibial anterior",
    displayName: "Tibial anterior derecho",
    viewSide: "front"
  },
  pierna_izq_post: {
    id: "pierna_izq_post",
    region: "Pierna",
    laterality: "izquierda",
    structures: [
      "Gemelo interno (Gastrocnemio)",
      "Gemelo externo (Gastrocnemio)",
      "Sóleo",
      "Gemelo"
    ],
    defaultStructure: "Gemelo interno (Gastrocnemio)",
    displayName: "Gemelo y Sóleo izquierdo (Pantorrilla)",
    viewSide: "back"
  },
  pierna_der_post: {
    id: "pierna_der_post",
    region: "Pierna",
    laterality: "derecha",
    structures: [
      "Gemelo interno (Gastrocnemio)",
      "Gemelo externo (Gastrocnemio)",
      "Sóleo",
      "Gemelo"
    ],
    defaultStructure: "Gemelo interno (Gastrocnemio)",
    displayName: "Gemelo y Sóleo derecho (Pantorrilla)",
    viewSide: "back"
  },

  // Tobillo y Pie
  tobillo_izq: {
    id: "tobillo_izq",
    region: "Tobillo",
    laterality: "izquierda",
    structures: ["Tobillo interno", "Tobillo externo", "Tendón de Aquiles"],
    defaultStructure: "Tobillo externo",
    displayName: "Tobillo izquierdo / Aquiles",
    viewSide: "both"
  },
  tobillo_der: {
    id: "tobillo_der",
    region: "Tobillo",
    laterality: "derecha",
    structures: ["Tobillo interno", "Tobillo externo", "Tendón de Aquiles"],
    defaultStructure: "Tobillo externo",
    displayName: "Tobillo derecho / Aquiles",
    viewSide: "both"
  },
  pie_izq: {
    id: "pie_izq",
    region: "Pie",
    laterality: "izquierda",
    structures: ["Empeine", "Talón", "Planta", "Dedos"],
    defaultStructure: "Empeine",
    displayName: "Pie y dedos izquierdos",
    viewSide: "both"
  },
  pie_der: {
    id: "pie_der",
    region: "Pie",
    laterality: "derecha",
    structures: ["Empeine", "Talón", "Planta", "Dedos"],
    defaultStructure: "Empeine",
    displayName: "Pie y dedos derechos",
    viewSide: "both"
  }
}

// Coordenadas espaciales 3D para los hitboxes anatómicos
interface HitboxDef {
  pieceId: string
  pos: [number, number, number]
  size: [number, number, number]
}

const HITBOXES_3D: HitboxDef[] = [
  // Cabeza y Cuello
  { pieceId: "cabeza", pos: [0, 0.90, 0], size: [0.34, 0.32, 0.32] },
  { pieceId: "cuello", pos: [0, 0.72, 0], size: [0.22, 0.15, 0.22] },

  // Tronco y Core
  { pieceId: "pecho", pos: [0, 0.52, 0.08], size: [0.54, 0.26, 0.18] },
  { pieceId: "abdomen", pos: [0, 0.28, 0.07], size: [0.44, 0.24, 0.16] },
  { pieceId: "espalda", pos: [0, 0.52, -0.08], size: [0.54, 0.26, 0.18] },
  { pieceId: "lumbar", pos: [0, 0.28, -0.07], size: [0.44, 0.24, 0.16] },

  // Cadera, Aductores y Glúteos
  { pieceId: "cadera_izq", pos: [-0.16, 0.06, 0.05], size: [0.26, 0.20, 0.20] },
  { pieceId: "cadera_der", pos: [0.16, 0.06, 0.05], size: [0.26, 0.20, 0.20] },
  { pieceId: "gluteo_izq", pos: [-0.16, 0.06, -0.07], size: [0.26, 0.22, 0.20] },
  { pieceId: "gluteo_der", pos: [0.16, 0.06, -0.07], size: [0.26, 0.22, 0.20] },

  // Miembros Superiores - Izquierdo
  { pieceId: "hombro_izq", pos: [-0.40, 0.60, 0], size: [0.24, 0.22, 0.22] },
  { pieceId: "brazo_izq", pos: [-0.50, 0.38, 0], size: [0.20, 0.26, 0.20] },
  { pieceId: "codo_izq", pos: [-0.60, 0.20, 0], size: [0.18, 0.16, 0.18] },
  { pieceId: "antebrazo_izq", pos: [-0.68, 0.04, 0], size: [0.18, 0.24, 0.18] },
  { pieceId: "muneca_izq", pos: [-0.76, -0.12, 0], size: [0.16, 0.12, 0.16] },
  { pieceId: "mano_izq", pos: [-0.82, -0.26, 0], size: [0.18, 0.18, 0.14] },

  // Miembros Superiores - Derecho
  { pieceId: "hombro_der", pos: [0.40, 0.60, 0], size: [0.24, 0.22, 0.22] },
  { pieceId: "brazo_der", pos: [0.50, 0.38, 0], size: [0.20, 0.26, 0.20] },
  { pieceId: "codo_der", pos: [0.60, 0.20, 0], size: [0.18, 0.16, 0.18] },
  { pieceId: "antebrazo_der", pos: [0.68, 0.04, 0], size: [0.18, 0.24, 0.18] },
  { pieceId: "muneca_der", pos: [0.76, -0.12, 0], size: [0.16, 0.12, 0.16] },
  { pieceId: "mano_der", pos: [0.82, -0.26, 0], size: [0.18, 0.18, 0.14] },

  // Miembros Inferiores - Izquierdo
  { pieceId: "muslo_ant_izq", pos: [-0.18, -0.20, 0.07], size: [0.24, 0.34, 0.18] },
  { pieceId: "muslo_post_izq", pos: [-0.18, -0.20, -0.07], size: [0.24, 0.34, 0.18] },
  { pieceId: "rodilla_izq", pos: [-0.18, -0.44, 0.03], size: [0.22, 0.16, 0.20] },
  { pieceId: "pierna_izq_ant", pos: [-0.19, -0.66, 0.06], size: [0.20, 0.30, 0.16] },
  { pieceId: "pierna_izq_post", pos: [-0.19, -0.66, -0.06], size: [0.20, 0.30, 0.16] },
  { pieceId: "tobillo_izq", pos: [-0.19, -0.86, 0], size: [0.18, 0.14, 0.18] },
  { pieceId: "pie_izq", pos: [-0.19, -0.98, 0.05], size: [0.18, 0.12, 0.28] },

  // Miembros Inferiores - Derecho
  { pieceId: "muslo_ant_der", pos: [0.18, -0.20, 0.07], size: [0.24, 0.34, 0.18] },
  { pieceId: "muslo_post_der", pos: [0.18, -0.20, -0.07], size: [0.24, 0.34, 0.18] },
  { pieceId: "rodilla_der", pos: [0.18, -0.44, 0.03], size: [0.22, 0.16, 0.20] },
  { pieceId: "pierna_der_ant", pos: [0.19, -0.66, 0.06], size: [0.20, 0.30, 0.16] },
  { pieceId: "pierna_der_post", pos: [0.19, -0.66, -0.06], size: [0.20, 0.30, 0.16] },
  { pieceId: "tobillo_der", pos: [0.19, -0.86, 0], size: [0.18, 0.14, 0.18] },
  { pieceId: "pie_der", pos: [0.19, -0.98, 0.05], size: [0.18, 0.12, 0.28] }
]

export function AnatomicalMannequin3D({
  selectedRegionId,
  selectedLaterality,
  displayMode = "orbit",
  onSelectPiece,
  onError
}: AnatomicalMannequin3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [currentMode, setCurrentMode] = useState<"orbit" | "dual">(displayMode)
  const [hoveredPiece, setHoveredPiece] = useState<AnatomicalPieceData | null>(null)
  const [selectedPieceData, setSelectedPieceData] = useState<AnatomicalPieceData | null>(null)
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Referencias Three.js
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const reqIdRef = useRef<number | null>(null)

  // Grupos
  const singleGroupRef = useRef<THREE.Group | null>(null)
  const dualGroupRef = useRef<THREE.Group | null>(null)
  const hitboxesRef = useRef<Map<string, THREE.Mesh[]>>(new Map())
  const haloMeshesRef = useRef<Map<string, THREE.Mesh[]>>(new Map())

  // Controles de rotación e interactividad
  const targetRotationY = useRef<number>(0)
  const currentRotationY = useRef<number>(0)
  const targetRotationX = useRef<number>(0)
  const currentRotationX = useRef<number>(0)
  const targetDistance = useRef<number>(3.3)
  const currentDistance = useRef<number>(3.3)

  const isDragging = useRef<boolean>(false)
  const prevPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const moved = useRef<boolean>(false)
  const touchStartDist = useRef<number>(0)

  // Material de estudio atlético médico
  const athleteMaterial = useRef(
    new THREE.MeshStandardMaterial({
      color: 0x243242, // tono azul pizarra atlético
      roughness: 0.45,
      metalness: 0.2
    })
  )

  const haloSelectedMat = useRef(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2
    })
  )

  const haloHoverMat = useRef(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      transparent: true,
      opacity: 0.45,
      roughness: 0.2
    })
  )

  // Función para construir hitboxes y halos volumétricos sobre una instancia
  const buildHitboxes = useCallback((parent: THREE.Group, offset: [number, number, number], rotY: number) => {
    const instGroup = new THREE.Group()
    instGroup.position.set(...offset)
    instGroup.rotation.y = rotY

    HITBOXES_3D.forEach(def => {
      // 1. Hitbox invisible de colisión
      const geo = new THREE.BoxGeometry(...def.size)
      const mat = new THREE.MeshBasicMaterial({ visible: false })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(...def.pos)
      mesh.userData = { pieceId: def.pieceId }
      instGroup.add(mesh)

      // 2. Halo luminoso volumétrico que resalta la zona
      const haloGeo = new THREE.BoxGeometry(def.size[0] * 1.06, def.size[1] * 1.06, def.size[2] * 1.06)
      const haloMesh = new THREE.Mesh(haloGeo, haloSelectedMat.current)
      haloMesh.position.set(...def.pos)
      haloMesh.visible = false
      instGroup.add(haloMesh)

      if (!hitboxesRef.current.has(def.pieceId)) hitboxesRef.current.set(def.pieceId, [])
      hitboxesRef.current.get(def.pieceId)!.push(mesh)

      if (!haloMeshesRef.current.has(def.pieceId)) haloMeshesRef.current.set(def.pieceId, [])
      haloMeshesRef.current.get(def.pieceId)!.push(haloMesh)
    })

    parent.add(instGroup)
  }, [])

  // Inicialización de la escena Three.js
  useEffect(() => {
    const container = mountRef.current
    if (!container) return
    let isDisposed = false

    try {
      const width = container.clientWidth || 400
      const height = container.clientHeight || 400

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0a0f18) // Fondo de estudio oscuro médico
      sceneRef.current = scene

      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50)
      camera.position.set(0, 0, currentDistance.current)
      cameraRef.current = camera

      // Iluminación de estudio
      const ambLight = new THREE.AmbientLight(0xffffff, 1.3)
      scene.add(ambLight)

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.0)
      keyLight.position.set(2, 4, 3)
      scene.add(keyLight)

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2)
      fillLight.position.set(-3, 2, 2)
      scene.add(fillLight)

      const rimLight = new THREE.DirectionalLight(0xffedd5, 1.5)
      rimLight.position.set(0, 3, -3)
      scene.add(rimLight)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      container.appendChild(renderer.domElement)
      rendererRef.current = renderer

      const singleGroup = new THREE.Group()
      const dualGroup = new THREE.Group()
      scene.add(singleGroup)
      scene.add(dualGroup)
      singleGroupRef.current = singleGroup
      dualGroupRef.current = dualGroup

      // Cargar el modelo 3D GLTF oficial
      const loader = new GLTFLoader()
      loader.load(
        "/models/athlete_anatomy.glb",
        gltf => {
          if (isDisposed) return
          setIsLoading(false)

          const baseModel = gltf.scene
          baseModel.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh
              mesh.material = athleteMaterial.current
              mesh.castShadow = true
              mesh.receiveShadow = true
            }
          })

          baseModel.rotation.x = -Math.PI / 2
          baseModel.position.y = 0.05

          // 1. Instancia para Modo 360° Rotatorio Libre
          const singleMesh = baseModel.clone()
          singleGroup.add(singleMesh)
          buildHitboxes(singleGroup, [0, 0, 0], 0)

          // 2. Instancia para Modo Dual (Frontal + Dorsal simultáneos)
          const frontMesh = baseModel.clone()
          frontMesh.position.x = -0.85
          dualGroup.add(frontMesh)
          buildHitboxes(dualGroup, [-0.85, 0, 0], 0)

          const backMesh = baseModel.clone()
          backMesh.position.x = 0.85
          backMesh.rotation.z = Math.PI // dorsal
          dualGroup.add(backMesh)
          buildHitboxes(dualGroup, [0.85, 0, 0], Math.PI)

          // Visibilidad según modo inicial
          if (currentMode === "orbit") {
            singleGroup.visible = true
            dualGroup.visible = false
            targetDistance.current = 3.3
          } else {
            singleGroup.visible = false
            dualGroup.visible = true
            targetDistance.current = 3.8
          }
        },
        undefined,
        err => {
          console.error("Error cargando athlete_anatomy.glb:", err)
          setIsLoading(false)
          onError?.(err as Error)
        }
      )

      // Loop de renderizado y rotación fluida con damping
      const animate = () => {
        reqIdRef.current = requestAnimationFrame(animate)

        currentRotationY.current += (targetRotationY.current - currentRotationY.current) * 0.12
        currentRotationX.current += (targetRotationX.current - currentRotationX.current) * 0.12
        currentDistance.current += (targetDistance.current - currentDistance.current) * 0.12

        if (currentMode === "orbit" && singleGroupRef.current) {
          singleGroupRef.current.rotation.y = currentRotationY.current
          singleGroupRef.current.rotation.x = currentRotationX.current
        }

        if (cameraRef.current) {
          cameraRef.current.position.z = currentDistance.current
        }

        renderer.render(scene, camera)
      }
      animate()

      const handleResize = () => {
        if (!container || !cameraRef.current || !rendererRef.current) return
        const w = container.clientWidth
        const h = container.clientHeight
        cameraRef.current.aspect = w / h
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(w, h)
      }
      window.addEventListener("resize", handleResize)

      return () => {
        isDisposed = true
        window.removeEventListener("resize", handleResize)
        if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current)
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
        renderer.dispose()
      }
    } catch (err: any) {
      console.error("Error en Three.js:", err)
      onError?.(err)
    }
  }, [buildHitboxes, currentMode, onError])

  // Actualizar modo visual
  useEffect(() => {
    if (!singleGroupRef.current || !dualGroupRef.current) return
    if (currentMode === "orbit") {
      singleGroupRef.current.visible = true
      dualGroupRef.current.visible = false
      targetDistance.current = 3.3
    } else {
      singleGroupRef.current.visible = false
      dualGroupRef.current.visible = true
      targetDistance.current = 3.8
    }
  }, [currentMode])

  // Actualizar halos luminosos cuando cambia la selección
  useEffect(() => {
    haloMeshesRef.current.forEach((halos, pieceId) => {
      const piece = MANNEQUIN_PIECES[pieceId]
      if (!piece) return

      const isSelected =
        selectedRegionId === pieceId ||
        (selectedRegionId &&
          piece.region.toLowerCase() === selectedRegionId.toLowerCase() &&
          (!selectedLaterality || piece.laterality === selectedLaterality))

      const isHovered = hoveredPiece?.id === pieceId

      halos.forEach(mesh => {
        if (isSelected) {
          mesh.visible = true
          mesh.material = haloSelectedMat.current
        } else if (isHovered) {
          mesh.visible = true
          mesh.material = haloHoverMat.current
        } else {
          mesh.visible = false
        }
      })
    })
  }, [selectedRegionId, selectedLaterality, hoveredPiece])

  // Raycasting para detectar clics
  const raycast = useCallback((clientX: number, clientY: number): string | null => {
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return null
    const rect = mountRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 2 - 1
    const y = -((clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current)

    const testMeshes: THREE.Mesh[] = []
    hitboxesRef.current.forEach(meshes => {
      meshes.forEach(m => {
        if (m.parent?.parent?.visible) testMeshes.push(m)
      })
    })

    const intersects = raycaster.intersectObjects(testMeshes, false)
    if (intersects.length > 0) {
      return intersects[0].object.userData.pieceId || null
    }
    return null
  }, [])

  // Eventos de ratón
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    moved.current = false
    prevPointer.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current && currentMode === "orbit") {
      const dx = e.clientX - prevPointer.current.x
      const dy = e.clientY - prevPointer.current.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true
      targetRotationY.current += dx * 0.015
      targetRotationX.current = Math.max(-0.5, Math.min(0.5, targetRotationX.current + dy * 0.01))
      prevPointer.current = { x: e.clientX, y: e.clientY }
    } else {
      const hitId = raycast(e.clientX, e.clientY)
      if (hitId && MANNEQUIN_PIECES[hitId]) {
        setHoveredPiece(MANNEQUIN_PIECES[hitId])
      } else {
        setHoveredPiece(null)
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!moved.current) {
      const hitId = raycast(e.clientX, e.clientY)
      if (hitId && MANNEQUIN_PIECES[hitId]) {
        setSelectedPieceData(MANNEQUIN_PIECES[hitId])
        setIsBannerDismissed(false)
        onSelectPiece(MANNEQUIN_PIECES[hitId])
      }
    }
    isDragging.current = false
  }

  // Eventos táctiles móviles
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true
      moved.current = false
      prevPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchStartDist.current = Math.sqrt(dx * dx + dy * dy)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current && currentMode === "orbit") {
      const dx = e.touches[0].clientX - prevPointer.current.x
      const dy = e.touches[0].clientY - prevPointer.current.y
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true
      targetRotationY.current += dx * 0.018
      targetRotationX.current = Math.max(-0.5, Math.min(0.5, targetRotationX.current + dy * 0.01))
      prevPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const diff = (dist - touchStartDist.current) * 0.01
      targetDistance.current = Math.max(2.2, Math.min(5.2, targetDistance.current - diff))
      touchStartDist.current = dist
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!moved.current && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0]
      const hitId = raycast(touch.clientX, touch.clientY)
      if (hitId && MANNEQUIN_PIECES[hitId]) {
        setSelectedPieceData(MANNEQUIN_PIECES[hitId])
        setIsBannerDismissed(false)
        onSelectPiece(MANNEQUIN_PIECES[hitId])
      }
    }
    isDragging.current = false
  }

  // Preajustes de rotación
  const setCameraAngle = (angle: "front" | "back" | "left" | "right" | "reset") => {
    targetRotationX.current = 0
    if (angle === "front") targetRotationY.current = 0
    else if (angle === "back") targetRotationY.current = Math.PI
    else if (angle === "left") targetRotationY.current = Math.PI * 0.5
    else if (angle === "right") targetRotationY.current = -Math.PI * 0.5
    else if (angle === "reset") {
      targetRotationY.current = 0
      targetDistance.current = currentMode === "orbit" ? 3.3 : 3.8
    }
  }

  const currentDisplay = selectedPieceData || (selectedRegionId ? Object.values(MANNEQUIN_PIECES).find(p => p.id === selectedRegionId) : null)

  return (
    <div className="flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative select-none">
      {/* Barra superior de controles del visor 3D */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs text-white z-10">
        <div className="flex items-center gap-1.5">
          <div className="inline-flex p-0.5 bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setCurrentMode("orbit")
                setCameraAngle("reset")
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                currentMode === "orbit"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Gira el avatar libremente en 360°"
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>3D Giratorio</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentMode("dual")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                currentMode === "dual"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Vista dual simultánea (Frente y Espalda)"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Dual</span>
            </button>
          </div>
        </div>

        {/* Botones de rotación instantánea */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCameraAngle("front")}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer"
          >
            Frontal
          </button>
          <button
            type="button"
            onClick={() => setCameraAngle("back")}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer"
          >
            Dorsal
          </button>
          <button
            type="button"
            onClick={() => setCameraAngle("left")}
            className="hidden sm:inline px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer"
          >
            Lat. Izq
          </button>
          <button
            type="button"
            onClick={() => setCameraAngle("right")}
            className="hidden sm:inline px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer"
          >
            Lat. Der
          </button>
          <button
            type="button"
            onClick={() => setCameraAngle("reset")}
            className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
            title="Restablecer vista"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* BANNER SUPERIOR INFORMATIVO NO INVASIVO (CON BOTÓN DE CIERRE [X]) */}
      {currentDisplay && !isBannerDismissed && (
        <div className="bg-slate-900/95 border-b border-red-500/40 px-3.5 py-1.5 flex items-center justify-between text-xs text-white animate-in fade-in slide-in-from-top-2 duration-150 z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="text-[11px] text-slate-300">
              Zona seleccionada: <strong className="text-white font-bold">{currentDisplay.displayName}</strong>
              <span className="ml-2 text-red-400 font-semibold text-[10px]">
                ({currentDisplay.laterality.toUpperCase()})
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsBannerDismissed(true)}
            className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            title="Ocultar esta etiqueta para ver el avatar despejado"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Escenario 3D Interactivo WebGL con Three.js */}
      <div
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-80 sm:h-[400px] cursor-grab active:cursor-grabbing relative overflow-hidden bg-radial from-[#131d2e] via-[#0b101b] to-[#06080e]"
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30">
            <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-slate-300">Cargando modelo 3D...</span>
          </div>
        )}

        {/* Indicador de estructura al pasar el ratón (flotante sutil no bloqueante) */}
        {hoveredPiece && (
          <div className="absolute bottom-11 left-3 pointer-events-none bg-slate-900/90 border border-sky-400/50 text-white px-2.5 py-1 rounded-lg text-xs z-20">
            <span className="text-[10px] text-sky-300 font-semibold block">Apuntando:</span>
            <span className="font-bold">{hoveredPiece.displayName}</span>
          </div>
        )}

        {/* Guía inferior con iconos */}
        <div className="absolute bottom-2 inset-x-3 flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/75 backdrop-blur-xs px-3 py-1 rounded-lg border border-slate-800/80 pointer-events-none z-20">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-slate-300" />
              <span>Arrastra para girar 360°</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-red-400" />
              <span>Haz clic en un músculo para seleccionarlo</span>
            </span>
          </div>

          {/* Controles de Zoom */}
          <div className="flex items-center gap-1 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                targetDistance.current = Math.max(2.2, targetDistance.current - 0.4)
              }}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Acercar zoom"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                targetDistance.current = Math.min(5.2, targetDistance.current + 0.4)
              }}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Alejar zoom"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
