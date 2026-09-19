"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Share2, Check } from "lucide-react"
import toast from "react-hot-toast"

export function LiveBackButton() {
  const router = useRouter()

  return (
    <button 
      onClick={() => router.back()} 
      className="text-[10px] md:text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 uppercase tracking-widest relative z-10 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      <span className="hidden md:inline">Volver</span>
    </button>
  )
}

export function ShareLiveButton() {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const liveUrl = typeof window !== 'undefined' ? `${window.location.origin}/live` : 'http://localhost:3000/live'
    const shareData = {
      title: "Sporting Saladar - Partidos en Directo",
      text: "Sigue los partidos en directo del Sporting Saladar ⚽🔥",
      url: liveUrl,
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(liveUrl)
        setCopied(true)
        toast.success("¡Enlace copiado al portapapeles!")
        setTimeout(() => setCopied(false), 2500)
      }
    } catch (err) {
      toast.error("No se pudo copiar el enlace")
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-xs font-bold rounded-xl transition-all shadow-xs relative z-10 active:scale-95"
      title="Compartir directo en redes sociales o WhatsApp"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">¡Copiado!</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Compartir</span>
        </>
      )}
    </button>
  )
}
