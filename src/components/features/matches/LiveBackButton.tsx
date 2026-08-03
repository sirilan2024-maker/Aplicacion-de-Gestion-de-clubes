"use client"

import { useRouter } from "next/navigation"

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
