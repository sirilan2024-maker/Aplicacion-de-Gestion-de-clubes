"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import {
  RotateCcw,
  Eye,
  ZoomIn,
  ZoomOut
} from "lucide-react"

export type LateralityType = "izquierda" | "derecha" | "bilateral" | "central" | "no_aplica"

export interface AnatomicalPieceData {
  id: string
  region: string
  laterality: LateralityType
  structures: string[]
  defaultStructure: string
  displayName: string
}

interface AnatomicalMannequin3DProps {
  selectedRegionId?: string | null
  selectedLaterality?: LateralityType | null
  onSelectPiece: (piece: AnatomicalPieceData) => void
  onError?: (err: Error) => void
}

// Catálogo de piezas anatómicas 3D con estructuras de 2 niveles
export const MANNEQUIN_PIECES: Record<string, AnatomicalPieceData> = {
  // Cabeza y Cuello
  cabeza: {
    id: "cabeza",
    region: "Cabeza",
    laterality: "central",
    structures: ["Cabeza", "Cara"],
    defaultStructure: "Cabeza",
    displayName: "Cabeza / Cara"
  },
  cuello: {
    id: "cuello",
    region: "Cuello",
    laterality: "central",
    structures: ["Cuello"],
    defaultStructure: "Cuello",
    displayName: "Cuello"
  },

  // Tronco
  pecho: {
    id: "pecho",
    region: "Tronco",
    laterality: "central",
    structures: ["Pecho", "Clavícula", "Costillas"],
    defaultStructure: "Pecho",
    displayName: "Pecho / Clavícula"
  },
  abdomen: {
    id: "abdomen",
    region: "Tronco",
    laterality: "central",
    structures: ["Abdomen", "Costillas"],
    defaultStructure: "Abdomen",
    displayName: "Abdomen"
  },
  espalda: {
    id: "espalda",
    region: "Tronco",
    laterality: "central",
    structures: ["Espalda"],
    defaultStructure: "Espalda",
    displayName: "Espalda dorsal"
  },
  lumbar: {
    id: "lumbar",
    region: "Tronco",
    laterality: "central",
    structures: ["Zona lumbar"],
    defaultStructure: "Zona lumbar",
    displayName: "Zona lumbar"
  },

  // Pelvis / Cadera
  cadera_izq: {
    id: "cadera_izq",
    region: "Cadera / Pelvis",
    laterality: "izquierda",
    structures: ["Cadera", "Ingle", "Aductores"],
    defaultStructure: "Cadera",
    displayName: "Cadera / Ingle izquierda"
  },
  cadera_der: {
    id: "cadera_der",
    region: "Cadera / Pelvis",
    laterality: "derecha",
    structures: ["Cadera", "Ingle", "Aductores"],
    defaultStructure: "Cadera",
    displayName: "Cadera / Ingle derecha"
  },

  // Miembros Superiores - Izquierdo
  hombro_izq: {
    id: "hombro_izq",
    region: "Hombro",
    laterality: "izquierda",
    structures: ["Hombro", "Deltoides", "Articulación acromioclavicular"],
    defaultStructure: "Hombro",
    displayName: "Hombro izquierdo"
  },
  brazo_izq: {
    id: "brazo_izq",
    region: "Brazo",
    laterality: "izquierda",
    structures: ["Bíceps", "Tríceps"],
    defaultStructure: "Bíceps",
    displayName: "Brazo izquierdo (Bíceps/Tríceps)"
  },
  codo_izq: {
    id: "codo_izq",
    region: "Codo",
    laterality: "izquierda",
    structures: ["Codo", "Epicóndilo", "Articulación"],
    defaultStructure: "Codo",
    displayName: "Codo izquierdo"
  },
  antebrazo_izq: {
    id: "antebrazo_izq",
    region: "Antebrazo",
    laterality: "izquierda",
    structures: ["Musculatura flexora", "Musculatura extensora", "Radio", "Cúbito"],
    defaultStructure: "Musculatura flexora",
    displayName: "Antebrazo izquierdo"
  },
  muneca_izq: {
    id: "muneca_izq",
    region: "Muñeca",
    laterality: "izquierda",
    structures: ["Muñeca", "Escafoides"],
    defaultStructure: "Muñeca",
    displayName: "Muñeca izquierda"
  },
  mano_izq: {
    id: "mano_izq",
    region: "Mano",
    laterality: "izquierda",
    structures: ["Mano", "Metacarpos", "Dedos"],
    defaultStructure: "Mano",
    displayName: "Mano / Dedos izquierdos"
  },

  // Miembros Superiores - Derecho
  hombro_der: {
    id: "hombro_der",
    region: "Hombro",
    laterality: "derecha",
    structures: ["Hombro", "Deltoides", "Articulación acromioclavicular"],
    defaultStructure: "Hombro",
    displayName: "Hombro derecho"
  },
  brazo_der: {
    id: "brazo_der",
    region: "Brazo",
    laterality: "derecha",
    structures: ["Bíceps", "Tríceps"],
    defaultStructure: "Bíceps",
    displayName: "Brazo derecho (Bíceps/Tríceps)"
  },
  codo_der: {
    id: "codo_der",
    region: "Codo",
    laterality: "derecha",
    structures: ["Codo", "Epicóndilo", "Articulación"],
    defaultStructure: "Codo",
    displayName: "Codo derecho"
  },
  antebrazo_der: {
    id: "antebrazo_der",
    region: "Antebrazo",
    laterality: "derecha",
    structures: ["Musculatura flexora", "Musculatura extensora", "Radio", "Cúbito"],
    defaultStructure: "Musculatura flexora",
    displayName: "Antebrazo derecho"
  },
  muneca_der: {
    id: "muneca_der",
    region: "Muñeca",
    laterality: "derecha",
    structures: ["Muñeca", "Escafoides"],
    defaultStructure: "Muñeca",
    displayName: "Muñeca derecha"
  },
  mano_der: {
    id: "mano_der",
    region: "Mano",
    laterality: "derecha",
    structures: ["Mano", "Metacarpos", "Dedos"],
    defaultStructure: "Mano",
    displayName: "Mano / Dedos derechos"
  },

  // Miembros Inferiores - Izquierdo
  muslo_ant_izq: {
    id: "muslo_ant_izq",
    region: "Muslo anterior",
    laterality: "izquierda",
    structures: ["Cuádriceps", "Recto femoral", "Vasto interno", "Vasto externo"],
    defaultStructure: "Cuádriceps",
    displayName: "Cuádriceps / Muslo anterior izquierdo"
  },
  muslo_post_izq: {
    id: "muslo_post_izq",
    region: "Muslo posterior",
    laterality: "izquierda",
    structures: ["Isquiotibiales", "Bíceps femoral", "Semitendinoso", "Semimembranoso"],
    defaultStructure: "Isquiotibiales",
    displayName: "Isquiotibiales / Muslo posterior izquierdo"
  },
  rodilla_izq: {
    id: "rodilla_izq",
    region: "Rodilla",
    laterality: "izquierda",
    structures: ["Rodilla", "Rótula", "Tendón rotuliano"],
    defaultStructure: "Rodilla",
    displayName: "Rodilla izquierda"
  },
  pierna_izq: {
    id: "pierna_izq",
    region: "Pierna",
    laterality: "izquierda",
    structures: ["Gemelo", "Sóleo", "Tibial anterior"],
    defaultStructure: "Gemelo",
    displayName: "Gemelo / Sóleo izquierdo"
  },
  tobillo_izq: {
    id: "tobillo_izq",
    region: "Tobillo",
    laterality: "izquierda",
    structures: ["Tobillo interno", "Tobillo externo", "Tendón de Aquiles"],
    defaultStructure: "Tobillo externo",
    displayName: "Tobillo izquierdo"
  },
  pie_izq: {
    id: "pie_izq",
    region: "Pie",
    laterality: "izquierda",
    structures: ["Empeine", "Talón", "Planta", "Dedos"],
    defaultStructure: "Empeine",
    displayName: "Pie izquierdo"
  },

  // Miembros Inferiores - Derecho
  muslo_ant_der: {
    id: "muslo_ant_der",
    region: "Muslo anterior",
    laterality: "derecha",
    structures: ["Cuádriceps", "Recto femoral", "Vasto interno", "Vasto externo"],
    defaultStructure: "Cuádriceps",
    displayName: "Cuádriceps / Muslo anterior derecho"
  },
  muslo_post_der: {
    id: "muslo_post_der",
    region: "Muslo posterior",
    laterality: "derecha",
    structures: ["Isquiotibiales", "Bíceps femoral", "Semitendinoso", "Semimembranoso"],
    defaultStructure: "Isquiotibiales",
    displayName: "Isquiotibiales / Muslo posterior derecho"
  },
  rodilla_der: {
    id: "rodilla_der",
    region: "Rodilla",
    laterality: "derecha",
    structures: ["Rodilla", "Rótula", "Tendón rotuliano"],
    defaultStructure: "Rodilla",
    displayName: "Rodilla derecha"
  },
  pierna_der: {
    id: "pierna_der",
    region: "Pierna",
    laterality: "derecha",
    structures: ["Gemelo", "Sóleo", "Tibial anterior"],
    defaultStructure: "Gemelo",
    displayName: "Gemelo / Sóleo derecho"
  },
  tobillo_der: {
    id: "tobillo_der",
    region: "Tobillo",
    laterality: "derecha",
    structures: ["Tobillo interno", "Tobillo externo", "Tendón de Aquiles"],
    defaultStructure: "Tobillo externo",
    displayName: "Tobillo derecho"
  },
  pie_der: {
    id: "pie_der",
    region: "Pie",
    laterality: "derecha",
    structures: ["Empeine", "Talón", "Planta", "Dedos"],
    defaultStructure: "Empeine",
    displayName: "Pie derecho"
  }
}

export function AnatomicalMannequin3D({
  selectedRegionId,
  selectedLaterality,
  onSelectPiece,
  onError
}: AnatomicalMannequin3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [hoveredPiece, setHoveredPiece] = useState<AnatomicalPieceData | null>(null)
  const [activeViewLabel, setActiveViewLabel] = useState<string>("Frontal")
  const [isRotatingAuto, setIsRotatingAuto] = useState<boolean>(false)

  // Referencias a objetos Three.js para animación y controles
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const modelGroupRef = useRef<THREE.Group | null>(null)
  const interactiveMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const reqIdRef = useRef<number | null>(null)

  // Variables de control de rotación y zoom
  const targetRotationY = useRef<number>(0)
  const currentRotationY = useRef<number>(0)
  const targetRotationX = useRef<number>(0)
  const currentRotationX = useRef<number>(0)
  const targetDistance = useRef<number>(5.2)
  const currentDistance = useRef<number>(5.2)

  const isDragging = useRef<boolean>(false)
  const previousPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const touchStartDist = useRef<number>(0)
  const hasMovedSignificantly = useRef<boolean>(false)

  // Materiales temáticos deportivos
  const baseMaterialRef = useRef<THREE.MeshStandardMaterial>(
    new THREE.MeshStandardMaterial({
      color: 0x334155, // slate-700
      roughness: 0.45,
      metalness: 0.2
    })
  )

  const hoverMaterialRef = useRef<THREE.MeshStandardMaterial>(
    new THREE.MeshStandardMaterial({
      color: 0x0284c7, // sky-600
      roughness: 0.3,
      metalness: 0.3,
      emissive: 0x0369a1,
      emissiveIntensity: 0.4
    })
  )

  const selectedMaterialRef = useRef<THREE.MeshStandardMaterial>(
    new THREE.MeshStandardMaterial({
      color: 0xdc2626, // red-600
      roughness: 0.25,
      metalness: 0.35,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.7
    })
  )

  const jointMaterialRef = useRef<THREE.MeshStandardMaterial>(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b, // slate-800
      roughness: 0.6,
      metalness: 0.3
    })
  )

  // Construye la geometría completa del maniquí deportivo articulado
  const buildMannequin = useCallback((scene: THREE.Scene) => {
    const mannequinGroup = new THREE.Group()
    const meshesMap = new Map<string, THREE.Mesh>()

    const createSegment = (
      pieceId: string,
      geometry: THREE.BufferGeometry,
      position: [number, number, number],
      rotation: [number, number, number] = [0, 0, 0],
      scale: [number, number, number] = [1, 1, 1]
    ) => {
      const mesh = new THREE.Mesh(geometry, baseMaterialRef.current)
      mesh.position.set(...position)
      mesh.rotation.set(...rotation)
      mesh.scale.set(...scale)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = { pieceId }
      mannequinGroup.add(mesh)
      meshesMap.set(pieceId, mesh)
      return mesh
    }

    const createJoint = (
      position: [number, number, number],
      radius: number = 0.08
    ) => {
      const joint = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 16),
        jointMaterialRef.current
      )
      joint.position.set(...position)
      mannequinGroup.add(joint)
      return joint
    }

    // --- CABEZA Y CUELLO ---
    createSegment("cabeza", new THREE.SphereGeometry(0.24, 24, 24), [0, 1.82, 0], [0, 0, 0], [0.85, 1.1, 0.95])
    createSegment("cuello", new THREE.CylinderGeometry(0.09, 0.11, 0.16, 20), [0, 1.58, 0])

    // --- TRONCO ---
    createSegment("pecho", new THREE.BoxGeometry(0.68, 0.32, 0.28), [0, 1.34, 0.02])
    createSegment("abdomen", new THREE.BoxGeometry(0.54, 0.26, 0.24), [0, 1.05, 0.02])
    createSegment("espalda", new THREE.BoxGeometry(0.66, 0.32, 0.1), [0, 1.34, -0.12])
    createSegment("lumbar", new THREE.BoxGeometry(0.52, 0.26, 0.1), [0, 1.05, -0.11])

    // --- PELVIS / CADERA ---
    createSegment("cadera_izq", new THREE.CylinderGeometry(0.18, 0.15, 0.24, 16), [-0.17, 0.82, 0], [0, 0, 0.15])
    createSegment("cadera_der", new THREE.CylinderGeometry(0.18, 0.15, 0.24, 16), [0.17, 0.82, 0], [0, 0, -0.15])

    // --- MIEMBROS SUPERIORES: HOMBROS ---
    createSegment("hombro_izq", new THREE.SphereGeometry(0.14, 20, 20), [-0.44, 1.44, 0])
    createSegment("hombro_der", new THREE.SphereGeometry(0.14, 20, 20), [0.44, 1.44, 0])

    // --- BRAZOS (BÍCEPS / TRÍCEPS) ---
    createSegment("brazo_izq", new THREE.CylinderGeometry(0.1, 0.09, 0.34, 16), [-0.46, 1.2, 0], [0, 0, -0.1])
    createSegment("brazo_der", new THREE.CylinderGeometry(0.1, 0.09, 0.34, 16), [0.46, 1.2, 0], [0, 0, 0.1])

    // Articulaciones de Codo
    createJoint([-0.49, 0.98, 0], 0.075)
    createJoint([0.49, 0.98, 0], 0.075)

    // CODOS
    createSegment("codo_izq", new THREE.SphereGeometry(0.085, 16, 16), [-0.49, 0.98, 0])
    createSegment("codo_der", new THREE.SphereGeometry(0.085, 16, 16), [0.49, 0.98, 0])

    // ANTEBRAZOS
    createSegment("antebrazo_izq", new THREE.CylinderGeometry(0.085, 0.07, 0.32, 16), [-0.51, 0.77, 0.02], [0.08, 0, -0.06])
    createSegment("antebrazo_der", new THREE.CylinderGeometry(0.085, 0.07, 0.32, 16), [0.51, 0.77, 0.02], [0.08, 0, 0.06])

    // MUÑECAS
    createSegment("muneca_izq", new THREE.CylinderGeometry(0.065, 0.06, 0.08, 16), [-0.52, 0.58, 0.04])
    createSegment("muneca_der", new THREE.CylinderGeometry(0.065, 0.06, 0.08, 16), [0.52, 0.58, 0.04])

    // MANOS
    createSegment("mano_izq", new THREE.BoxGeometry(0.07, 0.14, 0.04), [-0.53, 0.46, 0.05])
    createSegment("mano_der", new THREE.BoxGeometry(0.07, 0.14, 0.04), [0.53, 0.46, 0.05])

    // --- MIEMBROS INFERIORES: MUSLOS ---
    createSegment("muslo_ant_izq", new THREE.CylinderGeometry(0.16, 0.13, 0.46, 18), [-0.2, 0.52, 0.04], [0.04, 0, 0.04])
    createSegment("muslo_post_izq", new THREE.CylinderGeometry(0.15, 0.12, 0.46, 18), [-0.2, 0.52, -0.04], [-0.04, 0, 0.04])

    createSegment("muslo_ant_der", new THREE.CylinderGeometry(0.16, 0.13, 0.46, 18), [0.2, 0.52, 0.04], [0.04, 0, -0.04])
    createSegment("muslo_post_der", new THREE.CylinderGeometry(0.15, 0.12, 0.46, 18), [0.2, 0.52, -0.04], [-0.04, 0, -0.04])

    // RODILLAS
    createJoint([-0.2, 0.24, 0], 0.1)
    createJoint([0.2, 0.24, 0], 0.1)
    createSegment("rodilla_izq", new THREE.SphereGeometry(0.11, 18, 18), [-0.2, 0.24, 0.02])
    createSegment("rodilla_der", new THREE.SphereGeometry(0.11, 18, 18), [0.2, 0.24, 0.02])

    // PIERNAS (GEMELOS / SÓLEO / TIBIAL)
    createSegment("pierna_izq", new THREE.CylinderGeometry(0.11, 0.08, 0.48, 18), [-0.2, -0.05, 0], [-0.02, 0, 0.02])
    createSegment("pierna_der", new THREE.CylinderGeometry(0.11, 0.08, 0.48, 18), [0.2, -0.05, 0], [-0.02, 0, -0.02])

    // TOBILLOS
    createJoint([-0.2, -0.32, 0], 0.075)
    createJoint([0.2, -0.32, 0], 0.075)
    createSegment("tobillo_izq", new THREE.SphereGeometry(0.085, 16, 16), [-0.2, -0.32, 0])
    createSegment("tobillo_der", new THREE.SphereGeometry(0.085, 16, 16), [0.2, -0.32, 0])

    // PIES
    createSegment("pie_izq", new THREE.BoxGeometry(0.11, 0.09, 0.24), [-0.2, -0.4, 0.06])
    createSegment("pie_der", new THREE.BoxGeometry(0.11, 0.09, 0.24), [0.2, -0.4, 0.06])

    // Plataforma o suelo estilizado deportivo
    const podiumGeo = new THREE.CylinderGeometry(1.1, 1.25, 0.06, 36)
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.1
    })
    const podium = new THREE.Mesh(podiumGeo, podiumMat)
    podium.position.set(0, -0.46, 0)
    podium.receiveShadow = true
    mannequinGroup.add(podium)

    mannequinGroup.position.set(0, -0.5, 0)
    scene.add(mannequinGroup)

    modelGroupRef.current = mannequinGroup
    interactiveMeshesRef.current = meshesMap
  }, [])

  // Inicialización de la escena WebGL Three.js
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    try {
      // 1. Escena
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf8fafc)
      sceneRef.current = scene

      // 2. Cámara de perspectiva
      const width = container.clientWidth || 360
      const height = container.clientHeight || 420
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50)
      camera.position.set(0, 0.4, currentDistance.current)
      cameraRef.current = camera

      // 3. Luces de estudio atléticas
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
      scene.add(ambientLight)

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.8)
      keyLight.position.set(3, 4, 4)
      keyLight.castShadow = true
      scene.add(keyLight)

      const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9)
      fillLight.position.set(-4, 2, 2)
      scene.add(fillLight)

      const backLight = new THREE.DirectionalLight(0xffffff, 1.0)
      backLight.position.set(0, 3, -4)
      scene.add(backLight)

      // 4. Renderizador WebGL
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: true
      })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap

      container.appendChild(renderer.domElement)
      rendererRef.current = renderer

      // 5. Construcción de la malla
      buildMannequin(scene)

      // 6. Bucle de renderizado y amortiguación (damping)
      const animate = () => {
        reqIdRef.current = requestAnimationFrame(animate)

        if (isRotatingAuto && !isDragging.current) {
          targetRotationY.current += 0.006
        }

        currentRotationY.current += (targetRotationY.current - currentRotationY.current) * 0.1
        currentRotationX.current += (targetRotationX.current - currentRotationX.current) * 0.1
        currentDistance.current += (targetDistance.current - currentDistance.current) * 0.1

        if (modelGroupRef.current) {
          modelGroupRef.current.rotation.y = currentRotationY.current
          modelGroupRef.current.rotation.x = currentRotationX.current
        }

        if (cameraRef.current) {
          cameraRef.current.position.z = currentDistance.current
        }

        const normAngle = ((currentRotationY.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        if (normAngle < Math.PI * 0.25 || normAngle >= Math.PI * 1.75) {
          setActiveViewLabel("Frontal")
        } else if (normAngle >= Math.PI * 0.25 && normAngle < Math.PI * 0.75) {
          setActiveViewLabel("Lateral Derecha")
        } else if (normAngle >= Math.PI * 0.75 && normAngle < Math.PI * 1.25) {
          setActiveViewLabel("Posterior (Dorsal)")
        } else {
          setActiveViewLabel("Lateral Izquierda")
        }

        renderer.render(scene, camera)
      }
      animate()

      // 7. Manejo de Redimensionado responsivo
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
        window.removeEventListener("resize", handleResize)
        if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current)
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
        renderer.dispose()
      }
    } catch (err: any) {
      console.error("Error al inicializar WebGL/Three.js:", err)
      if (onError) onError(err)
    }
  }, [buildMannequin, onError, isRotatingAuto])

  // Actualiza los materiales de las piezas según la selección activa
  useEffect(() => {
    interactiveMeshesRef.current.forEach((mesh, pieceId) => {
      const pieceData = MANNEQUIN_PIECES[pieceId]
      if (!pieceData) return

      const isSelected =
        selectedRegionId === pieceId ||
        (selectedRegionId &&
          pieceData.region.toLowerCase() === selectedRegionId.toLowerCase() &&
          (!selectedLaterality || pieceData.laterality === selectedLaterality))

      const isHovered = hoveredPiece?.id === pieceId

      if (isSelected) {
        mesh.material = selectedMaterialRef.current
      } else if (isHovered) {
        mesh.material = hoverMaterialRef.current
      } else {
        mesh.material = baseMaterialRef.current
      }
    })
  }, [selectedRegionId, selectedLaterality, hoveredPiece])

  // Raycasting para identificar la pieza clickeada o tocada
  const raycastPiece = useCallback((clientX: number, clientY: number): string | null => {
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return null
    const rect = mountRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 2 - 1
    const y = -((clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current)

    const meshList = Array.from(interactiveMeshesRef.current.values())
    const intersects = raycaster.intersectObjects(meshList, false)

    if (intersects.length > 0) {
      const hit = intersects[0].object
      return hit.userData.pieceId || null
    }
    return null
  }, [])

  // Controladores de eventos de ratón (Escritorio)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    hasMovedSignificantly.current = false
    previousPointer.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      const deltaX = e.clientX - previousPointer.current.x
      const deltaY = e.clientY - previousPointer.current.y
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMovedSignificantly.current = true
      }
      targetRotationY.current += deltaX * 0.012
      targetRotationX.current = Math.max(-0.4, Math.min(0.4, targetRotationX.current + deltaY * 0.008))
      previousPointer.current = { x: e.clientX, y: e.clientY }
    } else {
      const pieceId = raycastPiece(e.clientX, e.clientY)
      if (pieceId && MANNEQUIN_PIECES[pieceId]) {
        setHoveredPiece(MANNEQUIN_PIECES[pieceId])
      } else {
        setHoveredPiece(null)
      }
    }
  }

  const handleMouseUp = () => {
    if (!hasMovedSignificantly.current && previousPointer.current) {
      const pieceId = raycastPiece(previousPointer.current.x, previousPointer.current.y)
      if (pieceId && MANNEQUIN_PIECES[pieceId]) {
        onSelectPiece(MANNEQUIN_PIECES[pieceId])
      }
    }
    isDragging.current = false
  }

  // Controladores táctiles (Móviles / Tablets)
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
    if (e.touches.length === 1 && isDragging.current) {
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
      targetDistance.current = Math.max(3.2, Math.min(7.5, targetDistance.current - diff))
      touchStartDist.current = dist
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!hasMovedSignificantly.current && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0]
      const pieceId = raycastPiece(touch.clientX, touch.clientY)
      if (pieceId && MANNEQUIN_PIECES[pieceId]) {
        onSelectPiece(MANNEQUIN_PIECES[pieceId])
      }
    }
    isDragging.current = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomDelta = e.deltaY * 0.003
    targetDistance.current = Math.max(3.2, Math.min(7.5, targetDistance.current + zoomDelta))
  }

  const setPresetView = (view: "front" | "back" | "left" | "right" | "reset") => {
    targetRotationX.current = 0
    if (view === "front") targetRotationY.current = 0
    else if (view === "back") targetRotationY.current = Math.PI
    else if (view === "left") targetRotationY.current = Math.PI * 0.5
    else if (view === "right") targetRotationY.current = -Math.PI * 0.5
    else if (view === "reset") {
      targetRotationY.current = 0
      targetDistance.current = 5.2
    }
  }

  return (
    <div className="flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-md relative select-none">
      {/* Barra de estado y vista activa */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-950/90 border-b border-slate-800 text-xs text-white z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wide text-[11px] uppercase text-slate-300">
            Vista 3D: <strong className="text-white">{activeViewLabel}</strong>
          </span>
        </div>

        {/* Controles de vista rápida */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPresetView("front")}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
            title="Vista Frontal"
          >
            Frontal
          </button>
          <button
            type="button"
            onClick={() => setPresetView("back")}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
            title="Vista Posterior (Dorsal)"
          >
            Dorsal
          </button>
          <button
            type="button"
            onClick={() => setPresetView("left")}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer hidden xs:inline-block"
            title="Vista Lateral Izquierda"
          >
            Lat. Izq
          </button>
          <button
            type="button"
            onClick={() => setPresetView("right")}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer hidden xs:inline-block"
            title="Vista Lateral Derecha"
          >
            Lat. Der
          </button>
          <button
            type="button"
            onClick={() => setPresetView("reset")}
            className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors cursor-pointer"
            title="Restablecer orientación"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contenedor del Canvas WebGL 3D */}
      <div
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="w-full h-80 sm:h-96 cursor-grab active:cursor-grabbing relative overflow-hidden bg-radial from-slate-800 to-slate-950"
      >
        {/* Tooltip flotante de pieza bajo el cursor */}
        {hoveredPiece && (
          <div className="absolute top-3 left-3 pointer-events-none bg-slate-900/95 backdrop-blur-xs border border-sky-500/60 text-white px-3 py-1.5 rounded-xl shadow-lg text-xs animate-in fade-in zoom-in-95 duration-150 z-20">
            <span className="text-[10px] uppercase font-bold text-sky-400 block">Apuntando:</span>
            <span className="font-bold">{hoveredPiece.displayName}</span>
          </div>
        )}

        {/* Guía de ayuda interactiva */}
        <div className="absolute bottom-2.5 left-3 pointer-events-none text-[10px] text-slate-400 bg-slate-950/70 px-2 py-1 rounded-md backdrop-blur-xs flex items-center gap-1.5 z-20">
          <Eye className="w-3 h-3 text-slate-300" />
          <span>Arrastra para rotar 360° • Toca para seleccionar zona</span>
        </div>

        {/* Botones de Zoom en esquina inferior derecha */}
        <div className="absolute bottom-2.5 right-3 flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 z-20">
          <button
            type="button"
            onClick={() => {
              targetDistance.current = Math.max(3.2, targetDistance.current - 0.6)
            }}
            className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Acercar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              targetDistance.current = Math.min(7.5, targetDistance.current + 0.6)
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
