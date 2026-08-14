"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Camera, ZoomIn, ZoomOut, Check, X, RotateCcw, Move } from "lucide-react"

interface PhotoAdjustModalProps {
  imageSrc: string
  onSave: (croppedCanvas: HTMLCanvasElement) => void
  onCancel: () => void
}

const CONTAINER_SIZE = 280 // px, tamaño del cuadrado de previsualización
const OUTPUT_SIZE = 400   // px, resolución de salida del avatar

export function PhotoAdjustModal({ imageSrc, onSave, onCancel }: PhotoAdjustModalProps) {
  console.log("PhotoAdjustModal renderizado con imageSrc longitud:", imageSrc?.length)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 }) // offset en píxeles de imagen natural
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Cargar imagen para conocer dimensiones reales
  useEffect(() => {
    if (!imageSrc) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImgSize({ w: img.naturalWidth || 400, h: img.naturalHeight || 400 })
      const w = img.naturalWidth || 400
      const h = img.naturalHeight || 400
      const initialZoom = w > h ? CONTAINER_SIZE / h : CONTAINER_SIZE / w
      setZoom(initialZoom || 1)
      setOffset({ x: 0, y: 0 })
    }
    img.onerror = (e) => {
      console.error("Error cargando imageSrc en PhotoAdjustModal:", e)
      alert("No se pudo previsualizar la foto seleccionada. Prueba con otra imagen.")
    }
    img.src = imageSrc
  }, [imageSrc])

  // Redibujar canvas de previsualización en tiempo real
  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || imgSize.w === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = CONTAINER_SIZE
    canvas.height = CONTAINER_SIZE

    ctx.clearRect(0, 0, CONTAINER_SIZE, CONTAINER_SIZE)
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(0, 0, CONTAINER_SIZE, CONTAINER_SIZE)

    const scaledW = imgSize.w * zoom
    const scaledH = imgSize.h * zoom

    const drawX = (CONTAINER_SIZE - scaledW) / 2 + offset.x
    const drawY = (CONTAINER_SIZE - scaledH) / 2 + offset.y

    ctx.drawImage(img, drawX, drawY, scaledW, scaledH)
  }, [zoom, offset, imgSize])

  // Drag handlers
  const getClientPos = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const pos = getClientPos(e)
    setDragStart({ x: pos.x - offset.x, y: pos.y - offset.y })
  }

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const pos = getClientPos(e)
    setOffset({
      x: pos.x - dragStart.x,
      y: pos.y - dragStart.y,
    })
  }

  const handleDragEnd = () => setIsDragging(false)

  const nudge = (dx: number, dy: number) => {
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
  }

  const handleReset = () => {
    if (imgSize.w === 0) return
    const initialZoom = imgSize.w > imgSize.h
      ? CONTAINER_SIZE / imgSize.h
      : CONTAINER_SIZE / imgSize.w
    setZoom(initialZoom)
    setOffset({ x: 0, y: 0 })
  }

  // Al guardar: generar canvas de salida a OUTPUT_SIZE con el encuadre actual
  const handleSave = () => {
    const img = imgRef.current
    if (!img || imgSize.w === 0) return

    const outputCanvas = document.createElement("canvas")
    outputCanvas.width = OUTPUT_SIZE
    outputCanvas.height = OUTPUT_SIZE

    const ctx = outputCanvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

    const scale = OUTPUT_SIZE / CONTAINER_SIZE

    const scaledW = imgSize.w * zoom * scale
    const scaledH = imgSize.h * zoom * scale

    const drawX = (OUTPUT_SIZE - scaledW) / 2 + offset.x * scale
    const drawY = (OUTPUT_SIZE - scaledH) / 2 + offset.y * scale

    ctx.drawImage(img, drawX, drawY, scaledW, scaledH)

    onSave(outputCanvas)
  }

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xs w-full p-5 text-white shadow-2xl flex flex-col items-center gap-4">

        {/* Header */}
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm text-white">Ajustar Foto de Perfil</h3>
        </div>
        <p className="text-xs text-slate-400 text-center -mt-3">
          Arrastra para mover · Usa el zoom para encuadrar la cara
        </p>

        {/* Preview Canvas */}
        <div
          className="rounded-2xl overflow-hidden border-2 border-emerald-500/60 shadow-inner cursor-grab active:cursor-grabbing select-none relative"
          style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE, touchAction: "none" }}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <canvas
            ref={canvasRef}
            width={CONTAINER_SIZE}
            height={CONTAINER_SIZE}
            className="block"
            style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
          />
          {/* Guide overlay */}
          <div className="absolute inset-0 border-2 border-dashed border-emerald-400/50 rounded-2xl pointer-events-none" />
          <div className="absolute bottom-2 left-2 bg-slate-900/80 px-2 py-0.5 rounded text-[10px] text-emerald-400 flex items-center gap-1 pointer-events-none">
            <Move className="w-3 h-3" /> Arrastra para mover
          </div>
        </div>

        {/* Nudge Buttons */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => nudge(0, -15)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-xs font-bold transition-colors"
          >⬆️</button>
          <div className="flex gap-2">
            <button
              onClick={() => nudge(-15, 0)}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-xs font-bold transition-colors"
            >⬅️</button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
              title="Centrar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => nudge(15, 0)}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-xs font-bold transition-colors"
            >➡️</button>
          </div>
          <button
            onClick={() => nudge(0, 15)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-xs font-bold transition-colors"
          >⬇️</button>
        </div>

        {/* Zoom Controls */}
        <div className="w-full flex items-center gap-3 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700">
          <button
            onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors flex-shrink-0"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min="0.2"
            max="5"
            step="0.05"
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <button
            onClick={() => setZoom(z => Math.min(5, z + 0.1))}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors flex-shrink-0"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all"
          >
            <Check className="w-4 h-4" /> Guardar Foto
          </button>
        </div>
      </div>
    </div>
  )
}
