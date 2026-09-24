"use client"

import React, { useRef, useState, useEffect } from "react"
import { X, CheckCircle, ChevronDown } from "lucide-react"

interface LegalModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  content: React.ReactNode
  onAccept: () => void
}

export function LegalModal({ isOpen, onClose, title, content, onAccept }: LegalModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)

  // Resetear el estado al abrir
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false)
    }
  }, [isOpen])

  // Comprobar scroll con margen generoso para móviles y pantallas táctiles
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      // En móviles el subpixelado o la inercia pueden no llegar a scrollHeight exacto.
      // Damos un margen de 40px o si ha recorrido más del 65% del documento.
      if (
        scrollHeight <= clientHeight ||
        scrollTop + clientHeight >= scrollHeight - 40 ||
        (scrollTop > 0 && (scrollTop + clientHeight) / scrollHeight >= 0.65)
      ) {
        setHasScrolledToBottom(true)
      }
    }
  }

  // Manejar el caso donde el contenido es tan corto que no requiere scroll
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current
      if (scrollHeight <= clientHeight + 40) {
        setHasScrolledToBottom(true)
      }
    }
  }, [isOpen, content])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 text-slate-800">
        
        {/* Cabecera */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl shrink-0">
          <h3 className="font-bold text-base sm:text-lg text-slate-800 leading-tight pr-2">{title}</h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          onTouchMove={handleScroll}
          className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed max-h-[60vh]"
        >
          {content}
        </div>

        {/* Footer flotante */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            {!hasScrolledToBottom 
              ? "Desliza para leer la información legal." 
              : "Información legal revisada."}
          </p>
          <button
            type="button"
            onClick={() => {
              onAccept()
              onClose()
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 font-bold rounded-xl text-xs sm:text-sm transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95"
          >
            <CheckCircle size={18} />
            He leído y acepto
          </button>
        </div>
      </div>
    </div>
  )
}
