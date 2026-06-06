"use client"

import { useState } from "react"
import { Link2, Copy, Check } from "lucide-react"

interface Props {
  inviteCode: string
  teamName:   string
  /** compact=true muestra solo el botón de copiar, sin la tarjeta completa */
  compact?:   boolean
}

export function CopyInviteButton({ inviteCode, teamName, compact = false }: Props) {
  const [copied, setCopied] = useState(false)

  const getUrl = () => {
    const base = typeof window !== "undefined" ? window.location.origin : ""
    return `${base}/register/${inviteCode}`
  }

  async function handleCopy() {
    const url = getUrl()
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement("textarea")
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // ── Compact version (for team cards) ────────────────────────────────────
  if (compact) {
    return (
      <button
        onClick={handleCopy}
        className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
          copied
            ? "bg-emerald-500 text-white"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {copied ? (
          <><Check size={12} /> ¡Copiado!</>
        ) : (
          <><Copy size={12} /> Copiar enlace</>
        )}
      </button>
    )
  }

  // ── Full version (for team detail page sidebar) ───────────────────────────
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <Link2 size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-blue-900">Enlace de invitación</p>
          <p className="text-[11px] text-blue-500 leading-tight">
            Comparte con entrenadores y familias
          </p>
        </div>
      </div>

      {/* Code + URL preview */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
            Código
          </span>
          <span className="font-mono text-sm font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-lg tracking-widest">
            {inviteCode}
          </span>
        </div>
        <div className="bg-white border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700 font-mono truncate select-all">
          {`/register/${inviteCode}`}
        </div>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
          copied
            ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
            : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
        }`}
      >
        {copied ? (
          <><Check size={15} /> ¡Enlace copiado!</>
        ) : (
          <><Copy size={15} /> Copiar enlace de invitación</>
        )}
      </button>

      <p className="mt-3 text-[10px] text-blue-400 text-center leading-tight">
        Cualquier persona con este enlace podrá unirse a{" "}
        <span className="font-semibold">{teamName}</span>.
      </p>
    </div>
  )
}
