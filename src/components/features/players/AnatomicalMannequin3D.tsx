"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import {
  RotateCcw,
  Eye,
  ZoomIn,
  ZoomOut,
  Columns2,
  Orbit,
  Check,
  Bug
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
  displayMode?: "dual" | "orbit"
  onSelectPiece: (piece: AnatomicalPieceData) => void
  onError?: (err: Error) => void
}

// Catálogo estructurado de hitboxes y piezas anatómicas
export const MANNEQUIN_PIECES: Record<string, AnatomicalPieceData> = {
  // Cabeza y Cuello
  cabeza: {
    id: "cabeza",
    region: "Cabeza",
    laterality: "central",
    structures: ["Cabeza", "Cráneo", "Cara", "Mandíbula"],
    defaultStructure: "Cabeza",
    displayName: "Cabeza / Cráneo",
    viewSide: "both"
  },
  cuello: {
    id: "cuello",
    region: "Cuello",
    laterality: "central",
    structures: ["Cuello", "Musculatura cervical"],
    defaultStructure: "Cuello",
    displayName: "Cuello / Región cervical",
    viewSide: "both"
  },

  // Tronco Anterior
  pecho: {
    id: "pecho",
    region: "Tronco",
    laterality: "central",
    structures: ["Pecho", "Pectoral mayor", "Clavícula", "Esternón"],
    defaultStructure: "Pecho",
    displayName: "Pectorales / Clavícula",
    viewSide: "front"
  },
  abdomen: {
    id: "abdomen",
    region: "Tronco",
    laterality: "central",
    structures: ["Abdomen", "Recto abdominal", "Oblicuos", "Serrato anterior"],
    defaultStructure: "Abdomen",
    displayName: "Abdomen / Recto y Oblicuos",
    viewSide: "front"
  },

  // Tronco Posterior
  espalda: {
    id: "espalda",
    region: "Tronco",
    laterality: "central",
    structures: ["Espalda", "Trapecio", "Dorsal ancho", "Romboides"],
    defaultStructure: "Espalda",
    displayName: "Espalda dorsal / Trapecio",
    viewSide: "back"
  },
  lumbar: {
    id: "lumbar",
    region: "Tronco",
    laterality: "central",
    structures: ["Zona lumbar", "Erectores espinales"],
    defaultStructure: "Zona lumbar",
    displayName: "Zona lumbar / Erectores espinales",
    viewSide: "back"
  },

  // Pelvis / Cadera
  cadera_izq: {
    id: "cadera_izq",
    region: "Cadera / Pelvis",
    laterality: "izquierda",
    structures: ["Cadera", "Glúteo medio", "Ingle", "Aductores"],
    defaultStructure: "Cadera",
    displayName: "Cadera / Ingle izquierda",
    viewSide: "both"
  },
  cadera_der: {
    id: "cadera_der",
    region: "Cadera / Pelvis",
    laterality: "derecha",
    structures: ["Cadera", "Glúteo medio", "Ingle", "Aductores"],
    defaultStructure: "Cadera",
    displayName: "Cadera / Ingle derecha",
    viewSide: "both"
  },

  // Glúteos (Dorsal)
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

  // Miembros Superiores - Izquierdo
  hombro_izq: {
    id: "hombro_izq",
    region: "Hombro",
    laterality: "izquierda",
    structures: ["Hombro", "Deltoides", "Articulación acromioclavicular"],
    defaultStructure: "Hombro",
    displayName: "Hombro izquierdo (Deltoides)",
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
  codo_izq: {
    id: "codo_izq",
    region: "Codo",
    laterality: "izquierda",
    structures: ["Codo", "Epicóndilo", "Articulación"],
    defaultStructure: "Codo",
    displayName: "Codo izquierdo",
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
  muneca_izq: {
    id: "muneca_izq",
    region: "Muñeca",
    laterality: "izquierda",
    structures: ["Muñeca", "Escafoides"],
    defaultStructure: "Muñeca",
    displayName: "Muñeca izquierda",
    viewSide: "both"
  },
  mano_izq: {
    id: "mano_izq",
    region: "Mano",
    laterality: "izquierda",
    structures: ["Mano", "Metacarpos", "Dedos"],
    defaultStructure: "Mano",
    displayName: "Mano y dedos izquierdos",
    viewSide: "both"
  },

  // Miembros Superiores - Derecho
  hombro_der: {
    id: "hombro_der",
    region: "Hombro",
    laterality: "derecha",
    structures: ["Hombro", "Deltoides", "Articulación acromioclavicular"],
    defaultStructure: "Hombro",
    displayName: "Hombro derecho (Deltoides)",
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
  codo_der: {
    id: "codo_der",
    region: "Codo",
    laterality: "derecha",
    structures: ["Codo", "Epicóndilo", "Articulación"],
    defaultStructure: "Codo",
    displayName: "Codo derecho",
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
  muneca_der: {
    id: "muneca_der",
    region: "Muñeca",
    laterality: "derecha",
    structures: ["Muñeca", "Escafoides"],
    defaultStructure: "Muñeca",
    displayName: "Muñeca derecha",
    viewSide: "both"
  },
  mano_der: {
    id: "mano_der",
    region: "Mano",
    laterality: "derecha",
    structures: ["Mano", "Metacarpos", "Dedos"],
    defaultStructure: "Mano",
    displayName: "Mano y dedos derechos",
    viewSide: "both"
  },

  // Miembros Inferiores - Izquierdo
  muslo_ant_izq: {
    id: "muslo_ant_izq",
    region: "Muslo anterior",
    laterality: "izquierda",
    structures: ["Cuádriceps", "Recto femoral", "Vasto interno", "Vasto externo"],
    defaultStructure: "Cuádriceps",
    displayName: "Cuádriceps izquierdo (Muslo anterior)",
    viewSide: "front"
  },
  muslo_post_izq: {
    id: "muslo_post_izq",
    region: "Muslo posterior",
    laterality: "izquierda",
    structures: ["Isquiotibiales", "Bíceps femoral", "Semitendinoso", "Semimembranoso"],
    defaultStructure: "Isquiotibiales",
    displayName: "Isquiotibiales izquierdos (Muslo posterior)",
    viewSide: "back"
  },
  rodilla_izq: {
    id: "rodilla_izq",
    region: "Rodilla",
    laterality: "izquierda",
    structures: ["Rodilla", "Rótula", "Tendón rotuliano"],
    defaultStructure: "Rodilla",
    displayName: "Rodilla izquierda",
    viewSide: "both"
  },
  pierna_izq_ant: {
    id: "pierna_izq_ant",
    region: "Pierna",
    laterality: "izquierda",
    structures: ["Tibial anterior"],
    defaultStructure: "Tibial anterior",
    displayName: "Tibial anterior izquierdo",
    viewSide: "front"
  },
  pierna_izq_post: {
    id: "pierna_izq_post",
    region: "Pierna",
    laterality: "izquierda",
    structures: ["Gemelo", "Gastrocnemio medial", "Gastrocnemio lateral", "Sóleo"],
    defaultStructure: "Gemelo",
    displayName: "Gemelo y sóleo izquierdo",
    viewSide: "back"
  },
  tobillo_izq: {
    id: "tobillo_izq",
    region: "Tobillo",
    laterality: "izquierda",
    structures: ["Tobillo interno", "Tobillo externo", "Tendón de Aquiles"],
    defaultStructure: "Tobillo externo",
    displayName: "Tobillo izquierdo / Aquiles",
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

  // Miembros Inferiores - Derecho
  muslo_ant_der: {
    id: "muslo_ant_der",
    region: "Muslo anterior",
    laterality: "derecha",
    structures: ["Cuádriceps", "Recto femoral", "Vasto interno", "Vasto externo"],
    defaultStructure: "Cuádriceps",
    displayName: "Cuádriceps derecho (Muslo anterior)",
    viewSide: "front"
  },
  muslo_post_der: {
    id: "muslo_post_der",
    region: "Muslo posterior",
    laterality: "derecha",
    structures: ["Isquiotibiales", "Bíceps femoral", "Semitendinoso", "Semimembranoso"],
    defaultStructure: "Isquiotibiales",
    displayName: "Isquiotibiales derechos (Muslo posterior)",
    viewSide: "back"
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
  pierna_der_ant: {
    id: "pierna_der_ant",
    region: "Pierna",
    laterality: "derecha",
    structures: ["Tibial anterior"],
    defaultStructure: "Tibial anterior",
    displayName: "Tibial anterior derecho",
    viewSide: "front"
  },
  pierna_der_post: {
    id: "pierna_der_post",
    region: "Pierna",
    laterality: "derecha",
    structures: ["Gemelo", "Gastrocnemio medial", "Gastrocnemio lateral", "Sóleo"],
    defaultStructure: "Gemelo",
    displayName: "Gemelo y sóleo derecho",
    viewSide: "back"
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

// Configuración espacial de hitboxes anatómicos (posiciones normalizadas al modelo anatómico)
interface HitboxDef {
  pieceId: string
  pos: [number, number, number]
  size: [number, number, number]
  viewSide: "front" | "back" | "both"
}

const ANATOMICAL_HITBOXES: HitboxDef[] = [
  // Cabeza y Cuello
  { pieceId: "cabeza", pos: [0, 0.90, 0], size: [0.34, 0.32, 0.32], viewSide: "both" },
  { pieceId: "cuello", pos: [0, 0.72, 0], size: [0.22, 0.15, 0.22], viewSide: "both" },

  // Tronco
  { pieceId: "pecho", pos: [0, 0.52, 0.08], size: [0.54, 0.26, 0.18], viewSide: "front" },
  { pieceId: "abdomen", pos: [0, 0.28, 0.07], size: [0.44, 0.24, 0.16], viewSide: "front" },
  { pieceId: "espalda", pos: [0, 0.52, -0.08], size: [0.54, 0.26, 0.18], viewSide: "back" },
  { pieceId: "lumbar", pos: [0, 0.28, -0.07], size: [0.44, 0.24, 0.16], viewSide: "back" },

  // Pelvis / Glúteos
  { pieceId: "cadera_izq", pos: [-0.16, 0.06, 0.05], size: [0.26, 0.20, 0.20], viewSide: "front" },
  { pieceId: "cadera_der", pos: [0.16, 0.06, 0.05], size: [0.26, 0.20, 0.20], viewSide: "front" },
  { pieceId: "gluteo_izq", pos: [-0.16, 0.06, -0.07], size: [0.26, 0.22, 0.20], viewSide: "back" },
  { pieceId: "gluteo_der", pos: [0.16, 0.06, -0.07], size: [0.26, 0.22, 0.20], viewSide: "back" },

  // Miembros Superiores - Izquierdo
  { pieceId: "hombro_izq", pos: [-0.40, 0.60, 0], size: [0.24, 0.22, 0.22], viewSide: "both" },
  { pieceId: "brazo_izq", pos: [-0.50, 0.38, 0], size: [0.20, 0.26, 0.20], viewSide: "both" },
  { pieceId: "codo_izq", pos: [-0.60, 0.20, 0], size: [0.18, 0.16, 0.18], viewSide: "both" },
  { pieceId: "antebrazo_izq", pos: [-0.68, 0.04, 0], size: [0.18, 0.24, 0.18], viewSide: "both" },
  { pieceId: "muneca_izq", pos: [-0.76, -0.12, 0], size: [0.16, 0.12, 0.16], viewSide: "both" },
  { pieceId: "mano_izq", pos: [-0.82, -0.26, 0], size: [0.18, 0.18, 0.14], viewSide: "both" },

  // Miembros Superiores - Derecho
  { pieceId: "hombro_der", pos: [0.40, 0.60, 0], size: [0.24, 0.22, 0.22], viewSide: "both" },
  { pieceId: "brazo_der", pos: [0.50, 0.38, 0], size: [0.20, 0.26, 0.20], viewSide: "both" },
  { pieceId: "codo_der", pos: [0.60, 0.20, 0], size: [0.18, 0.16, 0.18], viewSide: "both" },
  { pieceId: "antebrazo_der", pos: [0.68, 0.04, 0], size: [0.18, 0.24, 0.18], viewSide: "both" },
  { pieceId: "muneca_der", pos: [0.76, -0.12, 0], size: [0.16, 0.12, 0.16], viewSide: "both" },
  { pieceId: "mano_der", pos: [0.82, -0.26, 0], size: [0.18, 0.18, 0.14], viewSide: "both" },

  // Miembros Inferiores - Izquierdo
  { pieceId: "muslo_ant_izq", pos: [-0.18, -0.20, 0.07], size: [0.24, 0.34, 0.18], viewSide: "front" },
  { pieceId: "muslo_post_izq", pos: [-0.18, -0.20, -0.07], size: [0.24, 0.34, 0.18], viewSide: "back" },
  { pieceId: "rodilla_izq", pos: [-0.18, -0.44, 0.03], size: [0.22, 0.16, 0.20], viewSide: "both" },
  { pieceId: "pierna_izq_ant", pos: [-0.19, -0.66, 0.06], size: [0.20, 0.30, 0.16], viewSide: "front" },
  { pieceId: "pierna_izq_post", pos: [-0.19, -0.66, -0.06], size: [0.20, 0.30, 0.16], viewSide: "back" },
  { pieceId: "tobillo_izq", pos: [-0.19, -0.86, 0], size: [0.18, 0.14, 0.18], viewSide: "both" },
  { pieceId: "pie_izq", pos: [-0.19, -0.98, 0.05], size: [0.18, 0.12, 0.28], viewSide: "both" },

  // Miembros Inferiores - Derecho
  { pieceId: "muslo_ant_der", pos: [0.18, -0.20, 0.07], size: [0.24, 0.34, 0.18], viewSide: "front" },
  { pieceId: "muslo_post_der", pos: [0.18, -0.20, -0.07], size: [0.24, 0.34, 0.18], viewSide: "back" },
  { pieceId: "rodilla_der", pos: [0.18, -0.44, 0.03], size: [0.22, 0.16, 0.20], viewSide: "both" },
  { pieceId: "pierna_der_ant", pos: [0.19, -0.66, 0.06], size: [0.20, 0.30, 0.16], viewSide: "front" },
  { pieceId: "pierna_der_post", pos: [0.19, -0.66, -0.06], size: [0.20, 0.30, 0.16], viewSide: "back" },
  { pieceId: "tobillo_der", pos: [0.19, -0.86, 0], size: [0.18, 0.14, 0.18], viewSide: "both" },
  { pieceId: "pie_der", pos: [0.19, -0.98, 0.05], size: [0.18, 0.12, 0.28], viewSide: "both" }
]

export function AnatomicalMannequin3D({
  selectedRegionId,
  selectedLaterality,
  displayMode = "dual",
  onSelectPiece,
  onError
}: AnatomicalMannequin3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [hoveredPiece, setHoveredPiece] = useState<AnatomicalPieceData | null>(null)
  const [currentMode, setCurrentMode] = useState<"dual" | "orbit">(displayMode)
  const [activeViewLabel, setActiveViewLabel] = useState<string>("Dual (Frontal + Posterior)")
  const [showDebug, setShowDebug] = useState<boolean>(false)
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true)

  // Referencias Three.js
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const reqIdRef = useRef<number | null>(null)

  // Grupos de modelos
  const dualGroupRef = useRef<THREE.Group | null>(null)
  const singleGroupRef = useRef<THREE.Group | null>(null)
  const hitboxesGroupRef = useRef<THREE.Group | null>(null)
  const debugGroupRef = useRef<THREE.Group | null>(null)

  // Mapeo de hitboxes interactivos y halos
  const hitboxMeshesRef = useRef<Map<string, THREE.Mesh[]>>(new Map())
  const haloMeshesRef = useRef<Map<string, THREE.Mesh[]>>(new Map())

  // Controles orbitales y de cámara
  const targetRotationY = useRef<number>(0)
  const currentRotationY = useRef<number>(0)
  const targetRotationX = useRef<number>(0)
  const currentRotationX = useRef<number>(0)
  const targetDistance = useRef<number>(3.6)
  const currentDistance = useRef<number>(3.6)

  const isDragging = useRef<boolean>(false)
  const previousPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const hasMovedSignificantly = useRef<boolean>(false)
  const touchStartDist = useRef<number>(0)

  // Materiales de estudio atlético
  const mannequinMaterial = useRef(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b, // slate-800
      roughness: 0.45,
      metalness: 0.25
    })
  )

  const haloSelectedMaterial = useRef(
    new THREE.MeshStandardMaterial({
      color: 0xef4444, // red-500
      emissive: 0xdc2626,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2
    })
  )

  const haloHoverMaterial = useRef(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // sky-400
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.45,
      roughness: 0.2
    })
  )

  // Generador de hitboxes y halos
  const buildHitboxesForInstance = useCallback(
    (parentGroup: THREE.Group, offset: [number, number, number], instanceRotationY: number, instanceTag: "front" | "back" | "single") => {
      const instanceContainer = new THREE.Group()
      instanceContainer.position.set(...offset)
      instanceContainer.rotation.y = instanceRotationY

      ANATOMICAL_HITBOXES.forEach(def => {
        // En vista dual frontal, priorizar hitboxes frontales; en posterior, dorsales
        if (instanceTag === "front" && def.viewSide === "back") return
        if (instanceTag === "back" && def.viewSide === "front") return

        // 1. Hitbox invisible de interacción
        const hitboxGeo = new THREE.BoxGeometry(...def.size)
        const hitboxMat = new THREE.MeshBasicMaterial({
          visible: false,
          wireframe: true
        })
        const hitboxMesh = new THREE.Mesh(hitboxGeo, hitboxMat)
        hitboxMesh.position.set(...def.pos)
        hitboxMesh.userData = { pieceId: def.pieceId, instanceTag }
        instanceContainer.add(hitboxMesh)

        // 2. Mesh visual de Halo/Glow que se ilumina al seleccionar
        const haloGeo = new THREE.BoxGeometry(def.size[0] * 1.05, def.size[1] * 1.05, def.size[2] * 1.05)
        const haloMesh = new THREE.Mesh(haloGeo, haloSelectedMaterial.current)
        haloMesh.position.set(...def.pos)
        haloMesh.visible = false
        instanceContainer.add(haloMesh)

        // Registrar en los mapas
        if (!hitboxMeshesRef.current.has(def.pieceId)) {
          hitboxMeshesRef.current.set(def.pieceId, [])
        }
        hitboxMeshesRef.current.get(def.pieceId)!.push(hitboxMesh)

        if (!haloMeshesRef.current.has(def.pieceId)) {
          haloMeshesRef.current.set(def.pieceId, [])
        }
        haloMeshesRef.current.get(def.pieceId)!.push(haloMesh)
      })

      parentGroup.add(instanceContainer)
    },
    []
  )

  // Inicialización de Three.js y carga del modelo GLTF
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    let isDisposed = false

    try {
      // 1. Escena
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0f172a) // slate-900 oscuro premium
      sceneRef.current = scene

      // 2. Cámara
      const width = container.clientWidth || 420
      const height = container.clientHeight || 420
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50)
      camera.position.set(0, 0, currentDistance.current)
      cameraRef.current = camera

      // 3. Iluminación tipo estudio para medicina deportiva
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
      scene.add(ambientLight)

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
      keyLight.position.set(2.5, 4, 3)
      scene.add(keyLight)

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.0) // tinte cyan atlético
      fillLight.position.set(-3, 2, 2)
      scene.add(fillLight)

      const rimLight = new THREE.DirectionalLight(0xffedd5, 1.4) // rim light cálido posterior
      rimLight.position.set(0, 3, -3)
      scene.add(rimLight)

      // 4. Renderer WebGL
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: false
      })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap

      container.appendChild(renderer.domElement)
      rendererRef.current = renderer

      // 5. Grupos de escena
      const dualGroup = new THREE.Group()
      const singleGroup = new THREE.Group()
      const hitboxesGroup = new THREE.Group()

      scene.add(dualGroup)
      scene.add(singleGroup)
      scene.add(hitboxesGroup)

      dualGroupRef.current = dualGroup
      singleGroupRef.current = singleGroup
      hitboxesGroupRef.current = hitboxesGroup

      // 6. Carga del modelo GLTF oficial desde public/models/athlete_anatomy.glb
      const loader = new GLTFLoader()
      loader.load(
        "/models/athlete_anatomy.glb",
        gltf => {
          if (isDisposed) return
          setIsLoadingModel(false)

          const baseModel = gltf.scene

          // Configurar materiales en el modelo
          baseModel.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh
              mesh.material = mannequinMaterial.current
              mesh.castShadow = true
              mesh.receiveShadow = true
            }
          })

          // Corregir orientación nativa del modelo a escala erguida
          baseModel.rotation.x = -Math.PI / 2
          baseModel.position.y = 0.05

          // INSTANCIA 1 (Modo 360° Único)
          const singleModel = baseModel.clone()
          singleGroup.add(singleModel)
          buildHitboxesForInstance(singleGroup, [0, 0, 0], 0, "single")

          // INSTANCIA DUAL 1: Frontal (x = -0.9)
          const dualFrontModel = baseModel.clone()
          dualFrontModel.position.x = -0.9
          dualFrontModel.rotation.z = 0 // rotación Y en espacio 3D
          dualGroup.add(dualFrontModel)
          buildHitboxesForInstance(dualGroup, [-0.9, 0, 0], 0, "front")

          // INSTANCIA DUAL 2: Posterior (x = 0.9, rotado 180° dorsal)
          const dualBackModel = baseModel.clone()
          dualBackModel.position.x = 0.9
          dualBackModel.rotation.z = Math.PI // volteado dorsalmente
          dualGroup.add(dualBackModel)
          buildHitboxesForInstance(dualGroup, [0.9, 0, 0], Math.PI, "back")

          // Podio / suelo estilizado
          const podiumMat = new THREE.MeshStandardMaterial({
            color: 0x090d16,
            roughness: 0.8
          })
          const podiumFront = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.04, 32), podiumMat)
          podiumFront.position.set(-0.9, -1.05, 0)
          dualGroup.add(podiumFront)

          const podiumBack = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.04, 32), podiumMat)
          podiumBack.position.set(0.9, -1.05, 0)
          dualGroup.add(podiumBack)

          const podiumSingle = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.04, 32), podiumMat)
          podiumSingle.position.set(0, -1.05, 0)
          singleGroup.add(podiumSingle)

          // Visibilidad inicial según modo
          if (currentMode === "dual") {
            dualGroup.visible = true
            singleGroup.visible = false
            camera.position.set(0, 0, 3.8)
          } else {
            dualGroup.visible = false
            singleGroup.visible = true
            camera.position.set(0, 0, 3.4)
          }
        },
        undefined,
        err => {
          console.error("Error al cargar athlete_anatomy.glb:", err)
          setIsLoadingModel(false)
          if (onError) onError(err as Error)
        }
      )

      // 7. Loop de animación con amortiguación
      const animate = () => {
        reqIdRef.current = requestAnimationFrame(animate)

        currentRotationY.current += (targetRotationY.current - currentRotationY.current) * 0.1
        currentRotationX.current += (targetRotationX.current - currentRotationX.current) * 0.1
        currentDistance.current += (targetDistance.current - currentDistance.current) * 0.1

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

      // 8. Resize
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
      if (onError) onError(err)
    }
  }, [buildHitboxesForInstance, currentMode, onError])

  // Actualiza la visibilidad de los grupos según el modo activo
  useEffect(() => {
    if (!dualGroupRef.current || !singleGroupRef.current || !cameraRef.current) return
    if (currentMode === "dual") {
      dualGroupRef.current.visible = true
      singleGroupRef.current.visible = false
      targetDistance.current = 3.8
      setActiveViewLabel("Dual (Frontal + Posterior)")
    } else {
      dualGroupRef.current.visible = false
      singleGroupRef.current.visible = true
      targetDistance.current = 3.4
      setActiveViewLabel("Visor 360° Libre")
    }
  }, [currentMode])

  // Actualización de Halos luminosos según la zona seleccionada
  useEffect(() => {
    haloMeshesRef.current.forEach((haloMeshes, pieceId) => {
      const pieceData = MANNEQUIN_PIECES[pieceId]
      if (!pieceData) return

      const isSelected =
        selectedRegionId === pieceId ||
        (selectedRegionId &&
          pieceData.region.toLowerCase() === selectedRegionId.toLowerCase() &&
          (!selectedLaterality || pieceData.laterality === selectedLaterality))

      const isHovered = hoveredPiece?.id === pieceId

      haloMeshes.forEach(mesh => {
        if (isSelected) {
          mesh.visible = true
          mesh.material = haloSelectedMaterial.current
        } else if (isHovered) {
          mesh.visible = true
          mesh.material = haloHoverMaterial.current
        } else {
          mesh.visible = showDebug // Visible como caja si está en modo depuración
          if (showDebug) {
            mesh.material = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x38bdf8 })
          }
        }
      })
    })
  }, [selectedRegionId, selectedLaterality, hoveredPiece, showDebug])

  // Raycasting para detectar el hitbox clickeado o tocado
  const raycastHitbox = useCallback((clientX: number, clientY: number): string | null => {
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return null
    const rect = mountRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 2 - 1
    const y = -((clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current)

    // Intersectar solo con los hitboxes activos en el modo actual
    const activeMeshes: THREE.Mesh[] = []
    hitboxMeshesRef.current.forEach(meshes => {
      meshes.forEach(m => {
        if (m.parent?.parent?.visible) {
          activeMeshes.push(m)
        }
      })
    })

    const intersects = raycaster.intersectObjects(activeMeshes, false)
    if (intersects.length > 0) {
      return intersects[0].object.userData.pieceId || null
    }
    return null
  }, [])

  // Controladores de eventos de ratón
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    hasMovedSignificantly.current = false
    previousPointer.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current && currentMode === "orbit") {
      const deltaX = e.clientX - previousPointer.current.x
      const deltaY = e.clientY - previousPointer.current.y
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMovedSignificantly.current = true
      }
      targetRotationY.current += deltaX * 0.012
      targetRotationX.current = Math.max(-0.4, Math.min(0.4, targetRotationX.current + deltaY * 0.008))
      previousPointer.current = { x: e.clientX, y: e.clientY }
    } else {
      const pieceId = raycastHitbox(e.clientX, e.clientY)
      if (pieceId && MANNEQUIN_PIECES[pieceId]) {
        setHoveredPiece(MANNEQUIN_PIECES[pieceId])
      } else {
        setHoveredPiece(null)
      }
    }
  }

  const handleMouseUp = () => {
    if (!hasMovedSignificantly.current && previousPointer.current) {
      const pieceId = raycastHitbox(previousPointer.current.x, previousPointer.current.y)
      if (pieceId && MANNEQUIN_PIECES[pieceId]) {
        onSelectPiece(MANNEQUIN_PIECES[pieceId])
      }
    }
    isDragging.current = false
  }

  // Controladores táctiles móviles
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true
      hasMovedSignificantly.current = false
      previousPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchStartDist.current = Math.sqrt(dx * dx + dy * dy)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current && currentMode === "orbit") {
      const deltaX = e.touches[0].clientX - previousPointer.current.x
      const deltaY = e.touches[0].clientY - previousPointer.current.y
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        hasMovedSignificantly.current = true
      }
      targetRotationY.current += deltaX * 0.014
      targetRotationX.current = Math.max(-0.4, Math.min(0.4, targetRotationX.current + deltaY * 0.008))
      previousPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const diff = (dist - touchStartDist.current) * 0.01
      targetDistance.current = Math.max(2.6, Math.min(5.5, targetDistance.current - diff))
      touchStartDist.current = dist
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!hasMovedSignificantly.current && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0]
      const pieceId = raycastHitbox(touch.clientX, touch.clientY)
      if (pieceId && MANNEQUIN_PIECES[pieceId]) {
        onSelectPiece(MANNEQUIN_PIECES[pieceId])
      }
    }
    isDragging.current = false
  }

  // Zoom con rueda del ratón
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomDelta = e.deltaY * 0.002
    targetDistance.current = Math.max(2.6, Math.min(5.5, targetDistance.current + zoomDelta))
  }

  // Posiciones de cámara predefinidas
  const setPresetView = (view: "front" | "back" | "left" | "right" | "reset") => {
    targetRotationX.current = 0
    if (view === "front") targetRotationY.current = 0
    else if (view === "back") targetRotationY.current = Math.PI
    else if (view === "left") targetRotationY.current = Math.PI * 0.5
    else if (view === "right") targetRotationY.current = -Math.PI * 0.5
    else if (view === "reset") {
      targetRotationY.current = 0
      targetDistance.current = currentMode === "dual" ? 3.8 : 3.4
    }
  }

  return (
    <div className="flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative select-none">
      {/* Barra superior de controles del visor */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs text-white z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-black tracking-wide text-[11px] uppercase text-slate-300">
            Avatar 3D: <strong className="text-white">{activeViewLabel}</strong>
          </span>
        </div>

        {/* Conmutador de Modo: Dual vs 360° */}
        <div className="flex items-center gap-1">
          <div className="inline-flex p-0.5 bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setCurrentMode("dual")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                currentMode === "dual"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Vista Dual simultánea (Frontal y Posterior)"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Dual</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentMode("orbit")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                currentMode === "orbit"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Visor 360° con rotación libre"
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>360°</span>
            </button>
          </div>

          {/* Botones de cámara en modo 360° */}
          {currentMode === "orbit" && (
            <div className="hidden sm:flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => setPresetView("front")}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-semibold text-slate-300"
              >
                Frontal
              </button>
              <button
                type="button"
                onClick={() => setPresetView("back")}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-semibold text-slate-300"
              >
                Dorsal
              </button>
              <button
                type="button"
                onClick={() => setPresetView("reset")}
                className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                title="Restablecer vista"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Botón de depuración anatómica (solo en entorno de desarrollo) */}
          {process.env.NODE_ENV === "development" && (
            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className={`p-1 rounded text-[11px] transition-colors ml-1 ${
                showDebug ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
              title="Debug Anatomy: Ver hitboxes"
            >
              <Bug className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contenedor del Canvas WebGL Three.js */}
      <div
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="w-full h-80 sm:h-96 cursor-grab active:cursor-grabbing relative overflow-hidden bg-radial from-slate-900 to-slate-950"
      >
        {/* Loading Spinner */}
        {isLoadingModel && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-slate-300">Cargando modelo anatómico 3D...</span>
          </div>
        )}

        {/* Indicadores de etiqueta en modo Dual */}
        {currentMode === "dual" && (
          <div className="absolute top-2 inset-x-0 flex justify-around px-8 pointer-events-none text-[11px] font-black uppercase text-slate-500 tracking-wider">
            <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">Vista Anterior (Frontal)</span>
            <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">Vista Posterior (Dorsal)</span>
          </div>
        )}

        {/* Tooltip flotante de la estructura apuntada */}
        {hoveredPiece && (
          <div className="absolute bottom-10 left-3 pointer-events-none bg-slate-900/95 backdrop-blur-xs border border-sky-500/60 text-white px-3 py-1.5 rounded-xl shadow-2xl text-xs z-20 animate-in fade-in zoom-in-95 duration-100">
            <span className="text-[10px] uppercase font-bold text-sky-400 block">Zona detectada:</span>
            <span className="font-bold">{hoveredPiece.displayName}</span>
          </div>
        )}

        {/* Guía de ayuda interactiva */}
        <div className="absolute bottom-2.5 left-3 pointer-events-none text-[10px] text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-md backdrop-blur-xs flex items-center gap-1.5 z-20">
          <Eye className="w-3 h-3 text-slate-300" />
          <span>
            {currentMode === "dual"
              ? "Toca directamente sobre la zona frontal o posterior"
              : "Arrastra para rotar 360° • Toca para seleccionar zona"}
          </span>
        </div>

        {/* Controles de Zoom */}
        <div className="absolute bottom-2.5 right-3 flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 z-20">
          <button
            type="button"
            onClick={() => {
              targetDistance.current = Math.max(2.6, targetDistance.current - 0.5)
            }}
            className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Acercar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              targetDistance.current = Math.min(5.5, targetDistance.current + 0.5)
            }}
            className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Alejar zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
