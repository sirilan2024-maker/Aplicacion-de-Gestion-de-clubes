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

  // Comprobar scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      // Margen de 10px para asegurar que se detecta el final
      if (Math.ceil(scrollTop + clientHeight) >= scrollHeight - 10) {
        setHasScrolledToBottom(true)
      }
    }
  }

  // Manejar el caso donde el contenido es tan corto que no requiere scroll
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current
      if (scrollHeight <= clientHeight) {
        setHasScrolledToBottom(true)
      }
    }
  }, [isOpen, content])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 text-slate-800">
        
        {/* Cabecera */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="p-6 overflow-y-auto space-y-4 text-sm text-slate-600 leading-relaxed"
        >
          {content}
        </div>

        {/* Footer flotante */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-4 relative">
          
          {/* Indicador visual de hacer scroll */}
          {!hasScrolledToBottom && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg animate-bounce">
              <ChevronDown size={14} />
              Baja para leer todo
            </div>
          )}

          <p className="text-xs text-slate-500 text-center sm:text-left">
            {!hasScrolledToBottom 
              ? "Debes leer el documento completo antes de poder aceptarlo." 
              : "Gracias por leer la información legal."}
          </p>
          <button
            type="button"
            onClick={() => {
              onAccept()
              onClose()
            }}
            disabled={!hasScrolledToBottom}
            className={`flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl text-sm transition-all ${
              hasScrolledToBottom 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {hasScrolledToBottom ? <CheckCircle size={18} /> : null}
            He leído y acepto
          </button>
        </div>
      </div>
    </div>
  )
}
