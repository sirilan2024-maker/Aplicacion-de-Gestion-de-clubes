"use client"

import { useState, useRef, useEffect } from "react"

interface StatPickerPopoverProps {
  value: number
  onChange: (val: number) => void
  type: "goals" | "yellows" | "reds"
  disabled?: boolean
  forceUpwards?: boolean
  className?: string
}

export function StatPickerPopover({
  value,
  onChange,
  type,
  disabled = false,
  forceUpwards = false,
  className = ""
}: StatPickerPopoverProps) {
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
        setOpenUpwards(spaceBelow < 220)
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

  // Configuración según el tipo
  const config = {
    goals: {
      label: "Goles",
      icon: "⚽",
      options: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      badgeClass: value > 0 
        ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-black shadow-2xs hover:bg-emerald-100" 
        : "bg-slate-50 text-slate-400 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-100/60",
      optClass: (opt: number) => opt === 0 
        ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
        : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-600 hover:text-white"
    },
    yellows: {
      label: "Tarjetas Amarillas",
      icon: "🟨",
      options: [0, 1, 2],
      badgeClass: value > 0 
        ? "bg-amber-50 text-amber-800 border-amber-300 font-black shadow-2xs hover:bg-amber-100" 
        : "bg-slate-50 text-slate-400 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-100/60",
      optClass: (opt: number) => opt === 0 
        ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
        : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-500 hover:text-white"
    },
    reds: {
      label: "Tarjeta Roja",
      icon: "🟥",
      options: [0, 1],
      badgeClass: value > 0 
        ? "bg-rose-50 text-rose-700 border-rose-300 font-black shadow-2xs hover:bg-rose-100" 
        : "bg-slate-50 text-slate-400 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-100/60",
      optClass: (opt: number) => opt === 0 
        ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
        : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white"
    }
  }[type]

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`min-w-[40px] h-8 px-2 rounded-xl border flex items-center justify-center text-xs font-black transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer ${config.badgeClass}`}
        title={`Pulsar para anotar ${config.label}: ${value > 0 ? value : "0 (sin " + config.label + ")"}`}
      >
        <span>
          {value > 0 ? `${config.icon} ${value}` : "—"}
        </span>
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
            className={`p-4 bg-white rounded-3xl shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-3 ${
              type === "goals" ? "w-72" : "w-64"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {type === "goals" && (
              <div className="grid grid-cols-3 gap-2">
                {config.options.map((opt) => {
                  const isSelected = value === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onChange(opt)
                        setIsOpen(false)
                      }}
                      className={`h-11 rounded-2xl border text-sm font-black transition-all flex items-center justify-center shadow-2xs cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-emerald-600 ring-offset-2 font-black scale-105"
                          : "hover:scale-105 active:scale-95"
                      } ${config.optClass(opt)}`}
                    >
                      {opt === 0 ? "0" : `⚽ ${opt}`}
                    </button>
                  )
                })}
              </div>
            )}

            {type === "yellows" && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange(0)
                    setIsOpen(false)
                  }}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    value === 0 ? "ring-2 ring-slate-400 bg-slate-100 font-black text-slate-900" : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span>0 — Sin tarjetas</span>
                  {value === 0 && <span className="text-xs text-slate-600 font-black">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(1)
                    setIsOpen(false)
                  }}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    value === 1 ? "ring-2 ring-amber-500 bg-amber-50 font-black text-amber-900 border-amber-300" : "hover:bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <span className="flex items-center gap-1.5">🟨 <strong>1 Amarilla</strong></span>
                  {value === 1 && <span className="text-xs text-amber-700 font-black">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(2)
                    setIsOpen(false)
                  }}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    value === 2 ? "ring-2 ring-amber-500 bg-amber-50 font-black text-amber-900 border-amber-300" : "hover:bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <span className="flex items-center gap-1.5">🟨🟨 <strong>2 Amarillas (Expulsión)</strong></span>
                  {value === 2 && <span className="text-xs text-amber-700 font-black">✓</span>}
                </button>
              </div>
            )}

            {type === "reds" && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange(0)
                    setIsOpen(false)
                  }}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    value === 0 ? "ring-2 ring-slate-400 bg-slate-100 font-black text-slate-900" : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span>0 — Sin roja</span>
                  {value === 0 && <span className="text-xs text-slate-600 font-black">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(1)
                    setIsOpen(false)
                  }}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    value === 1 ? "ring-2 ring-rose-500 bg-rose-50 font-black text-rose-800 border-rose-300" : "hover:bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <span className="flex items-center gap-1.5">🟥 <strong>1 Roja Directa</strong></span>
                  {value === 1 && <span className="text-xs text-rose-700 font-black">✓</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
