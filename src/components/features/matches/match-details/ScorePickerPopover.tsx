"use client"

import { useState, useRef, useEffect } from "react"

interface ScorePickerPopoverProps {
  value: number | null | undefined
  onChange: (val: number | null) => void
  label?: string
  disabled?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
  forceUpwards?: boolean
}

export function ScorePickerPopover({
  value,
  onChange,
  label = "Nota",
  disabled = false,
  className = "",
  size = "md",
  forceUpwards = false
}: ScorePickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpwards, setOpenUpwards] = useState(forceUpwards)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = () => {
    if (disabled) return
    if (!isOpen && containerRef.current) {
      if (forceUpwards) {
        setOpenUpwards(true)
      } else {
        const rect = containerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        // Si hay menos de 260px por debajo, abrir hacia arriba
        setOpenUpwards(spaceBelow < 260)
      }
    }
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const isAssigned = value !== null && value !== undefined

  // Color de la pastilla según la nota
  const getColorClass = (val: number | null | undefined) => {
    if (val === null || val === undefined) {
      return "bg-slate-100 text-slate-400 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-200/60"
    }
    if (val < 5) {
      return "bg-rose-50 text-rose-700 border-rose-300 font-black shadow-2xs hover:bg-rose-100"
    }
    if (val <= 6) {
      return "bg-amber-50 text-amber-800 border-amber-300 font-black shadow-2xs hover:bg-amber-100"
    }
    if (val <= 8) {
      return "bg-emerald-50 text-emerald-800 border-emerald-300 font-black shadow-2xs hover:bg-emerald-100"
    }
    return "bg-blue-50 text-blue-800 border-blue-300 font-black shadow-2xs hover:bg-blue-100"
  }

  // Color de cada botón numérico dentro del popover
  const getOptionColor = (num: number) => {
    if (num === 0) {
      return "bg-slate-100 hover:bg-slate-600 hover:text-white text-slate-700 border-slate-200"
    }
    if (num < 5) {
      return "bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border-rose-200"
    }
    if (num <= 6) {
      return "bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 border-amber-200"
    }
    if (num <= 8) {
      return "bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border-emerald-200"
    }
    return "bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-800 border-blue-200"
  }

  // Dimensiones según el tamaño
  const sizeClasses = {
    sm: "min-w-[40px] h-8 px-2 text-[11px] rounded-lg",
    md: "min-w-[46px] h-9 px-2.5 text-xs rounded-xl",
    lg: "min-w-[64px] h-12 px-4 text-base rounded-2xl shadow-sm"
  }[size]

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`${sizeClasses} border flex items-center justify-center font-black transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer ${getColorClass(
          value
        )}`}
        title={
          disabled
            ? "No aplicable a jugadores ausentes"
            : `Pulsar para calificar ${label}: ${isAssigned ? value : "Sin calificar (0-10)"}`
        }
      >
        <span>{isAssigned ? value : "—"}</span>
      </button>

      {isOpen && !disabled && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 animate-in fade-in duration-100"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(false)
          }}
        >
          <div
            className="w-72 p-4 bg-white rounded-3xl shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Calificar {label} (0 - 10)
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const isSelected = isAssigned && value === num
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      onChange(num)
                      setIsOpen(false)
                    }}
                    className={`h-11 rounded-2xl border text-sm font-black transition-all flex items-center justify-center shadow-2xs cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-blue-600 ring-offset-2 font-black scale-105"
                        : "hover:scale-105 active:scale-95"
                    } ${getOptionColor(num)}`}
                  >
                    {num}
                  </button>
                )
              })}

              {/* Botón Borrar / Sin Calificar */}
              <button
                type="button"
                onClick={() => {
                  onChange(null)
                  setIsOpen(false)
                }}
                title="Borrar nota"
                className="h-11 rounded-2xl border border-dashed border-slate-300 text-xs font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all flex items-center justify-center cursor-pointer"
              >
                Borrar
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-400">
              <span className="text-rose-600">0-4 Insuf.</span>
              <span className="text-amber-600">5-6 Bien</span>
              <span className="text-emerald-600">7-8 Not.</span>
              <span className="text-blue-600">9-10 Sob.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
